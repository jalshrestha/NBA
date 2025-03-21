/**
 * Script to fix CSS imports in both pages/_app.js and src/pages/_app.js
 */

const fs = require('fs');
const path = require('path');

// Function to fix CSS import in a file
function fixCssImport(filePath, correctImport) {
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${filePath}`);
    return false;
  }

  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Replace any CSS import with the correct one
    const updatedContent = content.replace(
      /import ['"].*styles\/globals\.css['"];/,
      correctImport
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent);
    console.log(`CSS import fixed in ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
    return false;
  }
}

// Copy globals.css to src/pages directory
const srcStylesDir = path.join(process.cwd(), 'src', 'styles');
const srcPagesDir = path.join(process.cwd(), 'src', 'pages');
const globalsCssPath = path.join(srcStylesDir, 'globals.css');
const pagesCssPath = path.join(srcPagesDir, 'globals.css');

if (fs.existsSync(globalsCssPath)) {
  try {
    fs.copyFileSync(globalsCssPath, pagesCssPath);
    console.log(`Copied globals.css to ${pagesCssPath}`);
  } catch (error) {
    console.error(`Error copying globals.css: ${error.message}`);
  }
}

// Fix pages/_app.js
const pagesAppPath = path.join(process.cwd(), 'pages', '_app.js');
fixCssImport(pagesAppPath, "import './globals.css';");

// Fix src/pages/_app.js
const srcPagesAppPath = path.join(process.cwd(), 'src', 'pages', '_app.js');
fixCssImport(srcPagesAppPath, "import './globals.css';");

// Ensure styles directory exists in both locations
const stylesDir = path.join(process.cwd(), 'styles');

// Ensure globals.css exists in both locations
const rootGlobalsCssPath = path.join(stylesDir, 'globals.css');
const srcGlobalsCssPath = path.join(srcStylesDir, 'globals.css');

// If src/styles/globals.css exists but styles/globals.css doesn't, copy it
if (fs.existsSync(srcGlobalsCssPath) && !fs.existsSync(rootGlobalsCssPath)) {
  fs.copyFileSync(srcGlobalsCssPath, rootGlobalsCssPath);
  console.log('Copied globals.css from src/styles to styles');
}

// If styles/globals.css exists but src/styles/globals.css doesn't, copy it
if (fs.existsSync(rootGlobalsCssPath) && !fs.existsSync(srcGlobalsCssPath)) {
  // Ensure src/styles directory exists
  if (!fs.existsSync(srcStylesDir)) {
    fs.mkdirSync(srcStylesDir, { recursive: true });
  }
  fs.copyFileSync(rootGlobalsCssPath, srcGlobalsCssPath);
  console.log('Copied globals.css from styles to src/styles');
}

console.log('CSS fix completed!'); 