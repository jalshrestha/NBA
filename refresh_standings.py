import sqlite3
import json
import os
from datetime import datetime

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect('data/nba_stats.db')
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def refresh_standings():
    """Rebuild the standings data from the teams in the database"""
    try:
        print("Refreshing standings from database...")
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all teams
        cursor.execute('''
            SELECT id, name, abbreviation, conference, wins, losses, win_percentage as win_pct
            FROM teams
            ORDER BY conference, win_percentage DESC
        ''')
        teams = cursor.fetchall()
        
        # Convert to list of dictionaries and split by conference
        eastern = []
        western = []
        
        for i, team in enumerate(teams):
            team_dict = dict(team)
            # Convert any None values to appropriate defaults
            team_dict['wins'] = team_dict.get('wins', 0) or 0
            team_dict['losses'] = team_dict.get('losses', 0) or 0
            team_dict['win_pct'] = team_dict.get('win_pct', 0.0) or 0.0
            
            # Add team_id compatible with NBA API
            team_dict['team_id'] = team_dict['id']
            
            # Add standard fields
            team_dict['team_name'] = team_dict['name']
            team_dict['city'] = team_dict['name'].split(' ')[0] if ' ' in team_dict['name'] else ''
            team_dict['logo_url'] = f"https://cdn.nba.com/logos/nba/{team_dict['id']}/primary/L/logo.svg"
            
            if team_dict.get('conference', '').lower() == 'east':
                team_dict['conf_rank'] = len(eastern) + 1
                eastern.append(team_dict)
            else:
                team_dict['conf_rank'] = len(western) + 1
                western.append(team_dict)
        
        # Build standings data
        standings = {
            "eastern": eastern,
            "western": western,
            "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # Save to standings.json
        with open('data/stats/standings.json', 'w') as f:
            json.dump(standings, f)
        
        print(f"Successfully refreshed standings.json with {len(eastern)} Eastern and {len(western)} Western teams")
        
        conn.close()
    except Exception as e:
        print(f"Error refreshing standings: {e}")

if __name__ == "__main__":
    refresh_standings() 