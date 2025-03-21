/**
 * Script to start the application with the correct configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Kill any running Next.js processes
try {
  console.log('Killing any running Next.js processes...');
  execSync('pkill -f next || true');
} catch (error) {
  // Ignore errors
}

// Clean up the .next directory
try {
  console.log('Cleaning up the .next directory...');
  execSync('rm -rf .next');
} catch (error) {
  console.error(`Error cleaning up .next directory: ${error.message}`);
}

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

// Start the development server
console.log('Starting the development server...');
try {
  execSync('next dev', { stdio: 'inherit' });
} catch (error) {
  console.error(`Error starting development server: ${error.message}`);
} 