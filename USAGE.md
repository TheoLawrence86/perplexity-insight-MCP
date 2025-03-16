# Perplexity Insight MCP Server Usage Guide

This document provides detailed information on integrating and using the Perplexity Insight MCP server with compatible clients.

## Setup and Configuration

### Prerequisites

- Node.js 18 or higher
- A valid Perplexity API key
- An MCP-compatible client (Claude Desktop, Windsurf, etc.)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd perplexity-insight
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Add your Perplexity API key to the `.env` file:
   ```
   PERPLEXITY_API_KEY=your_actual_api_key_here
   ```

5. Build the TypeScript code:
   ```bash
   npm run build
   ```

## Testing Your Installation

Before connecting to an MCP client, verify your Perplexity API connection:

```bash
npx ts-node-esm test.ts
```

This runs a simple test that ensures your API key works correctly with the Perplexity API.

## Running the Server

Start the MCP server:

```bash
npm start
```

The server runs in stdio mode, which means it's designed to be launched by an MCP client rather than used directly from the terminal.

## Connecting with MCP Clients

### Claude Desktop App

1. Download and install the [Claude Desktop App](https://claude.ai/download)
2. In Claude Desktop:
   - Go to Settings > MCP Servers
   - Click "Add MCP Server"
   - Select "Custom" and provide the path to your perplexity-insight directory
   - Click "Add Server"

### Windsurf Editor

1. Open Windsurf Editor
2. Navigate to MCP settings
3. Add a new custom MCP server pointing to your perplexity-insight directory

## Using the MCP Tools

The server provides two primary tools:

### 1. perplexity_ask

This tool sends direct questions to Perplexity AI.

**Parameters:**
- `question` (required): The question to ask Perplexity AI
- `model` (optional): Perplexity model to use (default: "sonar")
- `system_prompt` (optional): Custom system prompt
- `max_tokens` (optional): Maximum response tokens (default: 1000)

**Example:**
```json
{
  "question": "What are the most significant developments in quantum computing in the past year?",
  "model": "sonar"
}
```

### 2. perplexity_search

This tool performs web search queries with Perplexity AI.

**Parameters:**
- `query` (required): Search query to find information online
- `model` (optional): Perplexity model to use (default: "sonar")
- `system_prompt` (optional): Custom system prompt
- `max_tokens` (optional): Maximum response tokens (default: 1000)

**Example:**
```json
{
  "query": "Latest research on climate adaptation strategies",
  "model": "sonar"
}
```

## Response Format

Both tools return responses in the following format:

```json
{
  "model": "sonar",
  "content": "The detailed response from Perplexity...",
  "tokens_used": 450,
  "citations": [
    "https://example.com/source1",
    "https://example.com/source2"
  ]
}
```

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Ensure your API key is correctly set in the `.env` file
   - Verify the API key is valid by running the test script

2. **Connection Issues**
   - Check that the Perplexity API is operational
   - Ensure your internet connection is stable

3. **MCP Client Integration**
   - Make sure your MCP client is compatible with the current MCP protocol version
   - Check that the path to the server is correctly configured in your client

For additional help, refer to the [MCP documentation](https://modelcontextprotocol.io/) or create an issue in the repository.
