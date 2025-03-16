#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the current file's directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP server as a child process
const serverProcess = spawn('node', [path.join(__dirname, 'index.ts')], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Function to send a JSON-RPC request to the server
async function sendRequest(request) {
  return new Promise((resolve, reject) => {
    // Set up a one-time response handler
    const responseHandler = (data) => {
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (error) {
        reject(error);
      }
    };

    // Listen for the response
    serverProcess.stdout.once('data', responseHandler);

    // Send the request
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
  });
}

// Test functions
async function testInitialize() {
  console.log('Testing initialize...');
  const response = await sendRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      client: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });
  console.log('Initialize response:', JSON.stringify(response, null, 2));
  return response;
}

async function testListTools() {
  console.log('Testing tools/list...');
  const response = await sendRequest({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  });
  console.log('tools/list response:', JSON.stringify(response, null, 2));
  return response;
}

async function testAskTool() {
  console.log('Testing perplexity_ask tool...');
  const response = await sendRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'perplexity_ask',
      arguments: {
        question: 'What is the capital of the UK?',
        model: 'sonar'
      }
    }
  });
  console.log('perplexity_ask response:', JSON.stringify(response, null, 2));
  return response;
}

async function testSearchTool() {
  console.log('Testing perplexity_search tool...');
  const response = await sendRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'perplexity_search',
      arguments: {
        query: 'Latest UK political news',
        model: 'sonar'
      }
    }
  });
  console.log('perplexity_search response:', JSON.stringify(response, null, 2));
  return response;
}

// Run all tests
async function runTests() {
  try {
    await testInitialize();
    await testListTools();
    
    // Only run these tests if you have a valid API key configured
    if (process.env.PERPLEXITY_API_KEY) {
      await testAskTool();
      await testSearchTool();
    } else {
      console.log('Skipping API tests because PERPLEXITY_API_KEY is not set');
    }
    
    console.log('All tests completed');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    serverProcess.stdin.end();
    serverProcess.kill();
  }
}

// Run the tests
runTests();
