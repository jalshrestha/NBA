#!/usr/bin/env node

// Set environment variables for testing
process.env.BRAVE_API_KEY = 'BSAyTukfqo0mOIwdedmu8Gz-twLO77-';
process.env.BRAVE_CLIENT_ID = 'nba-stats-tracker';

const BraveApiClient = require('./brave-api-client');

// Retry configuration
const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 2;

// Helper function for delayed retry
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to retry API calls with exponential backoff
async function retryApiCall(apiFunction, retries = MAX_RETRIES, delay = RETRY_DELAY) {
  try {
    return await apiFunction();
  } catch (error) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.log(`Rate limited. Retrying in ${delay}ms... (${retries} attempts left)`);
      await sleep(delay);
      return retryApiCall(apiFunction, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function runDemo() {
  console.log('Brave Search API Demo');
  console.log('=======================');
  
  try {
    const braveClient = new BraveApiClient();
    
    // 1. Test Web Search
    console.log('\n1. Testing Web Search');
    console.log('--------------------');
    try {
      const searchResults = await retryApiCall(() => braveClient.search('NBA basketball', 5));
      console.log(`✅ Web Search Success: ${searchResults.web.results.length} results found`);
      
      // Log first result title
      if (searchResults.web && searchResults.web.results && searchResults.web.results.length > 0) {
        console.log(`Top result: "${searchResults.web.results[0].title}"`);
      }
    } catch (error) {
      console.log(`❌ Web Search Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}, ${error.response.statusText}`);
      }
    }
    
    // 2. Test News Search
    console.log('\n2. Testing News Search');
    console.log('--------------------');
    try {
      const newsResults = await retryApiCall(() => braveClient.getNews('NBA playoffs', 3));
      
      // Check if news results exist
      if (newsResults && newsResults.news && newsResults.news.results) {
        console.log(`✅ News Search Success: ${newsResults.news.results.length} results found`);
        
        // Log first result title
        if (newsResults.news.results.length > 0) {
          console.log(`Top news: "${newsResults.news.results[0].title}"`);
        }
      } else {
        console.log('✅ News Search Success: 0 results found (empty or null response)');
      }
    } catch (error) {
      console.log(`❌ News Search Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}, ${error.response.statusText}`);
        
        // Special handling for rate limits
        if (error.response.status === 429) {
          console.log('Rate limit exceeded. Consider implementing a delay between requests or upgrading your API plan.');
        }
      }
    }
    
    // 3. Testing Image Search
    console.log('\n3. Testing Image Search');
    console.log('---------------------');
    try {
      const imageResults = await retryApiCall(() => braveClient.getImages('NBA logo', 3));
      
      // Check if image results exist
      if (imageResults && imageResults.images && imageResults.images.results) {
        console.log(`✅ Image Search Success: ${imageResults.images.results.length} results found`);
        
        // Log first result if available
        if (imageResults.images.results.length > 0) {
          console.log(`First image: "${imageResults.images.results[0].title || 'Untitled'}"`);
        }
      } else {
        console.log('✅ Image Search Success: 0 results found (empty or null response)');
      }
    } catch (error) {
      console.log(`❌ Image Search Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}, ${error.response.statusText}`);
        
        // Special handling for rate limits
        if (error.response.status === 429) {
          console.log('Rate limit exceeded. Consider implementing a delay between requests or upgrading your API plan.');
        }
      }
    }
    
    console.log('\nBrave Search API Demo Complete');
    console.log('=============================');
    
  } catch (error) {
    console.error('Error initializing Brave API client:', error.message);
  }
}

runDemo(); 