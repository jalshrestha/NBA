/**
 * Script to fix the CSS import issue
 */

const fs = require('fs');
const path = require('path');

// Path to the _app.js file
const appFilePath = path.join(process.cwd(), 'pages', '_app.js');

// Check if the file exists
if (!fs.existsSync(appFilePath)) {
  console.error('Error: pages/_app.js does not exist');
  process.exit(1);
}

// Read the file
const appFileContent = fs.readFileSync(appFilePath, 'utf8');

// Replace the import statement
const updatedContent = appFileContent.replace(
  "import '../styles/globals.css';",
  "import 'styles/globals.css';"
);

// Write the updated content back to the file
fs.writeFileSync(appFilePath, updatedContent);

console.log('CSS import fixed in pages/_app.js');

// Now let's make sure the globals.css file exists in the styles directory
const cssFilePath = path.join(process.cwd(), 'styles', 'globals.css');
const srcCssFilePath = path.join(process.cwd(), 'src', 'styles', 'globals.css');

if (!fs.existsSync(cssFilePath) && fs.existsSync(srcCssFilePath)) {
  // Copy the file
  fs.copyFileSync(srcCssFilePath, cssFilePath);
  console.log('Copied globals.css from src/styles to styles');
}

console.log('CSS fix completed!'); 