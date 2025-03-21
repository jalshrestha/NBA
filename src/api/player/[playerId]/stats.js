// Serverless API endpoint for player stats
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for player stats
 * @param {NextApiRequest} req - The request object
 * @param {NextApiResponse} res - The response object
 */
export default async function handler(req, res) {
  const { playerId } = req.query;

  try {
    // Get the player stats file path
    const statsFilePath = path.join(process.cwd(), 'data', 'players', `player_${playerId}_stats.json`);
    
    // Check if the file exists
    if (!fs.existsSync(statsFilePath)) {
      return res.status(404).json({ error: 'Player stats not found' });
    }
    
    // Read the file
    const statsData = fs.readFileSync(statsFilePath, 'utf8');
    const stats = JSON.parse(statsData);
    
    return res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return res.status(500).json({ error: 'Failed to fetch player stats' });
  }
} 