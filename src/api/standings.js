// Serverless API endpoint for standings
import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

/**
 * API handler for NBA standings
 * @param {NextApiRequest} req - The request object
 * @param {NextApiResponse} res - The response object
 */
export default async function handler(req, res) {
  try {
    // Get the standings file path
    const standingsFilePath = path.join(process.cwd(), 'data', 'stats', 'standings.json');
    
    // Check if the file exists
    if (!fs.existsSync(standingsFilePath)) {
      return res.status(404).json({ error: 'Standings not found' });
    }
    
    // Read the file
    const standingsData = fs.readFileSync(standingsFilePath, 'utf8');
    const standings = JSON.parse(standingsData);
    
    return res.status(200).json(standings);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return res.status(500).json({ error: 'Failed to fetch standings' });
  }
} 