/**
 * Script to fix Next.js configuration for src directory
 */

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

// Create necessary symlinks
createSymlink('src/pages', 'pages');
createSymlink('src/api', 'api');
createSymlink('src/styles', 'styles');
createSymlink('src/components', 'components');

console.log('Next.js configuration fixed!');
console.log('Run "npm run fresh" to start with a clean build.'); 