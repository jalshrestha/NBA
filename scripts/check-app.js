/**
 * Script to check if our application is running correctly
 */

const http = require('http');

// Function to make an HTTP request to check if the application is running
const checkApp = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`Status code: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.end();
  });
};

// Check if the application is running
console.log('Checking if the application is running...');
checkApp()
  .then(() => {
    console.log('Application is running correctly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Error checking application: ${error.message}`);
    console.log('The application may not be running correctly.');
    console.log('Try running "npm run start-app" to start the application.');
    process.exit(1);
  }); 