import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import playercareerstats, teamyearbyyearstats, commonteamroster, leaguedashteamstats, leaguestandings, commonplayerinfo, playerprofilev2
from nba_api.live.nba.endpoints import scoreboard
import pandas as pd
import pickle
import time
import json
import sqlite3
import numpy as np
from datetime import datetime
import logging
from scripts.nba_api_config import get_request_session, DEFAULT_TIMEOUT
import random

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create directories if they don't exist
os.makedirs('data/players', exist_ok=True)
os.makedirs('data/teams', exist_ok=True)
os.makedirs('data/general', exist_ok=True)
os.makedirs('data/stats', exist_ok=True)
os.makedirs('data/config', exist_ok=True)
os.makedirs('team_data', exist_ok=True)

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer) or isinstance(obj, np.int64) or isinstance(obj, np.int32):
            return int(obj)
        elif isinstance(obj, np.floating) or isinstance(obj, np.float64) or isinstance(obj, np.float32):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()

# Configure requests with retries and timeout
def get_request_session():
    session = requests.Session()
    retry_strategy = Retry(
        total=10,  # Increased from 5 to 10 retries
        backoff_factor=2,  # Increased from 1 to 2 for more exponential backoff
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"],
        respect_retry_after_header=True  # Respect rate limiting headers
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=100, pool_maxsize=100)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    
    # Set a custom user agent to avoid rate limiting
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.nba.com',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    })
    return session

# Set user agent for nba_api requests to avoid rate limiting
from nba_api import stats
stats.static.teams.HEADERS = {
    'Host': 'stats.nba.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Referer': 'https://www.nba.com/',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
}

# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer) or isinstance(obj, np.int64) or isinstance(obj, np.int32):
            return int(obj)
        elif isinstance(obj, np.floating) or isinstance(obj, np.float64) or isinstance(obj, np.float32):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# SQLite database setup
def setup_database():
    conn = sqlite3.connect('data/nba_stats.db')
    cursor = conn.cursor()
    
    # Create teams table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        name TEXT,
        city TEXT,
        abbreviation TEXT,
        conference TEXT,
        division TEXT,
        wins INTEGER,
        losses INTEGER,
        win_percentage REAL,
        last_updated TEXT
    )
    ''')
    
    # Create players table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY,
        name TEXT,
        team_id INTEGER,
        position TEXT,
        height TEXT,
        weight TEXT,
        last_updated TEXT,
        FOREIGN KEY (team_id) REFERENCES teams (id)
    )
    ''')
    
    # Create player_stats table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS player_stats (
        player_id INTEGER PRIMARY KEY,
        points REAL,
        rebounds REAL,
        assists REAL,
        steals REAL,
        blocks REAL,
        turnovers REAL,
        field_goal_pct REAL,
        three_point_pct REAL,
        free_throw_pct REAL,
        last_updated TEXT,
        FOREIGN KEY (player_id) REFERENCES players (id)
    )
    ''')
    
    conn.commit()
    return conn

def fetch_team_data(team, conn):
    """Fetch data for a single team and its players"""
    player_stats = {}
    team_stats = {}
    
    try:
        logger.info(f"Fetching {team['full_name']} roster...")
        
        # Get team basic info from static data
        team_id = team['id']
        
        # Get team info for display
        team_info = {
            'id': team_id,
            'name': team['full_name'],
            'abbreviation': team['abbreviation'],
            'city': team.get('city', ''),
            'conference': team.get('conference', ''),
            'division': team.get('division', ''),
            'logo_url': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg"
        }
        team_stats = team_info.copy()  # Initialize team_stats with basic info
        
        # Try to get roster with retries
        max_retries = 3
        retry_count = 0
        roster_data = None
        
        while retry_count < max_retries and roster_data is None:
            try:
                # Get team roster
                roster = commonteamroster.CommonTeamRoster(team_id=team_id, timeout=60)
                team_players = roster.get_data_frames()[0]
                if not team_players.empty:
                    roster_data = team_players
            except Exception as e:
                retry_count += 1
                logger.warning(f"Attempt {retry_count} failed to fetch roster for {team['full_name']}: {e}")
                time.sleep(2 * retry_count)
        
        if roster_data is None:
            logger.error(f"Failed to fetch roster for {team['full_name']} after {max_retries} attempts")
            # Try to load from database if exists
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM players WHERE team_id = ?', (team_id,))
            db_players = cursor.fetchall()
            
            if db_players:
                logger.info(f"Using cached player data from database for {team['full_name']}")
                for player in db_players:
                    try:
                        player_id = player[0]  # Assuming id is the first column
                        bio_data, career_stats = fetch_player_data(player_id, conn)
                        if bio_data and career_stats:
                            player_stats[str(player_id)] = {
                                'player_id': player_id,
                                'bio': bio_data,
                                'career_stats': career_stats
                            }
                    except Exception as e:
                        logger.error(f"Error fetching data for player {player[0]}: {e}")
                        continue
        else:
            # Process roster normally
            cursor = conn.cursor()
            cursor.execute('SELECT conference, division FROM teams WHERE id = ?', (team['id'],))
            conf_div = cursor.fetchone()
            if conf_div:
                team_stats['conference'] = conf_div[0]
                team_stats['division'] = conf_div[1]
            
            # Fetch players stats
            for _, player in roster_data.iterrows():
                try:
                    player_id = int(player['PLAYER_ID'])
                    logger.info(f"  - Fetching data for {player['PLAYER']}...")
                    
                    # Insert basic player info in players table
                    cursor.execute('''
                    INSERT OR REPLACE INTO players (id, name, team_id, position, height, weight, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        player_id,
                        player['PLAYER'],
                        int(team['id']),
                        player.get('POSITION', ''),
                        player.get('HEIGHT', ''),
                        player.get('WEIGHT', ''),
                        datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    ))
                    conn.commit()
                    
                    # Fetch detailed player data
                    bio_data, career_stats = fetch_player_data(player_id, conn)
                    
                    if bio_data and career_stats:
                        player_stats[player['PLAYER'].lower()] = {
                            'name': player['PLAYER'],
                            'player_id': player_id,
                            'team_id': int(team['id']),
                            'team_name': team['full_name'],
                            'team_abbreviation': team['abbreviation'],
                            'position': player.get('POSITION', ''),
                            'bio': bio_data,
                            'career_stats': career_stats
                        }
                    
                    time.sleep(1)  # Prevent rate limiting
                except Exception as e:
                    logger.error(f"Error fetching data for {player['PLAYER']}: {e}")
                    continue
        
        # Try to get team stats
        try:
            standings = leaguedashteamstats.LeagueDashTeamStats(team_id_nullable=team_id, timeout=60)
            team_df = standings.get_data_frames()[0]
            
            if not team_df.empty:
                team_row = team_df.iloc[0]
                team_stats.update({
                    'wins': int(team_row['W']),
                    'losses': int(team_row['L']),
                    'win_pct': float(team_row['W_PCT']),
                    'games_played': int(team_row['GP']),
                    'points_pg': float(team_row['PTS']),
                    'rebounds_pg': float(team_row['REB']),
                    'assists_pg': float(team_row['AST'])
                })
        except Exception as e:
            logger.error(f"Error fetching team stats for {team['full_name']}: {e}")
        
        # Save team stats to JSON files
        team_file = f"data/teams/{team['abbreviation']}_stats.json"
        with open(team_file, 'w') as f:
            json.dump(team_stats, f, cls=NumpyEncoder)
        
        # Save to team_data directory
        team_data_file = f"team_data/{team['abbreviation']}.json"
        team_full_data = {
            'team_info': team_stats,
            'roster': player_stats,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        with open(team_data_file, 'w') as f:
            json.dump(team_full_data, f, cls=NumpyEncoder)
        
        return player_stats, team_stats
        
    except Exception as e:
        logger.error(f"Error fetching data for {team['full_name']}: {e}")
        return {}, {}

def fetch_standings():
    """Fetch current NBA standings using leaguedashteamstats and team static data"""
    try:
        logger.info("Fetching league standings...")
        
        # Check if we have recent standings data in cache
        standings_file = 'data/stats/standings.json'
        if os.path.exists(standings_file):
            file_stat = os.stat(standings_file)
            file_age = (datetime.now().timestamp() - file_stat.st_mtime) / 3600  # Age in hours
            
            # Use cached standings if less than 1 hour old
            if file_age < 1:  # 1 hour cache
                logger.info("Using cached standings data")
                try:
                    with open(standings_file, 'r') as f:
                        return json.load(f)
                except Exception as e:
                    logger.warning(f"Error reading cached standings: {e}")
        
        # Get all teams from static data first
        all_teams = teams.get_teams()
        
        # Initialize standings data structure
        standings_data = {
            'eastern': [],
            'western': []
        }
        
        # Try to fetch fresh standings data with multiple retry approaches
        standings_fetched = False
        
        # Approach 1: Try direct API request
        try:
            # Set special headers for this request
            headers = {
                'Host': 'stats.nba.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.nba.com/',
                'x-nba-stats-token': 'true',
                'x-nba-stats-origin': 'stats',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
            }
            
            url = "https://stats.nba.com/stats/leaguestandingsv3?LeagueID=00&Season=2023-24&SeasonType=Regular%20Season"
            session = get_request_session()
            session.headers.update(headers)
            
            # Wait a bit before making the request
            time.sleep(random.uniform(1, 3))
            
            response = session.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if 'resultSets' in data and len(data['resultSets']) > 0:
                    result_set = data['resultSets'][0]
                    headers = result_set['headers']
                    rows = result_set['rowSet']
                    
                    standings_df = pd.DataFrame(rows, columns=headers)
                    standings_fetched = not standings_df.empty
                    
                    # Debug: print column names for troubleshooting
                    logger.info(f"Available columns in standings data: {list(standings_df.columns)}")
                    
                    # Create team lookup by ID
                    teams_by_id = {team['id']: team for team in all_teams}
                    
                    # Process each team in the standings
                    for _, row in standings_df.iterrows():
                        try:
                            team_id = int(row['TeamID'])
                            conference = 'East' if row['Conference'] == 'East' else 'West'
                            
                            # Get team info from static data
                            team_info = teams_by_id.get(team_id, {})
                            
                            # Handle GamesBehind field safely
                            games_behind = 0.0
                            if 'GB' in standings_df.columns:
                                games_behind_value = row['GB']
                            elif 'GamesBehind' in standings_df.columns:
                                games_behind_value = row['GamesBehind']
                            else:
                                games_behind_value = 0.0
                                
                            if isinstance(games_behind_value, str) and games_behind_value in ['-', '--']:
                                games_behind = 0.0
                            else:
                                try:
                                    games_behind = float(games_behind_value)
                                except (ValueError, TypeError):
                                    games_behind = 0.0
                            
                            # Safely get standings rank - try PlayoffRank first, then use other options
                            conf_rank = 0
                            for rank_field in ['PlayoffRank', 'ConferenceRank', 'RANK']:
                                if rank_field in standings_df.columns:
                                    try:
                                        conf_rank = int(row[rank_field])
                                        break
                                    except (ValueError, TypeError):
                                        pass
                            
                            # Build team data object
                            team_data = {
                                'team_id': team_id,
                                'team_name': f"{row['TeamCity']} {row['TeamName']}",
                                'name': f"{row['TeamCity']} {row['TeamName']}",
                                'abbreviation': team_info.get('abbreviation', row.get('TeamAbbreviation', '')),
                                'conference': conference,
                                'city': row['TeamCity'],
                                'wins': int(row['WINS']),
                                'losses': int(row['LOSSES']),
                                'win_pct': float(row['WinPCT']),
                                'games_behind': games_behind,
                                'conf_rank': conf_rank,
                                'home_record': row.get('HOME', '0-0'),
                                'road_record': row.get('ROAD', '0-0'),
                                'last_10': row.get('L10', '0-0'),
                                'streak': row.get('strCurrentStreak', ''),
                                'logo_url': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg"
                            }
                            
                            # Add to appropriate conference list
                            if conference == 'East':
                                standings_data['eastern'].append(team_data)
                            else:
                                standings_data['western'].append(team_data)
                        except Exception as e:
                            logger.error(f"Error processing team in standings: {e}")
                            continue
        except Exception as e:
            logger.error(f"Error fetching standings from direct API: {e}")
        
        # Approach 2: Try using the nba_api library if first approach failed
        if not standings_fetched:
            try:
                logger.info("Trying fallback standings API")
                standings = leaguestandings.LeagueStandings(timeout=60)
                standings_df = standings.get_data_frames()[0]
                
                if not standings_df.empty:
                    standings_fetched = True
                    
                    # Debug: print column names for troubleshooting
                    logger.info(f"Available columns in standings data (fallback): {list(standings_df.columns)}")
                    
                    # Create team lookup by ID
                    teams_by_id = {team['id']: team for team in all_teams}
                    
                    # Process each team in the standings
                    for _, row in standings_df.iterrows():
                        try:
                            team_id = int(row['TeamID'])
                            conference = 'East' if row['Conference'] == 'East' else 'West'
                            
                            # Get team info from static data
                            team_info = teams_by_id.get(team_id, {})
                            
                            # Handle GamesBehind field safely
                            games_behind = 0.0
                            for gb_field in ['GB', 'GamesBehind']:
                                if gb_field in standings_df.columns:
                                    games_behind_value = row[gb_field]
                                    if isinstance(games_behind_value, str) and games_behind_value in ['-', '--']:
                                        games_behind = 0.0
                                    else:
                                        try:
                                            games_behind = float(games_behind_value)
                                            break
                                        except (ValueError, TypeError):
                                            pass
                            
                            # Safely get standings rank - try PlayoffRank first, then use other options
                            conf_rank = 0
                            for rank_field in ['PlayoffRank', 'ConferenceRank', 'RANK']:
                                if rank_field in standings_df.columns:
                                    try:
                                        conf_rank = int(row[rank_field])
                                        break
                                    except (ValueError, TypeError):
                                        pass
                            
                            # Build team data object
                            team_data = {
                                'team_id': team_id,
                                'team_name': f"{row['TeamCity']} {row['TeamName']}",
                                'name': f"{row['TeamCity']} {row['TeamName']}",
                                'abbreviation': team_info.get('abbreviation', row.get('TeamAbbreviation', '')),
                                'conference': conference,
                                'city': row['TeamCity'],
                                'wins': int(row['WINS']),
                                'losses': int(row['LOSSES']),
                                'win_pct': float(row['WinPCT']),
                                'games_behind': games_behind,
                                'conf_rank': conf_rank,
                                'home_record': row.get('HOME', '0-0'),
                                'road_record': row.get('ROAD', '0-0'),
                                'last_10': row.get('L10', '0-0'),
                                'streak': row.get('strCurrentStreak', ''),
                                'logo_url': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg"
                            }
                            
                            # Add to appropriate conference list
                            if conference == 'East':
                                standings_data['eastern'].append(team_data)
                            else:
                                standings_data['western'].append(team_data)
                        except Exception as e:
                            logger.error(f"Error processing team in standings (fallback): {e}")
                            continue
            except Exception as e:
                logger.error(f"Error fetching standings from fallback API: {e}")
        
        # If all API attempts failed, use fallback with team data
        if not standings_fetched or not (standings_data['eastern'] and standings_data['western']):
            logger.warning("Using static team data as fallback for standings")
            
            # Fallback to basic team data
            for team in all_teams:
                team_id = team['id']
                conference = team.get('conference', '')
                if not conference:
                    # Guess the conference based on current counts
                    conference = 'East' if len(standings_data['eastern']) < 15 else 'West'
                
                # Create a basic team data entry
                team_data = {
                    'team_id': team_id,
                    'team_name': team['full_name'],
                    'name': team['full_name'],
                    'abbreviation': team['abbreviation'],
                    'conference': conference,
                    'city': team.get('city', ''),
                    'wins': 0,
                    'losses': 0,
                    'win_pct': 0.0,
                    'games_behind': 0.0,
                    'conf_rank': 0,
                    'home_record': '0-0',
                    'road_record': '0-0',
                    'last_10': '0-0',
                    'streak': '',
                    'logo_url': f"https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg"
                }
                
                # Only add if we don't already have this team
                existing_team = next((t for t in standings_data['eastern'] if t['team_id'] == team_id), None)
                if not existing_team:
                    existing_team = next((t for t in standings_data['western'] if t['team_id'] == team_id), None)
                
                if not existing_team:
                    # Add to appropriate conference list
                    if conference.lower() == 'east':
                        standings_data['eastern'].append(team_data)
                    else:
                        standings_data['western'].append(team_data)
        
        # Sort teams by conference rank or wins if rank not available
        standings_data['eastern'].sort(key=lambda x: (x['conf_rank'] if x['conf_rank'] > 0 else 999, -x['wins']))
        standings_data['western'].sort(key=lambda x: (x['conf_rank'] if x['conf_rank'] > 0 else 999, -x['wins']))
        
        # Reassign ranks if needed
        for i, team in enumerate(standings_data['eastern']):
            if team['conf_rank'] == 0:
                team['conf_rank'] = i + 1
        
        for i, team in enumerate(standings_data['western']):
            if team['conf_rank'] == 0:
                team['conf_rank'] = i + 1
        
        # Add last updated timestamp
        standings_data['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Save standings to JSON file
        with open('data/stats/standings.json', 'w') as f:
            json.dump(standings_data, f, cls=NumpyEncoder)
        
        # Update team-specific JSON files with the latest standings data
        logger.info("Updating team-specific JSON files with standings data...")
        
        # Create a dict for quick lookup of team standings by team_id
        team_standings = {}
        for conference in ['eastern', 'western']:
            for team in standings_data[conference]:
                team_standings[team['team_id']] = team
        
        # Update team stats JSON files
        updated_teams = 0
        for team_abbr in [team['abbreviation'] for conf in ['eastern', 'western'] for team in standings_data[conf] if 'abbreviation' in team]:
            team_stats_file = f"data/teams/{team_abbr}_stats.json"
            if os.path.exists(team_stats_file):
                try:
                    with open(team_stats_file, 'r') as f:
                        team_stats = json.load(f)
                    
                    # Find team data from standings
                    team_id = team_stats.get('id')
                    if team_id and team_id in team_standings:
                        standings_team = team_standings[team_id]
                        # Update record
                        team_stats['wins'] = standings_team['wins']
                        team_stats['losses'] = standings_team['losses']
                        team_stats['win_pct'] = standings_team['win_pct']
                        
                        # Save updated file
                        with open(team_stats_file, 'w') as f:
                            json.dump(team_stats, f, cls=NumpyEncoder)
                        updated_teams += 1
                except Exception as e:
                    logger.error(f"Error updating team stats file for {team_abbr}: {e}")
        
        # Update team data JSON files
        for team_abbr in [team['abbreviation'] for conf in ['eastern', 'western'] for team in standings_data[conf] if 'abbreviation' in team]:
            team_data_file = f"team_data/{team_abbr}.json"
            if os.path.exists(team_data_file):
                try:
                    with open(team_data_file, 'r') as f:
                        full_team_data = json.load(f)
                    
                    # Find team data from standings
                    if 'team_info' in full_team_data:
                        team_id = full_team_data['team_info'].get('id')
                        if team_id and team_id in team_standings:
                            standings_team = team_standings[team_id]
                            # Update record
                            full_team_data['team_info']['wins'] = standings_team['wins']
                            full_team_data['team_info']['losses'] = standings_team['losses']
                            full_team_data['team_info']['win_pct'] = standings_team['win_pct']
                            full_team_data['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            
                            # Save updated file
                            with open(team_data_file, 'w') as f:
                                json.dump(full_team_data, f, cls=NumpyEncoder)
                except Exception as e:
                    logger.error(f"Error updating team data file for {team_abbr}: {e}")
        
        logger.info(f"Updated {updated_teams} team files with standings data")
            
        return standings_data
    except Exception as e:
        logger.error(f"Error in fetch_standings: {e}")
        # Try to load from file if exists
        try:
            if os.path.exists('data/stats/standings.json'):
                with open('data/stats/standings.json', 'r') as f:
                    return json.load(f)
        except:
            pass
        return {'eastern': [], 'western': []}

def check_for_live_games():
    """Check if there are any live NBA games happening now"""
    try:
        logger.info("Checking for live games...")
        score_board = scoreboard.ScoreBoard()
        games = score_board.get_dict()
        
        if 'scoreboard' in games and 'games' in games['scoreboard']:
            active_games = [
                game for game in games['scoreboard']['games'] 
                if game['gameStatus'] == 2  # Status 2 means game is live
            ]
            
            if active_games:
                live_games_data = []
                for game in active_games:
                    game_data = {
                        'game_id': game['gameId'],
                        'home_team': {
                            'team_id': game['homeTeam']['teamId'],
                            'team_name': game['homeTeam']['teamName'],
                            'score': game['homeTeam']['score']
                        },
                        'away_team': {
                            'team_id': game['awayTeam']['teamId'],
                            'team_name': game['awayTeam']['teamName'],
                            'score': game['awayTeam']['score']
                        },
                        'game_clock': game.get('gameClock', ''),
                        'period': game.get('period', 0)
                    }
                    live_games_data.append(game_data)
                
                # Save live games data to JSON file
                with open('data/stats/live_games.json', 'w') as f:
                    json.dump(live_games_data, f, cls=NumpyEncoder)
                
                return live_games_data, True
                
        # No live games
        with open('data/stats/live_games.json', 'w') as f:
            json.dump([], f)
            
        return [], False
    except Exception as e:
        logger.error(f"Error checking for live games: {e}")
        return [], False

def safe_request(func, *args, **kwargs):
    """Wrapper function to add delay between requests and handle errors"""
    max_retries = 10
    retry_count = 0
    base_delay = 2  # Base delay in seconds
    
    while retry_count < max_retries:
        try:
            # Add random delay between requests (1-3 seconds)
            time.sleep(base_delay + random.uniform(0, 2))
            
            result = func(*args, **kwargs)
            
            # Check if result is None or empty
            if result is None:
                raise Exception("API returned None")
                
            # If result is a DataFrame, check if it's empty
            if isinstance(result, pd.DataFrame) and result.empty:
                raise Exception("API returned empty DataFrame")
                
            return result
            
        except Exception as e:
            retry_count += 1
            if retry_count == max_retries:
                logger.error(f"Failed after {max_retries} attempts: {e}")
                raise
            
            # Exponential backoff with jitter
            delay = (base_delay * (2 ** retry_count)) + random.uniform(0, 2)
            logger.warning(f"Attempt {retry_count} failed: {e}. Retrying in {delay:.2f} seconds...")
            time.sleep(delay)

def fetch_player_data(player_id, conn, force_refresh=False):
    """Fetch comprehensive player data including stats and bio with caching"""
    try:
        logger.info(f"Fetching detailed data for player {player_id}...")
        
        # Set up cursor for database operations
        cursor = conn.cursor()
        
        # Skip cache if force_refresh is True
        if not force_refresh:
            # FIRST: Check if we have data in the database
            cursor.execute("SELECT * FROM player_bio WHERE player_id = ?", (player_id,))
            cached_bio = cursor.fetchone()
            
            cursor.execute("SELECT * FROM career_stats WHERE player_id = ?", (player_id,))
            cached_stats = cursor.fetchall()
            
            # If we have cached data and it's less than 24 hours old, use it
            if cached_bio and cached_stats:
                bio_last_updated = datetime.strptime(cached_bio[-1], '%Y-%m-%d %H:%M:%S')
                if (datetime.now() - bio_last_updated).total_seconds() < 86400:  # 24 hours
                    logger.info(f"Using cached data for player {player_id}")
                    
                    bio_data = {
                        'player_id': cached_bio[0],
                        'name': cached_bio[1],
                        'position': cached_bio[2],
                        'height': cached_bio[3],
                        'weight': cached_bio[4],
                        'season_exp': cached_bio[5],
                        'jersey': cached_bio[6],
                        'birthdate': cached_bio[7],
                        'age': cached_bio[8],
                        'draft_year': cached_bio[9],
                        'draft_round': cached_bio[10],
                        'draft_number': cached_bio[11],
                        'school': cached_bio[12],
                        'country': cached_bio[13],
                        'team_id': cached_bio[14],
                        'team_name': cached_bio[15],
                        'team_abbreviation': cached_bio[16]
                    }
                    
                    career_stats = []
                    for stat in cached_stats:
                        stat_data = {
                            'player_id': stat[1],
                            'season': stat[2],
                            'team': stat[3],
                            'team_id': stat[4],
                            'games_played': stat[5],
                            'min': stat[6],
                            'pts': stat[7],
                            'reb': stat[8],
                            'ast': stat[9],
                            'stl': stat[10],
                            'blk': stat[11],
                            'fg_pct': stat[12],
                            'fg3_pct': stat[13],
                            'ft_pct': stat[14],
                            'is_total': bool(stat[15]),
                            'is_team_total': bool(stat[16])
                        }
                        career_stats.append(stat_data)
                    
                    return bio_data, career_stats
            
            # SECOND: Check if we have JSON files for this player
            player_file = f"data/players/player_{player_id}_full.json"
            if os.path.exists(player_file) and not force_refresh:
                file_stat = os.stat(player_file)
                file_age = (datetime.now().timestamp() - file_stat.st_mtime) / 3600  # Age in hours
                
                if file_age < 24:  # Use file if less than 24 hours old
                    logger.info(f"Using cached JSON file for player {player_id}")
                    try:
                        with open(player_file, 'r') as f:
                            player_data = json.load(f)
                            return player_data.get('bio', {}), player_data.get('career_stats', [])
                    except Exception as e:
                        logger.warning(f"Error reading player JSON file: {e}")
        else:
            logger.info(f"Force refresh requested for player {player_id}")
            # Delete any existing cached files for this player
            player_file = f"data/players/player_{player_id}_full.json"
            if os.path.exists(player_file):
                os.remove(player_file)
                logger.info(f"Deleted cached file for player {player_id}")
        
        # THIRD: Get data from APIs with fallback mechanisms
        # Attempt to get basic player bio first
        bio_data = None
        try:
            # Manually set headers to avoid rate limiting
            headers = {
                'Host': 'stats.nba.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Referer': 'https://www.nba.com/',
                'x-nba-stats-token': 'true',
                'x-nba-stats-origin': 'stats',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
            }
            
            url = f"https://stats.nba.com/stats/commonplayerinfo?PlayerID={player_id}"
            session = get_request_session()
            session.headers.update(headers)
            
            # Wait a bit before making the request to avoid rate limiting
            time.sleep(random.uniform(1, 3))
            
            response = session.get(url, timeout=30)
            if response.status_code == 200:
                data = response.json()
                if 'resultSets' in data and len(data['resultSets']) > 0:
                    headers = data['resultSets'][0]['headers']
                    player_info = data['resultSets'][0]['rowSet'][0]
                    player_dict = dict(zip(headers, player_info))
                    
                    bio_data = {
                        'player_id': int(player_id),
                        'name': player_dict.get('DISPLAY_FIRST_LAST', ''),
                        'position': player_dict.get('POSITION', ''),
                        'height': player_dict.get('HEIGHT', ''),
                        'weight': player_dict.get('WEIGHT', ''),
                        'season_exp': int(player_dict.get('SEASON_EXP', 0)) if player_dict.get('SEASON_EXP') else 0,
                        'jersey': player_dict.get('JERSEY', ''),
                        'birthdate': player_dict.get('BIRTHDATE', ''),
                        'age': 0,
                        'draft_year': player_dict.get('DRAFT_YEAR', ''),
                        'draft_round': player_dict.get('DRAFT_ROUND', ''),
                        'draft_number': player_dict.get('DRAFT_NUMBER', ''),
                        'school': player_dict.get('SCHOOL', ''),
                        'country': player_dict.get('COUNTRY', ''),
                        'team_id': int(player_dict.get('TEAM_ID', 0)) if player_dict.get('TEAM_ID') else 0,
                        'team_name': player_dict.get('TEAM_NAME', ''),
                        'team_abbreviation': player_dict.get('TEAM_ABBREVIATION', '')
                    }
                    
                    # Calculate age from birthdate
                    if bio_data['birthdate']:
                        try:
                            birthdate_str = bio_data['birthdate'].split('T')[0]
                            birth_date = datetime.strptime(birthdate_str, '%Y-%m-%d')
                            today = datetime.now()
                            bio_data['age'] = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                        except Exception as e:
                            logger.warning(f"Could not calculate age: {e}")
                            if player_dict.get('AGE'):
                                bio_data['age'] = int(player_dict.get('AGE'))
        except Exception as e:
            logger.error(f"Error fetching player bio via direct API: {e}")
            
        # If we couldn't get bio data, try using commonplayerinfo endpoint via nba_api
        if bio_data is None:
            try:
                player_info = commonplayerinfo.CommonPlayerInfo(
                    player_id=player_id,
                    timeout=30,
                    proxy=None
                ).get_data_frames()[0]
                
                if not player_info.empty:
                    player_bio = player_info.iloc[0]
                    bio_data = {
                        'player_id': int(player_id),
                        'name': player_bio.get('DISPLAY_FIRST_LAST', ''),
                        'position': player_bio.get('POSITION', ''),
                        'height': player_bio.get('HEIGHT', ''),
                        'weight': player_bio.get('WEIGHT', ''),
                        'season_exp': int(player_bio.get('SEASON_EXP', 0)) if player_bio.get('SEASON_EXP') else 0,
                        'jersey': player_bio.get('JERSEY', ''),
                        'birthdate': player_bio.get('BIRTHDATE', ''),
                        'age': 0,
                        'draft_year': player_bio.get('DRAFT_YEAR', ''),
                        'draft_round': player_bio.get('DRAFT_ROUND', ''),
                        'draft_number': player_bio.get('DRAFT_NUMBER', ''),
                        'school': player_bio.get('SCHOOL', ''),
                        'country': player_bio.get('COUNTRY', ''),
                        'team_id': int(player_bio.get('TEAM_ID', 0)) if player_bio.get('TEAM_ID') else 0,
                        'team_name': player_bio.get('TEAM_NAME', ''),
                        'team_abbreviation': player_bio.get('TEAM_ABBREVIATION', '')
                    }
                    
                    # Calculate age from birthdate
                    if bio_data['birthdate']:
                        try:
                            birthdate_str = bio_data['birthdate'].split('T')[0]
                            birth_date = datetime.strptime(birthdate_str, '%Y-%m-%d')
                            today = datetime.now()
                            bio_data['age'] = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                        except Exception as e:
                            logger.warning(f"Could not calculate age: {e}")
                            if player_bio.get('AGE'):
                                bio_data['age'] = int(player_bio.get('AGE'))
            except Exception as e:
                logger.error(f"Error fetching player bio via nba_api: {e}")
        
        # If still no bio data, try to construct minimal bio from known player ID
        if bio_data is None:
            # Get from all_players if possible
            all_players = players.get_players()
            player_match = next((p for p in all_players if p['id'] == int(player_id)), None)
            
            if player_match:
                bio_data = {
                    'player_id': int(player_id),
                    'name': player_match.get('full_name', ''),
                    'position': '',
                    'height': '',
                    'weight': '',
                    'season_exp': 0,
                    'jersey': '',
                    'birthdate': '',
                    'age': 0,
                    'draft_year': '',
                    'draft_round': '',
                    'draft_number': '',
                    'school': '',
                    'country': '',
                    'team_id': 0,
                    'team_name': '',
                    'team_abbreviation': ''
                }
            else:
                # Create minimal bio just from ID
                bio_data = {
                    'player_id': int(player_id),
                    'name': f"Player {player_id}",
                    'position': '',
                    'height': '',
                    'weight': '',
                    'season_exp': 0,
                    'jersey': '',
                    'birthdate': '',
                    'age': 0,
                    'draft_year': '',
                    'draft_round': '',
                    'draft_number': '',
                    'school': '',
                    'country': '',
                    'team_id': 0,
                    'team_name': '',
                    'team_abbreviation': ''
                }
        
        # Now try to get career stats using different methods
        career_stats = []
        
        # Use our dedicated function to fetch career stats
        season_stats_df = fetch_player_career_stats(player_id)
        
        if not season_stats_df.empty:
            career_stats = process_season_stats(season_stats_df, player_id)
            logger.info(f"Successfully processed career stats for player {player_id}")
        else:
            logger.warning(f"Failed to fetch career stats for player {player_id}")
            
            # If we have bio data but no career stats, create minimal placeholder stats
            if bio_data:
                logger.warning(f"Creating minimal placeholder stats for player {player_id}")
                
                # Use current team from bio data
                team_abbr = bio_data.get('team_abbreviation', 'UNK')
                team_id = bio_data.get('team_id', 0)
                current_season = "2023-24"  # Current NBA season
                
                # Create minimal current season stats
                minimal_stats = {
                    'player_id': int(player_id),
                    'season': current_season,
                    'team': team_abbr,
                    'team_id': team_id,
                    'games_played': 1,
                    'min': 0,
                    'pts': 0,
                    'reb': 0,
                    'ast': 0,
                    'stl': 0,
                    'blk': 0,
                    'fg_pct': 0,
                    'fg3_pct': 0,
                    'ft_pct': 0,
                    'total_games': 1,
                    'total_points': 0,
                    'total_rebounds': 0,
                    'total_assists': 0,
                    'total_steals': 0,
                    'total_blocks': 0,
                    'is_placeholder': True
                }
                
                # Create minimal career total
                minimal_career_total = {
                    'player_id': int(player_id),
                    'season': 'Career',
                    'team': 'TOTAL',
                    'games_played': 1,
                    'min': 0,
                    'pts': 0,
                    'reb': 0,
                    'ast': 0,
                    'stl': 0,
                    'blk': 0,
                    'fg_pct': 0,
                    'fg3_pct': 0,
                    'ft_pct': 0,
                    'is_total': True,
                    'is_placeholder': True
                }
                
                career_stats = [minimal_stats, minimal_career_total]
                logger.info(f"Created minimal placeholder stats for player {player_id}")
        
        # Save bio and career stats to database
        if bio_data:
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
            INSERT OR REPLACE INTO player_bio (
                player_id, name, position, height, weight, season_exp, jersey, birthdate, age,
                draft_year, draft_round, draft_number, school, country, team_id, team_name, 
                team_abbreviation, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                bio_data['player_id'],
                bio_data['name'],
                bio_data['position'],
                bio_data['height'],
                bio_data['weight'],
                bio_data['season_exp'],
                bio_data['jersey'],
                bio_data['birthdate'],
                bio_data['age'],
                bio_data['draft_year'],
                bio_data['draft_round'],
                bio_data['draft_number'],
                bio_data['school'],
                bio_data['country'],
                bio_data['team_id'],
                bio_data['team_name'],
                bio_data['team_abbreviation'],
                datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            ))
            
            # Create career_stats table
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
            
            # Save career stats
            for stat in career_stats:
                cursor.execute('''
                INSERT OR REPLACE INTO career_stats (
                    player_id, season, team, team_id, games_played, min, pts, reb, ast,
                    stl, blk, fg_pct, fg3_pct, ft_pct, is_total, is_team_total, last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    stat['player_id'],
                    stat['season'],
                    stat['team'],
                    stat.get('team_id', 0),
                    stat['games_played'],
                    stat['min'],
                    stat['pts'],
                    stat['reb'],
                    stat['ast'],
                    stat['stl'],
                    stat['blk'],
                    stat['fg_pct'],
                    stat['fg3_pct'],
                    stat['ft_pct'],
                    stat.get('is_total', False),
                    stat.get('is_team_total', False),
                    datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                ))
            
            conn.commit()
            
            # Save to JSON file as well
            player_data = {
                'bio': bio_data,
                'career_stats': career_stats,
                'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            with open(player_file, 'w') as f:
                json.dump(player_data, f, cls=NumpyEncoder)
        
        return bio_data, career_stats
    
    except Exception as e:
        logger.error(f"Error in fetch_player_data for player {player_id}: {e}")
        return None, []

def process_season_stats(season_stats_df, player_id):
    """Process season stats and calculate career totals"""
    career_stats = []
    
    # Process each season
    for _, season in season_stats_df.iterrows():
        try:
            # Check if the necessary columns exist
            required_cols = ['SEASON_ID', 'TEAM_ABBREVIATION', 'TEAM_ID', 'GP', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG_PCT', 'FG3_PCT', 'FT_PCT']
            for col in required_cols:
                if col not in season_stats_df.columns:
                    logger.warning(f"Missing required column {col} in season stats for player {player_id}")
                    continue
            
            # Sometimes the API returns column names with or without underscores (GP vs G_P)
            gp_value = season.get('GP', season.get('G_P', 0))
            min_value = season.get('MIN', season.get('MIN_GAME', 0))
            pts_value = season.get('PTS', season.get('PTS_GAME', 0))
            reb_value = season.get('REB', season.get('REB_GAME', 0))
            ast_value = season.get('AST', season.get('AST_GAME', 0))
            stl_value = season.get('STL', season.get('STL_GAME', 0))
            blk_value = season.get('BLK', season.get('BLK_GAME', 0))
            
            # Check if we already have per-game stats or need to calculate them
            games_played = int(gp_value) if gp_value else 0
            is_per_game = isinstance(min_value, float) and min_value < 60  # Minutes per game should be < 60
            
            if games_played <= 0:
                games_played = 1  # Prevent division by zero
            
            # Create season data
            season_data = {
                'player_id': int(player_id),
                'season': season['SEASON_ID'],
                'team': season['TEAM_ABBREVIATION'],
                'team_id': season['TEAM_ID'],
                'games_played': games_played,
                'min': float(min_value) if is_per_game else float(min_value) / float(games_played),
                'pts': float(pts_value) if is_per_game else float(pts_value) / float(games_played),
                'reb': float(reb_value) if is_per_game else float(reb_value) / float(games_played),
                'ast': float(ast_value) if is_per_game else float(ast_value) / float(games_played),
                'stl': float(stl_value) if is_per_game else float(stl_value) / float(games_played),
                'blk': float(blk_value) if is_per_game else float(blk_value) / float(games_played),
                'fg_pct': float(season['FG_PCT']) if season['FG_PCT'] else 0,
                'fg3_pct': float(season['FG3_PCT']) if season['FG3_PCT'] else 0,
                'ft_pct': float(season['FT_PCT']) if season['FT_PCT'] else 0,
                'total_games': games_played,
                'total_points': float(pts_value),
                'total_rebounds': float(reb_value),
                'total_assists': float(ast_value),
                'total_steals': float(stl_value),
                'total_blocks': float(blk_value)
            }
            career_stats.append(season_data)
        except Exception as e:
            logger.error(f"Error processing season stats for player {player_id}: {e}")
            continue
    
    # Calculate career totals
    if career_stats:
        total_games = sum(s['total_games'] for s in career_stats)
        career_total = calculate_career_totals(career_stats, total_games, player_id)
        career_stats.append(career_total)
        
        # Calculate team totals
        team_totals = calculate_team_totals(career_stats, player_id)
        career_stats.extend(team_totals)
    
    return career_stats

def calculate_career_totals(career_stats, total_games, player_id):
    """Calculate career totals from season stats"""
    return {
        'player_id': int(player_id),
        'season': 'Career',
        'team': 'TOTAL',
        'games_played': total_games,
        'min': sum(s['total_games'] * s['min'] for s in career_stats) / total_games if total_games > 0 else 0,
        'pts': sum(s['total_points'] for s in career_stats) / total_games if total_games > 0 else 0,
        'reb': sum(s['total_rebounds'] for s in career_stats) / total_games if total_games > 0 else 0,
        'ast': sum(s['total_assists'] for s in career_stats) / total_games if total_games > 0 else 0,
        'stl': sum(s['total_steals'] for s in career_stats) / total_games if total_games > 0 else 0,
        'blk': sum(s['total_blocks'] for s in career_stats) / total_games if total_games > 0 else 0,
        'fg_pct': sum(s['fg_pct'] * s['total_games'] for s in career_stats) / total_games if total_games > 0 else 0,
        'fg3_pct': sum(s['fg3_pct'] * s['total_games'] for s in career_stats) / total_games if total_games > 0 else 0,
        'ft_pct': sum(s['ft_pct'] * s['total_games'] for s in career_stats) / total_games if total_games > 0 else 0,
        'is_total': True
    }

def calculate_team_totals(career_stats, player_id):
    """Calculate totals per team"""
    teams = {}
    team_totals = []
    
    for stat in career_stats:
        if stat['season'] != 'Career':
            team = stat['team']
            if team not in teams:
                teams[team] = {
                    'games': 0,
                    'points': 0,
                    'rebounds': 0,
                    'assists': 0,
                    'steals': 0,
                    'blocks': 0,
                    'minutes': 0,
                    'fg_pct_total': 0,
                    'fg3_pct_total': 0,
                    'ft_pct_total': 0
                }
            teams[team]['games'] += stat['total_games']
            teams[team]['points'] += stat['total_points']
            teams[team]['rebounds'] += stat['total_rebounds']
            teams[team]['assists'] += stat['total_assists']
            teams[team]['steals'] += stat['total_steals']
            teams[team]['blocks'] += stat['total_blocks']
            teams[team]['minutes'] += stat['min'] * stat['total_games']
            teams[team]['fg_pct_total'] += stat['fg_pct'] * stat['total_games']
            teams[team]['fg3_pct_total'] += stat['fg3_pct'] * stat['total_games']
            teams[team]['ft_pct_total'] += stat['ft_pct'] * stat['total_games']
    
    for team, totals in teams.items():
        if totals['games'] > 0:
            team_total = {
                'player_id': int(player_id),
                'season': f'{team} Total',
                'team': team,
                'games_played': totals['games'],
                'min': totals['minutes'] / totals['games'],
                'pts': totals['points'] / totals['games'],
                'reb': totals['rebounds'] / totals['games'],
                'ast': totals['assists'] / totals['games'],
                'stl': totals['steals'] / totals['games'],
                'blk': totals['blocks'] / totals['games'],
                'fg_pct': totals['fg_pct_total'] / totals['games'],
                'fg3_pct': totals['fg3_pct_total'] / totals['games'],
                'ft_pct': totals['ft_pct_total'] / totals['games'],
                'is_team_total': True
            }
            team_totals.append(team_total)
    
    return team_totals

def fetch_player_career_stats(player_id):
    """
    Dedicated function to fetch career stats for a player using multiple methods
    Returns a DataFrame of career stats
    """
    logger.info(f"Fetching career stats for player {player_id}")
    
    # Try multiple methods to get career stats
    methods = [
        # Method 1: Direct API with playercareerstats endpoint
        lambda: playercareerstats.PlayerCareerStats(
            player_id=player_id,
            per_mode36="PerGame",
            timeout=30
        ).get_data_frames()[0],
        
        # Method 2: Direct API with playerprofilev2 endpoint
        lambda: pd.DataFrame([]),  # Placeholder to be implemented
        
        # Method 3: Direct HTTP request to NBA API
        lambda: pd.DataFrame([])   # Placeholder to be implemented
    ]
    
    # Try each method with backoff
    for i, method in enumerate(methods):
        try:
            logger.info(f"Trying method {i+1} to fetch career stats for player {player_id}")
            stats_df = method()
            
            if not stats_df.empty:
                logger.info(f"Successfully fetched career stats for player {player_id} using method {i+1}")
                return stats_df
            
            # Wait before trying next method
            time.sleep(random.uniform(1, 3))
        except Exception as e:
            logger.error(f"Error fetching career stats for player {player_id} using method {i+1}: {e}")
    
    # If all methods fail, return empty DataFrame
    logger.warning(f"All methods failed to fetch career stats for player {player_id}")
    return pd.DataFrame([])

# Function to update the refresh status
def update_api_status(db_path='data/nba_stats.db', action='start', status='success'):
    """Update the API refresh status in the database"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create status table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            status TEXT,
            timestamp TEXT
        )
        ''')
        
        # Insert status update
        cursor.execute('''
        INSERT INTO api_status (action, status, timestamp)
        VALUES (?, ?, ?)
        ''', (action, status, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error updating API status: {e}")

def main():
    """Main function to fetch and save NBA data"""
    try:
        logger.info("Starting NBA data fetch process...")
        
        # Check if we should do a full refresh or just update minimal data
        # Full refresh happens once a day, minimal updates happen more frequently
        last_full_refresh_file = 'data/config/last_full_refresh.txt'
        current_time = datetime.now()
        do_full_refresh = True
        
        if os.path.exists(last_full_refresh_file):
            try:
                with open(last_full_refresh_file, 'r') as f:
                    last_refresh_str = f.read().strip()
                    last_refresh = datetime.strptime(last_refresh_str, '%Y-%m-%d %H:%M:%S')
                    hours_since_refresh = (current_time - last_refresh).total_seconds() / 3600
                    
                    # Only do full refresh if more than 12 hours since last one
                    do_full_refresh = hours_since_refresh >= 12
                    
                    if not do_full_refresh:
                        logger.info(f"Last full refresh was {hours_since_refresh:.1f} hours ago. Doing minimal update.")
            except Exception as e:
                logger.warning(f"Could not parse last full refresh time: {e}")
        
        # Set up the SQLite database with WAL mode for better concurrency
        conn = sqlite3.connect('data/nba_stats.db', timeout=30)
        conn.execute('PRAGMA journal_mode = WAL')
        conn.execute('PRAGMA synchronous = NORMAL')
        conn.execute('PRAGMA cache_size = 10000')
        conn.execute('PRAGMA temp_store = MEMORY')
        
        # Create the database structure
        setup_database()
        
        # Check for live games first (this is always done)
        live_games, has_live_games = check_for_live_games()
        
        # Fetch standings (this is always done)
        logger.info("Fetching league standings...")
        try:
            standings_data = fetch_standings()
            logger.info("✅ Standings data updated successfully")
        except Exception as e:
            logger.error(f"❌ Error fetching standings: {e}")
            standings_data = {'eastern': [], 'western': []}
        
        # Define polling interval based on live games
        polling_interval = 60 if has_live_games else 3600  # 1 minute during live games, 1 hour otherwise
        
        # Save polling configuration
        polling_config = {
            'has_live_games': has_live_games,
            'polling_interval': polling_interval,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open('data/config/polling.json', 'w') as f:
            json.dump(polling_config, f)
        
        # Only fetch team and player data for full refresh
        all_player_stats = {}
        all_team_stats = {}
        
        if do_full_refresh:
            # Get all NBA teams
            nba_teams = teams.get_teams()
            total_teams = len(nba_teams)
            
            logger.info(f"Starting full data refresh for {total_teams} teams...")
            
            # Fetch data for each team
            for idx, team in enumerate(nba_teams):
                try:
                    logger.info(f"[{idx+1}/{total_teams}] Fetching {team['full_name']} data...")
                    player_stats, team_stats = fetch_team_data(team, conn)
                    
                    if player_stats:
                        all_player_stats.update(player_stats)
                        logger.info(f"✅ {team['abbreviation']}: {len(player_stats)} player records processed")
                    else:
                        logger.warning(f"⚠️ No player data found for {team['abbreviation']}")
                    
                    if team_stats:
                        all_team_stats[team['abbreviation']] = team_stats
                        logger.info(f"✅ {team['abbreviation']} team stats updated")
                    else:
                        logger.warning(f"⚠️ No team stats found for {team['abbreviation']}")
                    
                except Exception as e:
                    logger.error(f"❌ Error processing team {team['full_name']}: {e}")
                    continue
            
            # Save all data to pickle files (for backward compatibility)
            with open('data/general/player_data.pkl', 'wb') as f:
                pickle.dump(all_player_stats, f)
            
            with open('data/general/team_data.pkl', 'wb') as f:
                pickle.dump(all_team_stats, f)
            
            # Record the time of full refresh
            with open(last_full_refresh_file, 'w') as f:
                f.write(current_time.strftime('%Y-%m-%d %H:%M:%S'))
            
            logger.info("Full data refresh completed successfully!")
        else:
            # Load existing data from files
            try:
                if os.path.exists('data/general/player_data.pkl'):
                    with open('data/general/player_data.pkl', 'rb') as f:
                        all_player_stats = pickle.load(f)
                
                if os.path.exists('data/general/team_data.pkl'):
                    with open('data/general/team_data.pkl', 'rb') as f:
                        all_team_stats = pickle.load(f)
                        
                logger.info("Loaded existing data files for minimal update")
            except Exception as e:
                logger.error(f"Error loading existing data: {e}")
        
        # Save all data to a single JSON file (using the custom encoder)
        all_data = {
            'players': all_player_stats,
            'teams': all_team_stats,
            'standings': standings_data,
            'live_games': live_games,
            'has_live_games': has_live_games,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open('data/general/nba_data.json', 'w') as f:
            json.dump(all_data, f, cls=NumpyEncoder)
        
        # Save last update time
        with open('data/config/last_update.txt', 'w') as f:
            f.write(datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        # Close database connection
        conn.close()
        
        logger.info("Data fetching process completed successfully!")
        return True
    
    except Exception as e:
        logger.error(f"❌ Critical error in main data fetching process: {e}")
        return False

if __name__ == "__main__":
    main()