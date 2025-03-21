// Serverless API endpoint for players by team
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for players by team
 * @param {NextApiRequest} req - The request object
 * @param {NextApiResponse} res - The response object
 */
export default async function handler(req, res) {
  const { teamId } = req.query;

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
    
    // Filter players by team ID
    const teamPlayers = Object.values(players).filter(player => 
      player.team_id && player.team_id.toString() === teamId.toString()
    );
    
    return res.status(200).json(teamPlayers);
  } catch (error) {
    console.error(`Error fetching players for team ${teamId}:`, error);
    return res.status(500).json({ error: 'Failed to fetch team players' });
  }
} 