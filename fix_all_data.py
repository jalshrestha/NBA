import sqlite3
import json
import os
from datetime import datetime
import subprocess
import sys

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect('data/nba_stats.db')
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def fix_conferences():
    """Fix team conference assignments in the database"""
    try:
        print("Fixing team conference assignments...")
        
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Define conference assignments based on team ID
        eastern_teams = [
            1610612737,  # Atlanta Hawks
            1610612738,  # Boston Celtics
            1610612751,  # Brooklyn Nets
            1610612766,  # Charlotte Hornets
            1610612741,  # Chicago Bulls
            1610612739,  # Cleveland Cavaliers
            1610612765,  # Detroit Pistons
            1610612754,  # Indiana Pacers
            1610612748,  # Miami Heat
            1610612749,  # Milwaukee Bucks
            1610612752,  # New York Knicks
            1610612753,  # Orlando Magic
            1610612755,  # Philadelphia 76ers
            1610612761,  # Toronto Raptors
            1610612764   # Washington Wizards
        ]
        
        western_teams = [
            1610612742,  # Dallas Mavericks
            1610612743,  # Denver Nuggets
            1610612744,  # Golden State Warriors
            1610612745,  # Houston Rockets
            1610612746,  # LA Clippers
            1610612747,  # Los Angeles Lakers
            1610612763,  # Memphis Grizzlies
            1610612750,  # Minnesota Timberwolves
            1610612740,  # New Orleans Pelicans
            1610612760,  # Oklahoma City Thunder
            1610612756,  # Phoenix Suns
            1610612757,  # Portland Trail Blazers
            1610612758,  # Sacramento Kings
            1610612759,  # San Antonio Spurs
            1610612762   # Utah Jazz
        ]
        
        # Update Eastern Conference teams
        for team_id in eastern_teams:
            cursor.execute('''
                UPDATE teams
                SET conference = 'East'
                WHERE id = ?
            ''', (team_id,))
        
        # Update Western Conference teams
        for team_id in western_teams:
            cursor.execute('''
                UPDATE teams
                SET conference = 'West'
                WHERE id = ?
            ''', (team_id,))
        
        # Commit changes
        conn.commit()
        
        # Verify changes
        cursor.execute('SELECT COUNT(*) FROM teams WHERE conference = "East"')
        east_count = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM teams WHERE conference = "West"')
        west_count = cursor.fetchone()[0]
        
        print(f"Successfully updated conferences: {east_count} Eastern teams, {west_count} Western teams")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Error fixing conferences: {e}")
        return False

def fix_teams_json():
    """Extract teams from database and save to teams.json file"""
    try:
        print("Creating teams.json file...")
        
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
        return True
    except Exception as e:
        print(f"Error fixing teams.json: {e}")
        return False

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
        return True
    except Exception as e:
        print(f"Error refreshing standings: {e}")
        return False

def check_live_games():
    """Create an empty live_games.json file if it doesn't exist"""
    try:
        if not os.path.exists('data/stats/live_games.json'):
            print("Creating empty live_games.json file...")
            with open('data/stats/live_games.json', 'w') as f:
                json.dump([], f)
            print("Created empty live_games.json file")
        return True
    except Exception as e:
        print(f"Error checking live games: {e}")
        return False

def check_required_modules():
    """Check if required Python modules are installed"""
    try:
        import pymysql
        print("PyMySQL module is installed")
        return True
    except ImportError:
        print("PyMySQL module is missing, installing...")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pymysql'])
        print("PyMySQL module installed")
        return True
    except Exception as e:
        print(f"Error checking required modules: {e}")
        return False

def fix_all_data():
    """Fix all data issues"""
    print("Starting data fix process...")
    
    # Make sure required directories exist
    os.makedirs('data/stats', exist_ok=True)
    os.makedirs('data/teams', exist_ok=True)
    os.makedirs('data/general', exist_ok=True)
    os.makedirs('data/config', exist_ok=True)
    os.makedirs('team_data', exist_ok=True)
    
    # Check required modules
    check_required_modules()
    
    # Fix conferences in the database
    fix_conferences()
    
    # Fix teams.json
    fix_teams_json()
    
    # Refresh standings.json
    refresh_standings()
    
    # Check live games
    check_live_games()
    
    print("Data fix process completed successfully!")

if __name__ == "__main__":
    fix_all_data() 