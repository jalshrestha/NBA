/**
 * Cleanup script to remove old files after migration
 * 
 * This script will:
 * 1. Remove old files that have been migrated to the new structure
 * 
 * Usage:
 * node scripts/cleanup.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const ROOT_DIR = process.cwd();

// Files and directories to remove
const toRemove = [
  'pages',
  'components',
  'styles',
  'api',
  'app.py',
  'fetch_data.py',
  'nba_stats_app.py',
  'player_*.json', // This will be handled separately
  'standings.json',
  'nba_data.json',
  'team_data.pkl',
  'player_data.pkl',
  'last_update.txt',
];

// Function to remove file
function removeFile(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed file: ${file}`);
  }
}

// Function to remove directory
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed directory: ${dir}`);
  }
}

// Auto-confirm and remove files
console.log('Removing old files...');

// Remove directories
['pages', 'components', 'styles', 'api'].forEach(dir => {
  removeDir(path.join(ROOT_DIR, dir));
});

// Remove Python scripts
['app.py', 'fetch_data.py', 'nba_stats_app.py'].forEach(file => {
  removeFile(path.join(ROOT_DIR, file));
});

// Remove data files
const playerFiles = fs.readdirSync(ROOT_DIR).filter(file => file.startsWith('player_') && file.endsWith('.json'));
playerFiles.forEach(file => {
  removeFile(path.join(ROOT_DIR, file));
});

['standings.json', 'nba_data.json', 'team_data.pkl', 'player_data.pkl', 'last_update.txt'].forEach(file => {
  removeFile(path.join(ROOT_DIR, file));
});

// Remove other unnecessary files
['test_connection.js'].forEach(file => {
  removeFile(path.join(ROOT_DIR, file));
});

// Remove unnecessary directories
['__pycache__', 'templates'].forEach(dir => {
  removeDir(path.join(ROOT_DIR, dir));
});

console.log('Cleanup completed successfully!'); 