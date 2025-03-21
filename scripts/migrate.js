/**
 * Migration script to help with the transition to the new folder structure
 * 
 * This script will:
 * 1. Copy files from the old structure to the new structure
 * 2. Update imports in files to use the new structure
 * 3. Clean up the old structure
 * 
 * Usage:
 * node scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

// Function to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// Function to copy file
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${src} -> ${dest}`);
  } else {
    console.log(`File not found: ${src}`);
  }
}

// Function to copy directory
function copyDir(src, dest) {
  if (fs.existsSync(src)) {
    ensureDir(dest);
    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);
      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        copyFile(srcPath, destPath);
      }
    }
    console.log(`Copied directory: ${src} -> ${dest}`);
  } else {
    console.log(`Directory not found: ${src}`);
  }
}

// Ensure directories exist
ensureDir(SRC_DIR);
ensureDir(path.join(SRC_DIR, 'pages'));
ensureDir(path.join(SRC_DIR, 'components'));
ensureDir(path.join(SRC_DIR, 'styles'));
ensureDir(path.join(SRC_DIR, 'api'));
ensureDir(path.join(SRC_DIR, 'lib'));
ensureDir(path.join(SRC_DIR, 'hooks'));
ensureDir(path.join(SRC_DIR, 'utils'));
ensureDir(DATA_DIR);
ensureDir(path.join(DATA_DIR, 'players'));
ensureDir(path.join(DATA_DIR, 'teams'));
ensureDir(SCRIPTS_DIR);

// Copy files
console.log('Copying files...');

// Copy Next.js files
copyDir(path.join(ROOT_DIR, 'pages'), path.join(SRC_DIR, 'pages'));
copyDir(path.join(ROOT_DIR, 'components'), path.join(SRC_DIR, 'components'));
copyDir(path.join(ROOT_DIR, 'styles'), path.join(SRC_DIR, 'styles'));
copyDir(path.join(ROOT_DIR, 'api'), path.join(SRC_DIR, 'api'));

// Copy Python scripts
copyFile(path.join(ROOT_DIR, 'app.py'), path.join(SCRIPTS_DIR, 'app.py'));
copyFile(path.join(ROOT_DIR, 'fetch_data.py'), path.join(SCRIPTS_DIR, 'fetch_data.py'));
copyFile(path.join(ROOT_DIR, 'nba_stats_app.py'), path.join(SCRIPTS_DIR, 'nba_stats_app.py'));

// Copy data files
const playerFiles = fs.readdirSync(ROOT_DIR).filter(file => file.startsWith('player_') && file.endsWith('.json'));
for (const file of playerFiles) {
  copyFile(path.join(ROOT_DIR, file), path.join(DATA_DIR, 'players', file));
}

copyFile(path.join(ROOT_DIR, 'standings.json'), path.join(DATA_DIR, 'standings.json'));
copyFile(path.join(ROOT_DIR, 'nba_data.json'), path.join(DATA_DIR, 'nba_data.json'));
copyFile(path.join(ROOT_DIR, 'team_data.pkl'), path.join(DATA_DIR, 'team_data.pkl'));
copyFile(path.join(ROOT_DIR, 'player_data.pkl'), path.join(DATA_DIR, 'player_data.pkl'));
copyFile(path.join(ROOT_DIR, 'last_update.txt'), path.join(DATA_DIR, 'last_update.txt'));

console.log('Migration completed successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Update your imports to use the new structure');
console.log('2. Test your application with the new structure');
console.log('3. Once everything is working, you can remove the old files');
console.log('');
console.log('To remove old files, run:');
console.log('node scripts/cleanup.js'); 