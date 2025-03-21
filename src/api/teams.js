// Serverless API endpoint for teams
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for NBA teams
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
    
    // Extract teams data
    const teams = nbaData.teams || {};
    
    return res.status(200).json(Object.values(teams));
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
} 