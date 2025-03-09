const axios = require('axios');

// API endpoints to test
const endpoints = [
  'http://localhost:5001/health',
  'http://localhost:5001/api/teams',
  'http://localhost:5001/api/standings'
];

async function testEndpoints() {
  console.log('Testing API connectivity...');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await axios.get(endpoint);
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
      
      // Log a sample of the data
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          console.log(`  Sample data: ${response.data.length} items`);
          if (response.data.length > 0) {
            console.log(`  First item: ${JSON.stringify(response.data[0]).substring(0, 100)}...`);
          }
        } else {
          console.log(`  Data: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
      }
      
    } catch (error) {
      console.error(`❌ ${endpoint} - Error: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}`);
        console.error(`  Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    console.log('---');
  }
}

testEndpoints().catch(console.error); 