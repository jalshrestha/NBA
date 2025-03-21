#!/usr/bin/env python
"""
Script to refresh player data, especially for those missing career stats
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
import logging
import argparse
import time
from scripts.fetch_data import fetch_player_data, update_api_status

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def refresh_player_with_missing_stats(db_path='data/nba_stats.db'):
    """
    Find players who are missing career stats and refresh their data
    """
    logger.info("Starting to refresh players with missing career stats")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update status
    update_api_status(db_path, 'refresh_missing_stats', 'start')
    
    try:
        # Create tables if they don't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_bio (
            player_id INTEGER PRIMARY KEY,
            name TEXT,
            position TEXT,
            height TEXT,
            weight TEXT,
            season_exp INTEGER,
            jersey TEXT,
            birthdate TEXT,
            age INTEGER,
            draft_year TEXT,
            draft_round TEXT,
            draft_number TEXT,
            school TEXT,
            country TEXT,
            team_id INTEGER,
            team_name TEXT,
            team_abbreviation TEXT,
            last_updated TEXT
        )
        ''')
        
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS career_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER,
            season TEXT,
            team TEXT,
            team_id INTEGER,
            games_played INTEGER,
            min REAL,
            pts REAL,
            reb REAL,
            ast REAL,
            stl REAL,
            blk REAL,
            fg_pct REAL,
            fg3_pct REAL,
            ft_pct REAL,
            is_total BOOLEAN DEFAULT 0,
            is_team_total BOOLEAN DEFAULT 0,
            last_updated TEXT,
            UNIQUE(player_id, season, team)
        )
        ''')
        
        # Find all players
        cursor.execute("SELECT player_id, name FROM player_bio")
        all_players = cursor.fetchall()
        
        logger.info(f"Found {len(all_players)} players in database")
        
        # For each player, check if they have career stats
        players_refreshed = 0
        players_with_missing_stats = 0
        
        for player_id, player_name in all_players:
            # Check if player has career stats
            cursor.execute("SELECT COUNT(*) FROM career_stats WHERE player_id = ?", (player_id,))
            stats_count = cursor.fetchone()[0]
            
            if stats_count == 0:
                logger.info(f"Player {player_name} (ID: {player_id}) has no career stats. Refreshing...")
                players_with_missing_stats += 1
                
                try:
                    # Fetch player data with force refresh
                    bio, stats = fetch_player_data(player_id, conn, force_refresh=True)
                    
                    if bio and stats:
                        logger.info(f"Successfully refreshed data for {player_name}: {len(stats)} stat records")
                        players_refreshed += 1
                    else:
                        logger.warning(f"Failed to refresh data for {player_name}")
                except Exception as e:
                    logger.error(f"Error refreshing data for {player_name}: {e}")
                
                # Sleep to avoid rate limiting
                time.sleep(1)
                
                # Commit changes regularly
                conn.commit()
        
        # Final stats
        logger.info(f"Completed refresh: {players_refreshed}/{players_with_missing_stats} players refreshed")
        
        # Update status
        update_api_status(db_path, 'refresh_missing_stats', 'success')
    except Exception as e:
        logger.error(f"Error during player refresh: {e}")
        update_api_status(db_path, 'refresh_missing_stats', 'error')
    finally:
        conn.close()

def refresh_specific_player(player_id, db_path='data/nba_stats.db'):
    """
    Refresh data for a specific player
    """
    logger.info(f"Refreshing data for player ID: {player_id}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    
    try:
        # Fetch player data with force refresh
        bio, stats = fetch_player_data(player_id, conn, force_refresh=True)
        
        if bio and stats:
            logger.info(f"Successfully refreshed data for player {player_id}: {len(stats)} stat records")
            return True
        else:
            logger.warning(f"Failed to refresh data for player {player_id}")
            return False
    except Exception as e:
        logger.error(f"Error refreshing data for player {player_id}: {e}")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Refresh player data')
    parser.add_argument('--player-id', type=int, help='Refresh a specific player ID')
    parser.add_argument('--missing-stats', action='store_true', help='Refresh all players with missing stats')
    
    args = parser.parse_args()
    
    if args.player_id:
        refresh_specific_player(args.player_id)
    elif args.missing_stats:
        refresh_player_with_missing_stats()
    else:
        logger.info("No action specified. Use --player-id or --missing-stats") 