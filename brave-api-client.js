const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Load MCP configuration
const mcpConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'mcp.json'), 'utf8'));

class BraveApiClient {
  constructor() {
    this.config = mcpConfig;
    this.baseUrl = this.config.api.baseUrl;
    this.apiKey = process.env.BRAVE_API_KEY || '';
    this.clientId = process.env.BRAVE_CLIENT_ID || '';
    
    if (!this.apiKey) {
      console.error('BRAVE_API_KEY environment variable is required');
      process.exit(1);
    }
    
    // Dynamic headers based on MCP config
    const headers = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip'
    };
    
    // Use the header name specified in the MCP config
    if (this.config.api.authentication.type === 'header') {
      headers[this.config.api.authentication.headerName] = this.apiKey;
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.config.config.timeout,
      headers: headers
    });
    
    console.log(`Brave API client initialized with base URL: ${this.baseUrl}`);
    
    // Enable caching if specified in features
    if (this.config.features?.caching?.enabled) {
      console.log(`Caching enabled with TTL: ${this.config.features.caching.ttl} seconds`);
      this.cache = new Map();
    }
  }
  
  // Helper method for caching
  getCacheKey(method, endpoint, params) {
    return `${method}:${endpoint}:${JSON.stringify(params)}`;
  }
  
  // Helper method to check cache
  getFromCache(cacheKey) {
    if (!this.config.features?.caching?.enabled) return null;
    
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      if (this.config.features?.analytics?.trackQueries) {
        console.log(`Cache hit: ${cacheKey}`);
      }
      return cached.data;
    }
    
    return null;
  }
  
  // Helper method to store in cache
  storeInCache(cacheKey, data) {
    if (!this.config.features?.caching?.enabled) return;
    
    const ttl = this.config.features.caching.ttl || 300; // Default 5 minutes
    this.cache.set(cacheKey, {
      data,
      expiry: Date.now() + (ttl * 1000)
    });
    
    if (this.config.features?.analytics?.trackQueries) {
      console.log(`Cached: ${cacheKey}`);
    }
  }
  
  async search(query, count = 10) {
    try {
      const endpoint = this.config.api.endpoints.search;
      const params = { q: query, count };
      const cacheKey = this.getCacheKey('GET', endpoint, params);
      
      // Check cache first if enabled
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) return cachedResult;
      
      const response = await this.client.get(endpoint, { params });
      
      // Store in cache if enabled
      this.storeInCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error performing search:', error.message);
      throw error;
    }
  }
  
  async getLocalInfo(poiIds) {
    try {
      const endpoint = this.config.api.endpoints.local;
      const payload = { pois: poiIds };
      const cacheKey = this.getCacheKey('POST', endpoint, payload);
      
      // Check cache first if enabled
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) return cachedResult;
      
      const response = await this.client.post(endpoint, payload);
      
      // Store in cache if enabled
      this.storeInCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching local info:', error.message);
      throw error;
    }
  }
  
  async getNews(query, count = 10) {
    try {
      const endpoint = this.config.api.endpoints.news;
      const params = { q: query, count };
      const cacheKey = this.getCacheKey('GET', endpoint, params);
      
      // Check cache first if enabled
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) return cachedResult;
      
      const response = await this.client.get(endpoint, { params });
      
      // Store in cache if enabled
      this.storeInCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching news:', error.message);
      throw error;
    }
  }
  
  async getImages(query, count = 10) {
    try {
      const endpoint = this.config.api.endpoints.images;
      const params = { q: query, count };
      const cacheKey = this.getCacheKey('GET', endpoint, params);
      
      // Check cache first if enabled
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) return cachedResult;
      
      const response = await this.client.get(endpoint, { params });
      
      // Store in cache if enabled
      this.storeInCache(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error fetching images:', error.message);
      throw error;
    }
  }
}

// Example usage
async function main() {
  try {
    const braveClient = new BraveApiClient();
    
    console.log('Performing search...');
    const searchResults = await braveClient.search('brave browser');
    console.log('Search Results:', JSON.stringify(searchResults, null, 2));
    
    console.log('Fetching news...');
    const newsResults = await braveClient.getNews('nba');
    console.log('News Results:', JSON.stringify(newsResults, null, 2));
  } catch (error) {
    console.error('Error in main:', error.message);
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = BraveApiClient; 