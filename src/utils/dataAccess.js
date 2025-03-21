/**
 * Utility functions for accessing NBA data
 */

import fs from 'fs';
import path from 'path';

/**
 * Get player data by ID
 * @param {string} playerId - The player ID
 * @returns {Object} Player data
 */
export const getPlayerData = async (playerId) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'players', `player_${playerId}_stats.json`);
    const fileExists = fs.existsSync(filePath);
    
    if (!fileExists) {
      return null;
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading player data:', error);
    return null;
  }
};

/**
 * Get team data
 * @returns {Object} Team data
 */
export const getTeamData = async () => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'general', 'team_data.pkl');
    // This is a placeholder - you'll need to use your Python script to read this data
    // or convert it to JSON format
    return null;
  } catch (error) {
    console.error('Error reading team data:', error);
    return null;
  }
};

/**
 * Get standings data
 * @returns {Object} Standings data
 */
export const getStandingsData = async () => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'stats', 'standings.json');
    const fileExists = fs.existsSync(filePath);
    
    if (!fileExists) {
      return null;
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading standings data:', error);
    return null;
  }
};

/**
 * Get last update time
 * @returns {string} Last update time
 */
export const getLastUpdateTime = async () => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'config', 'last_update.txt');
    const fileExists = fs.existsSync(filePath);
    
    if (!fileExists) {
      return null;
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data.trim();
  } catch (error) {
    console.error('Error reading last update time:', error);
    return null;
  }
};

/**
 * Get NBA general data
 * @returns {Object} NBA general data
 */
export const getNBAData = async () => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'general', 'nba_data.json');
    const fileExists = fs.existsSync(filePath);
    
    if (!fileExists) {
      return null;
    }
    
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading NBA data:', error);
    return null;
  }
}; 