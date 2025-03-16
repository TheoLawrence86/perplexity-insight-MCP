#!/usr/bin/env node

/**
 * Test script for Perplexity Insight MCP server
 * 
 * This script tests the Perplexity API connection without the MCP framework
 * to help diagnose connection issues independently.
 */

import dotenv from "dotenv";
import { exit } from "process";

// Load environment variables
dotenv.config();

// ANSI colour codes for terminal output
const colours = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

// Print coloured text to the console
function printColoured(text: string, colour: string, style: string = colours.reset): void {
  console.log(`${style}${colour}${text}${colours.reset}`);
}

// Validate API key
function validateApiKey(apiKey: string | undefined): boolean {
  if (!apiKey || apiKey === "your_api_key_here") {
    printColoured("Error: Perplexity API key not provided.", colours.red, colours.bright);
    printColoured("Please set your PERPLEXITY_API_KEY in the .env file.", colours.yellow);
    return false;
  }
  return true;
}

// Main test function
async function testPerplexityApi(): Promise<void> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  
  if (!validateApiKey(apiKey)) {
    exit(1);
  }
  
  printColoured("Testing Perplexity API connection...", colours.cyan);
  
  const apiEndpoint = "https://api.perplexity.ai/chat/completions";
  
  const payload = {
    model: "sonar",
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Ensure all of your outputs are in UK English only."
      },
      {
        role: "user",
        content: "What's the current status of AI language models? Keep it brief."
      }
    ],
    max_tokens: 300
  };
  
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      printColoured(`API Error: ${response.status} ${response.statusText}`, colours.red, colours.bright);
      printColoured(await response.text(), colours.red);
      exit(1);
    }
    
    const result = await response.json();
    
    printColoured("\n✅ API Connection Successful!", colours.green, colours.bright);
    printColoured(`Model: ${result.model}`, colours.cyan);
    printColoured(`Tokens Used: ${result.usage?.total_tokens || 'Unknown'}`, colours.cyan);
    
    if (result.choices && result.choices.length > 0) {
      const content = result.choices[0]?.message?.content || 'No content';
      printColoured("\nResponse Content:", colours.green, colours.bright);
      printColoured(content, colours.white);
    }
    
    printColoured("\nYour Perplexity API connection is working correctly.", colours.green);
    printColoured("You can now run the MCP server with 'npm start'.", colours.cyan);
    
  } catch (error) {
    printColoured(`\n❌ An error occurred: ${error}`, colours.red, colours.bright);
    exit(1);
  }
}

// Run the test
testPerplexityApi();
