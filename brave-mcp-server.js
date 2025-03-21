const BraveApiClient = require('./brave-api-client');

// Initialize the client
let braveClient;
try {
  braveClient = new BraveApiClient();
  // Log to stderr instead of stdout
  console.error('Brave Search API MCP Server initialized and ready!');
} catch (error) {
  console.error('Failed to initialize Brave API client:', error.message);
  process.exit(1);
}

// Define the MCP tools
const tools = [
  {
    name: 'brave_search',
    description: 'Search the web using Brave Search API',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The search query',
        required: true
      },
      {
        name: 'count',
        type: 'integer',
        description: 'Number of results to return (default: 10)',
        required: false
      }
    ],
    execute: async ({ query, count = 10 }) => {
      try {
        console.error(`Executing brave_search with query: ${query}, count: ${count}`);
        const results = await braveClient.search(query, count);
        return { results };
      } catch (error) {
        console.error('Search error:', error.message);
        return { error: error.message };
      }
    }
  },
  {
    name: 'brave_news',
    description: 'Search for news using Brave Search API',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The news search query',
        required: true
      },
      {
        name: 'count',
        type: 'integer',
        description: 'Number of results to return (default: 10)',
        required: false
      }
    ],
    execute: async ({ query, count = 10 }) => {
      try {
        console.error(`Executing brave_news with query: ${query}, count: ${count}`);
        const results = await braveClient.getNews(query, count);
        return { results };
      } catch (error) {
        console.error('News error:', error.message);
        return { error: error.message };
      }
    }
  },
  {
    name: 'brave_images',
    description: 'Search for images using Brave Search API',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'The image search query',
        required: true
      },
      {
        name: 'count',
        type: 'integer',
        description: 'Number of results to return (default: 10)',
        required: false
      }
    ],
    execute: async ({ query, count = 10 }) => {
      try {
        console.error(`Executing brave_images with query: ${query}, count: ${count}`);
        const results = await braveClient.getImages(query, count);
        return { results };
      } catch (error) {
        console.error('Images error:', error.message);
        return { error: error.message };
      }
    }
  }
];

// Process incoming MCP requests
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.error('Received message:', message.type);
    
    if (message.type === 'init') {
      // Return the available tools
      process.stdout.write(JSON.stringify({
        type: 'init_response',
        tools
      }) + '\n');
    } else if (message.type === 'execute') {
      // Handle tool execution
      const tool = tools.find(t => t.name === message.tool);
      
      if (!tool) {
        process.stdout.write(JSON.stringify({
          type: 'execute_response',
          id: message.id,
          error: `Tool ${message.tool} not found`
        }) + '\n');
        return;
      }
      
      try {
        const result = await tool.execute(message.parameters);
        process.stdout.write(JSON.stringify({
          type: 'execute_response',
          id: message.id,
          result
        }) + '\n');
      } catch (error) {
        console.error('Execution error:', error.message);
        process.stdout.write(JSON.stringify({
          type: 'execute_response',
          id: message.id,
          error: error.message
        }) + '\n');
      }
    }
  } catch (error) {
    console.error('Error processing message:', error.message);
  }
}); 