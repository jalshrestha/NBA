import sqlite3
import json
import os

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect('data/nba_stats.db')
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def fix_teams_json():
    """Extract teams from database and save to teams.json file"""
    try:
        # Create the stats directory if it doesn't exist
        os.makedirs('data/stats', exist_ok=True)
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all teams
        cursor.execute('SELECT * FROM teams ORDER BY name')
        teams = cursor.fetchall()
        
        # Convert to list of dictionaries
        teams_list = [dict(team) for team in teams]
        
        # Save to teams.json
        with open('data/stats/teams.json', 'w') as f:
            json.dump(teams_list, f)
        
        print(f"Successfully created teams.json with {len(teams_list)} teams")
        
        conn.close()
    except Exception as e:
        print(f"Error fixing teams.json: {e}")

if __name__ == "__main__":
    fix_teams_json() 