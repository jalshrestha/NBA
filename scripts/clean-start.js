/**
 * Script to completely clean up the project and start fresh
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting complete cleanup and fresh start...');

// Kill any running Next.js processes
console.log('Killing any running Next.js processes...');
try {
  execSync('pkill -f next || true');
} catch (error) {
  // Ignore errors
}

// Clean up the .next directory
console.log('Cleaning up the .next directory...');
try {
  execSync('rm -rf .next');
} catch (error) {
  console.error(`Error cleaning up .next directory: ${error.message}`);
}

// Create symlinks if they don't exist
const createSymlink = (source, target) => {
  const sourcePath = path.join(process.cwd(), source);
  const targetPath = path.join(process.cwd(), target);
  
  // Remove existing symlink or directory if it exists
  if (fs.existsSync(targetPath)) {
    try {
      const stats = fs.lstatSync(targetPath);
      if (stats.isSymbolicLink()) {
        fs.unlinkSync(targetPath);
        console.log(`Removed existing symlink: ${targetPath}`);
      } else if (stats.isDirectory()) {
        // Only remove if it's empty
        const files = fs.readdirSync(targetPath);
        if (files.length === 0) {
          fs.rmdirSync(targetPath);
          console.log(`Removed empty directory: ${targetPath}`);
        } else {
          console.log(`Directory not empty, keeping: ${targetPath}`);
          return;
        }
      }
    } catch (error) {
      console.error(`Error removing existing path ${targetPath}: ${error.message}`);
      return;
    }
  }
  
  // Create the source directory if it doesn't exist
  if (!fs.existsSync(sourcePath)) {
    try {
      fs.mkdirSync(sourcePath, { recursive: true });
      console.log(`Created source directory: ${sourcePath}`);
    } catch (error) {
      console.error(`Error creating source directory ${sourcePath}: ${error.message}`);
      return;
    }
  }
  
  // Create the symlink
  try {
    fs.symlinkSync(sourcePath, targetPath, 'dir');
    console.log(`Created symlink: ${targetPath} -> ${sourcePath}`);
  } catch (error) {
    console.error(`Error creating symlink ${targetPath}: ${error.message}`);
  }
};

// Create necessary symlinks
console.log('Creating necessary symlinks...');
createSymlink('src/pages', 'pages');
createSymlink('src/api', 'api');
createSymlink('src/styles', 'styles');
createSymlink('src/components', 'components');

// Copy globals.css to src/pages directory
console.log('Copying globals.css to src/pages directory...');
try {
  const srcStylesDir = path.join(process.cwd(), 'src', 'styles');
  const srcPagesDir = path.join(process.cwd(), 'src', 'pages');
  const globalsCssPath = path.join(srcStylesDir, 'globals.css');
  const pagesCssPath = path.join(srcPagesDir, 'globals.css');

  if (fs.existsSync(globalsCssPath)) {
    fs.copyFileSync(globalsCssPath, pagesCssPath);
    console.log(`Copied globals.css to ${pagesCssPath}`);
  } else {
    console.error(`Error: ${globalsCssPath} does not exist`);
  }
} catch (error) {
  console.error(`Error copying globals.css: ${error.message}`);
}

// Fix CSS imports using the dedicated script
console.log('Fixing CSS imports...');
try {
  execSync('node scripts/fix-css-imports.js', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error fixing CSS imports: ${error.message}`);
}

// Fix next.config.js
console.log('Fixing next.config.js...');
try {
  const configPath = path.join(process.cwd(), 'next.config.js');
  
  if (fs.existsSync(configPath)) {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Remove experimental appDir option
    configContent = configContent.replace(/experimental:\s*{\s*appDir:\s*(true|false)\s*,?\s*}/g, '');
    
    // Make sure we have the webpack config with styles alias
    if (!configContent.includes("'styles':")) {
      configContent = configContent.replace(/config\.resolve\.alias\s*=\s*{([^}]*)}/g, 
        `config.resolve.alias = {$1,
      'styles': path.resolve(__dirname, 'styles'),
    }`);
    }
    
    // Make sure we have the path import
    if (!configContent.includes("const path = require('path')")) {
      configContent = configContent.replace(/\/\*\*.*?\*\/\s*/, `/** @type {import('next').NextConfig} */
const path = require('path');

`);
    }
    
    fs.writeFileSync(configPath, configContent);
    console.log('next.config.js fixed');
  } else {
    console.error('Error: next.config.js does not exist');
  }
} catch (error) {
  console.error(`Error fixing next.config.js: ${error.message}`);
}

// Fix tailwind.config.js
console.log('Fixing tailwind.config.js...');
try {
  const tailwindPath = path.join(process.cwd(), 'tailwind.config.js');
  
  if (fs.existsSync(tailwindPath)) {
    let tailwindContent = fs.readFileSync(tailwindPath, 'utf8');
    
    // Make sure we have the src directory in the content array
    if (!tailwindContent.includes('./src/')) {
      tailwindContent = tailwindContent.replace(/content:\s*\[(.*?)\]/s, (match, p1) => {
        return `content: [${p1},
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ]`;
      });
    }
    
    fs.writeFileSync(tailwindPath, tailwindContent);
    console.log('tailwind.config.js fixed');
  } else {
    console.error('Error: tailwind.config.js does not exist');
  }
} catch (error) {
  console.error(`Error fixing tailwind.config.js: ${error.message}`);
}

console.log('All fixes applied successfully!');
console.log('Starting the development server...');

// Start the development server
try {
  execSync('next dev', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error starting development server: ${error.message}`);
} 