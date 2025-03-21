import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for NBA players
 * @param {NextApiRequest} req - The request object
 * @param {NextApiResponse} res - The response object
 */
export default async function handler(req, res) {
  try {
    // Get the NBA data file path
    const dataFilePath = path.join(process.cwd(), 'data', 'general', 'nba_data.json');
    
    // Check if the file exists
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json({ error: 'NBA data not found' });
    }
    
    // Read the file
    const nbaData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // Extract players data
    const players = nbaData.players || {};
    
    return res.status(200).json(Object.values(players));
  } catch (error) {
    console.error('Error fetching players:', error);
    return res.status(500).json({ error: 'Failed to fetch players' });
  }
} 