/**
 * Comprehensive fix script for the NBA Stats Tracker application
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  
  if (!fs.existsSync(targetPath)) {
    try {
      fs.symlinkSync(sourcePath, targetPath, 'dir');
      console.log(`Created symlink: ${targetPath} -> ${sourcePath}`);
    } catch (error) {
      console.error(`Error creating symlink ${targetPath}: ${error.message}`);
    }
  } else {
    console.log(`Symlink ${targetPath} already exists`);
  }
};

// Create necessary symlinks
console.log('Creating necessary symlinks...');
createSymlink('src/pages', 'pages');
createSymlink('src/api', 'api');
createSymlink('src/styles', 'styles');
createSymlink('src/components', 'components');

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
    
    // Make sure we have the webpack config
    if (!configContent.includes('webpack:')) {
      // Add webpack config before the closing brace
      configContent = configContent.replace(/}(\s*module\.exports\s*=\s*nextConfig)/g, `  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
}$1`);
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
console.log('Run "npm run dev" to start the development server.'); 