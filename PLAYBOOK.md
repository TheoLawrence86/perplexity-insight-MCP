# Perplexity Insight MCP Server Implementation Playbook

This playbook provides a step-by-step guide for implementing a Model Context Protocol (MCP) server that integrates with the Perplexity AI API. It serves as both documentation and a learning resource for creating custom MCP servers.

## Table of Contents

1. [Understanding MCP Architecture](#understanding-mcp-architecture)
2. [Analysing the Perplexity API](#analysing-the-perplexity-api)
3. [Setting Up the Project](#setting-up-the-project)
4. [Implementing Core Functionality](#implementing-core-functionality)
5. [Testing and Debugging](#testing-and-debugging)
6. [Deployment](#deployment)
7. [Integration with MCP Clients](#integration-with-mcp-clients)
8. [Integration with Windsurf](#integration-with-windsurf)
9. [Advanced Features](#advanced-features)

## Understanding MCP Architecture

### What is Model Context Protocol?

The Model Context Protocol (MCP) is an open standard that provides a unified way for AI applications to access external data and functionality. It follows a client-server architecture:

- **MCP Hosts/Clients**: Applications like Claude Desktop or IDEs that want to use AI capabilities
- **MCP Servers**: Service providers that expose specific functionality through the standardised protocol
- **Data Sources**: The underlying data or services that MCP servers can access

### Core Components of MCP

1. **Tools**: Functions that clients can discover and execute
2. **Resources**: Data accessible through URI-based patterns
3. **Prompts**: Templates for structuring AI interactions
4. **Capabilities**: Negotiable features between clients and servers

## Analysing the Perplexity API

### API Specifications

The Perplexity API provides access to powerful AI models for question answering and information retrieval:

- **Endpoint**: `https://api.perplexity.ai/chat/completions`
- **Authentication**: Bearer token authentication
- **Models**: Various models including "sonar-reasoning" (recommended), "sonar-pro", and "sonar-deep-research"
- **Rate Limits**: Varies by account tier

### Perplexity Models

The API supports several models, each with different capabilities:

- **sonar-reasoning**: Perplexity's reasoning-focused model, best for general questions and logical reasoning
- **sonar-pro**: Enhanced model with improved capabilities for professional use cases
- **sonar-deep-research**: Specialised for in-depth research and complex queries requiring detailed analysis

When implementing your MCP server, you should support all these models and allow users to specify which one to use for their queries.

### Request Structure

```json
{
  "model": "sonar-reasoning",
  "messages": [
    {
      "role": "system",
      "content": "System instructions here"
    },
    {
      "role": "user",
      "content": "User query here"
    }
  ],
  "max_tokens": 1000
}
```

### Response Structure

```json
{
  "id": "response-id",
  "model": "sonar-reasoning",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Response content here"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 456,
    "total_tokens": 579
  },
  "citations": [
    "https://source1.com",
    "https://source2.com"
  ]
}
```

## Setting Up the Project

### Project Structure

```
perplexity-insight/
├── .env.example       # Environment variables template
├── .gitignore         # Git ignore file
├── Dockerfile         # Container definition
├── PLAYBOOK.md        # This document
├── README.md          # Project overview
├── USAGE.md           # Usage instructions
├── index.ts           # Main implementation
├── package.json       # Dependencies and scripts
├── test.ts            # API test script
└── tsconfig.json      # TypeScript configuration
```

### Dependencies

Key dependencies include:
- `@modelcontextprotocol/sdk`: The MCP SDK (version 0.4.0 or later)
- `dotenv`: Environment variable management
- TypeScript and related development tools

## Implementing Core Functionality

### Step 1: Define Tool Interfaces

Define the tools your MCP server will expose:

```typescript
const PERPLEXITY_ASK_TOOL: Tool = {
  name: "perplexity_ask",
  description: "Send a direct question to Perplexity AI...",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to ask Perplexity AI"
      },
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
    required: ["question"],
  },
};
```

### Step 2: Create API Integration Functions

Implement functions to communicate with the Perplexity API:

```typescript
async function askPerplexity(
  question: string, 
  model: string = "sonar-reasoning", 
  system_prompt: string = "You are a helpful assistant. Ensure all of your outputs are in UK English only.",
  max_tokens: number = 1000
) {
  // Rate limiting check
  checkRateLimit();
  
  // Create payload and fetch from API
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
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
    },
    body: JSON.stringify(payload)
  });
  
  // Process response
  const data = await response.json();
  
  // Return properly formatted MCP response
  return {
    content: [
      {
        type: "text",
        text: data.choices[0].message.content
      }
    ],
    isError: false
  };
}
```

### Step 3: Set Up Request Handlers

```typescript
// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [PERPLEXITY_ASK_TOOL, PERPLEXITY_SEARCH_TOOL],
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "perplexity_ask": {
      // Validate arguments and call the API function
      return await askPerplexity(
        args.question, 
        args.model || "sonar-reasoning", 
        args.system_prompt || "You are a helpful assistant. Ensure all of your outputs are in UK English only.", 
        args.max_tokens || 1000
      );
    }
    case "perplexity_search": {
      // Handle search queries
      return await searchPerplexity(
        args.query, 
        args.model || "sonar-reasoning", 
        args.system_prompt || "You are a helpful assistant. Ensure all of your outputs are in UK English only.", 
        args.max_tokens || 1000
      );
    }
    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});
```

### Step 4: Error Handling

Proper error handling is crucial for MCP servers:

```typescript
try {
  // API call or other operation
} catch (error) {
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
```

### Step 5: Start the Server

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Testing and Debugging

### Testing API Connectivity

Create a separate test script (`test.ts`) to verify API connectivity independently:

```typescript
async function testPerplexityApi() {
  // Test API calls directly
}
```

### Testing Different Models

It's essential to test each model to ensure they work correctly:

```typescript
async function testModels() {
  console.log("Testing sonar-reasoning model...");
  const reasoningResponse = await askPerplexity("What is quantum computing?", "sonar-reasoning");
  console.log(reasoningResponse);
  
  console.log("Testing sonar-pro model...");
  const proResponse = await askPerplexity("What is quantum computing?", "sonar-pro");
  console.log(proResponse);
  
  console.log("Testing sonar-deep-research model...");
  const deepResearchResponse = await askPerplexity("Explain the implications of quantum computing on cryptography", "sonar-deep-research");
  console.log(deepResearchResponse);
}
```

### Debugging MCP Integration

Common issues to check:

1. **Response Format**: Ensure responses follow the MCP specification
2. **Error Handling**: Properly catch and format errors
3. **Capability Negotiation**: Verify server capabilities match client expectations
4. **Rate Limiting**: Implement proper rate limiting to avoid API restrictions

## Integration with Windsurf

### Configuration

In Windsurf's `mcp_config.json`:

```json
{
  "perplexity-ask": {
    "command": "node",
    "args": ["/path/to/perplexity-insight/index.js"],
    "cwd": "/path/to/perplexity-insight",
    "env": {
      "PERPLEXITY_API_KEY": "your_api_key_here"
    }
  }
}
```

### Testing in Windsurf

1. Start Windsurf with the MCP server enabled
2. Use the AI Assistant to ask questions
3. Test different models with queries like:
   - "Ask Perplexity using sonar-reasoning: What is the capital of France?"
   - "Ask Perplexity using sonar-pro: Explain quantum entanglement"
   - "Ask Perplexity using sonar-deep-research: Analyse the long-term implications of climate change on global agriculture"
4. Check the MCP server logs for any errors
5. Verify the response appears correctly in Windsurf

## Advanced Features

### Rate Limiting

Implement rate limiting to respect API constraints:

```typescript
function checkRateLimit() {
  // Logic to track and limit API calls
}
```

### Response Formatting

Ensure responses follow the MCP specification:

```typescript
return {
  content: [
    {
      type: "text",
      text: responseText
    }
  ],
  isError: false
};
```

### Error Handling

Properly format error responses:

```typescript
return {
  content: [
    {
      type: "text",
      text: `Error: ${errorMessage}`
    }
  ],
  isError: true
};
```

### Model Selection Logic

Implement logic to help users select the most appropriate model for their query:

```typescript
function suggestModel(query: string): string {
  // Check if query is research-heavy
  if (query.includes("research") || 
      query.includes("analyse") || 
      query.includes("analyze") ||
      query.includes("comprehensive") ||
      query.includes("detailed")) {
    return "sonar-deep-research";
  }
  
  // Check if query is professional or complex
  if (query.includes("professional") || 
      query.includes("business") || 
      query.includes("enterprise") ||
      query.includes("technical")) {
    return "sonar-pro";
  }
  
  // Default to sonar-reasoning for general questions
  return "sonar-reasoning";
}
```

## Changing Models

### Understanding Model Differences

Each model has its strengths and weaknesses. Understanding these differences is crucial for selecting the right model for your queries.

- **sonar-reasoning**: Best for general questions and logical reasoning tasks
- **sonar-pro**: Enhanced capabilities for professional and technical use cases
- **sonar-deep-research**: Specialised for in-depth research and complex analytical questions

### Specifying Models in Queries

When using the Perplexity AI tool, you can specify the model to use by including the model name in your query:

- "Ask Perplexity using sonar-reasoning: What is the capital of France?"
- "Ask Perplexity using sonar-pro: Explain the implications of quantum computing for cybersecurity"
- "Ask Perplexity using sonar-deep-research: Provide a comprehensive analysis of climate change impacts on biodiversity"

### Model Selection in the MCP Server

The MCP server can automatically suggest a model based on the query. This is implemented using the `suggestModel` function:

```typescript
function suggestModel(query: string): string {
  // Logic to suggest a model based on the query
}
```

## Conclusion

This playbook provides a comprehensive guide to implementing an MCP server for the Perplexity AI API. By following these steps, you can create a robust integration that works seamlessly with Windsurf and other MCP clients.
