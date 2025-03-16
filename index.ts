#!/usr/bin/env node

// Import only the required modules and avoid direct SDK class usage
// since we're implementing the JSON-RPC protocol directly
import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Define schemas for tool parameters
const askSchema = {
  question: z.string().describe("The question to ask Perplexity AI"),
  model: z.enum(["sonar-reasoning", "sonar-pro", "sonar-deep-research"]).default("sonar-reasoning").describe("Perplexity model to use"),
  system_prompt: z.string().default("You are a helpful assistant. Ensure all of your outputs are in UK English only.").describe("Optional system prompt to guide the model's behaviour"),
  max_tokens: z.number().default(1000).describe("Maximum number of tokens in the response")
};

const searchSchema = {
  query: z.string().describe("Search query to find information online"),
  model: z.enum(["sonar-reasoning", "sonar-pro", "sonar-deep-research"]).default("sonar-reasoning").describe("Perplexity model to use"),
  system_prompt: z.string().default("You are a helpful assistant. Ensure all of your outputs are in UK English only.").describe("Optional system prompt to guide the model's behaviour"),
  max_tokens: z.number().default(1000).describe("Maximum number of tokens in the response")
};

// Check for API key
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
if (!PERPLEXITY_API_KEY) {
  console.error("Error: PERPLEXITY_API_KEY environment variable is required");
  process.exit(1);
}

// API endpoint
const API_ENDPOINT = "https://api.perplexity.ai/chat/completions";

// Rate limiting configuration
const RATE_LIMIT = {
  perMinute: 60,
  perDay: 10000
};

let requestCount = {
  minute: 0,
  day: 0,
  lastMinuteReset: Date.now()
};

// Check rate limits before making API calls
function checkRateLimit() {
  const now = Date.now();
  if (now - requestCount.lastMinuteReset > 60000) {
    requestCount.minute = 0;
    requestCount.lastMinuteReset = now;
  }
  
  if (requestCount.minute >= RATE_LIMIT.perMinute ||
      requestCount.day >= RATE_LIMIT.perDay) {
    throw new Error('Rate limit exceeded');
  }
  
  requestCount.minute++;
  requestCount.day++;
}

// Types for Perplexity API responses
interface PerplexityResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: Array<string>;
}

// Function to ask Perplexity AI a question
async function askPerplexity(
  question: string, 
  model: string = "sonar-reasoning", 
  system_prompt: string = "You are a helpful assistant. Ensure all of your outputs are in UK English only.",
  max_tokens: number = 1000
) {
  checkRateLimit();
  
  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content: system_prompt
      },
      {
        role: "user",
        content: question
      }
    ],
    max_tokens: max_tokens
  };
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json() as PerplexityResponse;
    
    // Format the response with proper content structure
    return {
      content: [
        {
          type: "text",
          text: data.choices[0].message.content
        }
      ],
      isError: false
    };
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

// Function to search with Perplexity AI
async function searchPerplexity(
  query: string, 
  model: string = "sonar-reasoning", 
  system_prompt: string = "You are a helpful assistant. Ensure all of your outputs are in UK English only.",
  max_tokens: number = 1000
) {
  checkRateLimit();
  
  const payload = {
    model: model,
    messages: [
      {
        role: "system",
        content: system_prompt + " When responding to search queries, please include sources and citations."
      },
      {
        role: "user",
        content: `Search for information about: ${query}`
      }
    ],
    max_tokens: max_tokens
  };
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json() as PerplexityResponse;
    
    // Format the response with proper content structure
    return {
      content: [
        {
          type: "text",
          text: data.choices[0].message.content
        }
      ],
      isError: false
    };
  } catch (error) {
    console.error("Error calling Perplexity API:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
}

// Define tool interfaces
interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, any>;
  handler: (args: any) => Promise<any>;
}

// Create tool definitions
const perplexityAskTool: ToolDefinition = {
  name: "perplexity_ask",
  description: "Send a direct question to Perplexity AI and receive a comprehensive answer. " +
               "This tool leverages powerful AI models to analyse and respond to complex questions " +
               "with detailed, factual answers. Citations for sources are included when available. " +
               "Best for direct questions requiring factual or analytical responses.",
  schema: askSchema,
  handler: async (args: { 
    question: string; 
    model?: string; 
    system_prompt?: string; 
    max_tokens?: number 
  }) => {
    const { question, model, system_prompt, max_tokens } = args;
    return await askPerplexity(
      question, 
      model, 
      system_prompt, 
      max_tokens
    );
  }
};

const perplexitySearchTool: ToolDefinition = {
  name: "perplexity_search",
  description: "Perform a web search query with Perplexity AI to find relevant information online. " +
               "This tool combines web search capabilities with AI-powered analysis to deliver " +
               "comprehensive search results with source citations. " +
               "Best for research questions, current events queries, or when you need information " +
               "from multiple online sources.",
  schema: searchSchema,
  handler: async (args: { 
    query: string; 
    model?: string; 
    system_prompt?: string; 
    max_tokens?: number 
  }) => {
    const { query, model, system_prompt, max_tokens } = args;
    return await searchPerplexity(
      query, 
      model, 
      system_prompt, 
      max_tokens
    );
  }
};

// Create a basic JSON-RPC message handler to handle MCP requests
const handleMessage = async (message: any) => {
  try {
    // Basic validation
    if (!message.id || !message.method) {
      throw new Error("Invalid message format");
    }

    console.error(`Received method: ${message.method}`);

    // Handle tools/list
    if (message.method === "tools/list") {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: perplexityAskTool.name,
              description: perplexityAskTool.description,
              inputSchema: {
                type: "object",
                properties: {
                  question: { type: "string", description: "The question to ask Perplexity AI" },
                  model: { 
                    type: "string", 
                    description: "Perplexity model to use", 
                    enum: ["sonar-reasoning", "sonar-pro", "sonar-deep-research"],
                    default: "sonar-reasoning"
                  },
                  system_prompt: {
                    type: "string",
                    description: "Optional system prompt to guide the model's behaviour",
                    default: "You are a helpful assistant. Ensure all of your outputs are in UK English only."
                  },
                  max_tokens: {
                    type: "number",
                    description: "Maximum number of tokens in the response",
                    default: 1000
                  }
                },
                required: ["question"]
              }
            },
            {
              name: perplexitySearchTool.name,
              description: perplexitySearchTool.description,
              inputSchema: {
                type: "object",
                properties: {
                  query: { type: "string", description: "Search query to find information online" },
                  model: { 
                    type: "string", 
                    description: "Perplexity model to use", 
                    enum: ["sonar-reasoning", "sonar-pro", "sonar-deep-research"],
                    default: "sonar-reasoning"
                  },
                  system_prompt: {
                    type: "string",
                    description: "Optional system prompt to guide the model's behaviour",
                    default: "You are a helpful assistant. Ensure all of your outputs are in UK English only."
                  },
                  max_tokens: {
                    type: "number",
                    description: "Maximum number of tokens in the response",
                    default: 1000
                  }
                },
                required: ["query"]
              }
            }
          ]
        }
      };
    }

    // Handle tools/call
    if (message.method === "tools/call") {
      if (!message.params || !message.params.name || !message.params.arguments) {
        throw new Error("Invalid tool call parameters");
      }

      const { name, arguments: args } = message.params;

      if (name === perplexityAskTool.name) {
        const result = await perplexityAskTool.handler(args);
        return {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      }

      if (name === perplexitySearchTool.name) {
        const result = await perplexitySearchTool.handler(args);
        return {
          jsonrpc: "2.0",
          id: message.id,
          result
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    }

    // Handle initialization requests
    if (message.method === "initialize") {
      return {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          server: {
            name: "perplexity-insight",
            version: "0.1.0"
          },
          capabilities: {
            tools: {
              listChanged: true
            }
          }
        }
      };
    }

    // Return error for unknown methods
    throw new Error(`Unknown method: ${message.method}`);
  } catch (error: any) {
    console.error(`Error handling message:`, error);
    return {
      jsonrpc: "2.0",
      id: message.id || null,
      error: {
        code: -32603,
        message: error.message || "Internal error"
      }
    };
  }
};

// Set up the transport
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  
  try {
    // Process complete lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last partial line in the buffer
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      try {
        const message = JSON.parse(line);
        handleMessage(message).then(response => {
          if (response) {
            const responseStr = JSON.stringify(response) + '\n';
            process.stdout.write(responseStr);
          }
        }).catch(err => {
          console.error('Error processing message:', err);
          const errorResponse = {
            jsonrpc: "2.0",
            id: message.id || null,
            error: {
              code: -32603,
              message: err.message || "Unknown error"
            }
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
        });
      } catch (parseError) {
        console.error('Error parsing JSON message:', parseError);
      }
    }
  } catch (error) {
    console.error('Error processing input:', error);
  }
});

console.error("Perplexity MCP Server running on stdio");
