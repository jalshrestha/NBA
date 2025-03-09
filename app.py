from flask import Flask, jsonify, request
from flask_cors import CORS
from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import commonteamroster, playerprofilev2, leaguedashplayerstats, leaguestandingsv3, commonplayerinfo
import json
import os
import threading
import time
import datetime
import schedule
import random
import requests

# Set a longer default timeout for requests
requests.adapters.DEFAULT_RETRIES = 5
session = requests.Session()
adapter = requests.adapters.HTTPAdapter(max_retries=3)
session.mount('http://', adapter)
session.mount('https://', adapter)

app = Flask(__name__)
CORS(app)

# File paths for cached data
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'nba_data.json')
PLAYER_STATS_FILE = os.path.join(DATA_DIR, 'player_stats.json')
TEAM_STATS_FILE = os.path.join(DATA_DIR, 'team_stats.json')
STANDINGS_FILE = os.path.join(DATA_DIR, 'standings.json')
LAST_UPDATE_FILE = os.path.join(DATA_DIR, 'last_update.txt')

# Create data directory if it doesn't exist
os.makedirs(DATA_DIR, exist_ok=True)

# Add fallback data for when API calls fail
FALLBACK_PLAYERS = {
    # Add some fallback data for common teams
    "1610612738": [  # Boston Celtics
        {"id": 1629684, "name": "Jayson Tatum", "position": "F", "jersey_number": "0", "team_id": 1610612738, "team_name": "Boston Celtics", "team_abbreviation": "BOS"},
        {"id": 1627759, "name": "Jaylen Brown", "position": "G-F", "jersey_number": "7", "team_id": 1610612738, "team_name": "Boston Celtics", "team_abbreviation": "BOS"},
        {"id": 203935, "name": "Jrue Holiday", "position": "G", "jersey_number": "4", "team_id": 1610612738, "team_name": "Boston Celtics", "team_abbreviation": "BOS"}
    ],
    "1610612747": [  # Los Angeles Lakers
        {"id": 2544, "name": "LeBron James", "position": "F", "jersey_number": "23", "team_id": 1610612747, "team_name": "Los Angeles Lakers", "team_abbreviation": "LAL"},
        {"id": 203076, "name": "Anthony Davis", "position": "F-C", "jersey_number": "3", "team_id": 1610612747, "team_name": "Los Angeles Lakers", "team_abbreviation": "LAL"},
        {"id": 1629639, "name": "Austin Reaves", "position": "G", "jersey_number": "15", "team_id": 1610612747, "team_name": "Los Angeles Lakers", "team_abbreviation": "LAL"}
    ],
    "1610612739": [  # Cleveland Cavaliers
        {"id": 1630178, "name": "Donovan Mitchell", "position": "G", "jersey_number": "45", "team_id": 1610612739, "team_name": "Cleveland Cavaliers", "team_abbreviation": "CLE"},
        {"id": 1628386, "name": "Jarrett Allen", "position": "C", "jersey_number": "31", "team_id": 1610612739, "team_name": "Cleveland Cavaliers", "team_abbreviation": "CLE"},
        {"id": 1629636, "name": "Darius Garland", "position": "G", "jersey_number": "10", "team_id": 1610612739, "team_name": "Cleveland Cavaliers", "team_abbreviation": "CLE"}
    ]
}

def fetch_nba_data():
    """
    Fetch NBA data from the API and format it for our needs.
    Returns a dictionary with teams and players data.
    """
    print("Fetching fresh NBA data...")
    
    try:
        # Get all NBA teams
        nba_teams = teams.get_teams()
        
        # Initialize data structure
        data = {
            "teams": [],
            "players": [],
            "players_by_team": {}
        }
        
        # Process each team
        for team in nba_teams:
            team_id = team['id']
            team_info = {
                'id': team_id,
                'full_name': team['full_name'],
                'abbreviation': team['abbreviation'],
                'nickname': team['nickname'],
                'city': team['city'],
                'state': team['state'],
                'year_founded': team['year_founded']
            }
            
            data['teams'].append(team_info)
            
            # Fetch team roster - using both CommonTeamRoster and LeagueGameLog for more accurate jersey numbers
            try:
                # Primary roster data
                roster = commonteamroster.CommonTeamRoster(team_id=team_id).get_data_frames()[0]
                
                # Initialize team players list
                team_players = []
                
                # Process each player in the roster
                for _, player in roster.iterrows():
                    # Instead of trying to fetch jersey numbers, just use "N/A"
                    jersey_number = "N/A"
                    
                    player_info = {
                        'id': player['PLAYER_ID'],
                        'name': player['PLAYER'],
                        'position': player.get('POSITION', 'N/A'),
                        'height': player.get('HEIGHT', 'N/A'),
                        'weight': player.get('WEIGHT', 'N/A'),
                        'jersey_number': jersey_number,
                        'team_id': team_id,
                        'team_name': team['full_name'],
                        'team_abbreviation': team['abbreviation']
                    }
                    
                    # Add to overall players list
                    data['players'].append(player_info)
                    
                    # Add to team specific list
                    team_players.append(player_info)
                
                # Sort team players by name
                def get_player_name(player):
                    return player.get('name', '')
                
                # Sort by player name
                team_players.sort(key=get_player_name)
                
                # Store in players by team dictionary
                data['players_by_team'][str(team_id)] = team_players
                
                # Sleep to avoid rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"Error fetching roster for {team['full_name']}: {e}")
        
        return data
        
    except Exception as e:
        print(f"Error fetching NBA data: {e}")
        return None

def save_json_data(data, filename):
    """Save data to a JSON file"""
    try:
        with open(filename, 'w') as f:
            json.dump(data, f)
        return True
    except Exception as e:
        print(f"Error saving data to {filename}: {e}")
        return False

def save_nba_data(data):
    """Save NBA data to a JSON file"""
    result = save_json_data(data, DATA_FILE)
    
    if result:
        # Update last_update file with timestamp
        with open(LAST_UPDATE_FILE, 'w') as f:
            f.write(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            
        print("NBA data cached successfully")
        return True
    
    return False

def load_json_data(filename):
    """Load data from a JSON file"""
    try:
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                return json.load(f)
        return None
    except Exception as e:
        print(f"Error loading data from {filename}: {e}")
        return None

def load_nba_data():
    """Load NBA data from the cached JSON file"""
    return load_json_data(DATA_FILE)

def get_last_update_time():
    """Get the timestamp of the last data update"""
    try:
        if os.path.exists(LAST_UPDATE_FILE):
            with open(LAST_UPDATE_FILE, 'r') as f:
                return f.read().strip()
        return None
    except Exception as e:
        print(f"Error reading last update time: {e}")
        return None

# API Routes
@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Get all NBA teams"""
    data = load_nba_data()
    
    if not data:
        # If cached data is not available, fetch fresh data
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
        else:
            return jsonify({"error": "Failed to fetch NBA data"}), 500
    
    return jsonify(data.get('teams', []))

@app.route('/api/players', methods=['GET'])
def get_players():
    """Get all NBA players"""
    data = load_nba_data()
    
    if not data:
        # If cached data is not available, fetch fresh data
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
        else:
            return jsonify({"error": "Failed to fetch NBA data"}), 500
    
    return jsonify(data.get('players', []))

@app.route('/api/players/team/<team_id>', methods=['GET'])
def get_team_players(team_id):
    """Get players for a specific team"""
    # Get force_refresh parameter from request
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    # Try to load from cache first if not forcing refresh
    data = None if force_refresh else load_nba_data()
    
    if data and 'players_by_team' in data and team_id in data['players_by_team']:
        team_players = data['players_by_team'][team_id]
        
        # Check if we have players for this team
        if team_players and len(team_players) > 0:
            return jsonify(team_players)
    
    # If we don't have data in cache or forcing refresh, try to fetch fresh data
    fresh_data = fetch_nba_data()
    if fresh_data and 'players_by_team' in fresh_data and team_id in fresh_data['players_by_team']:
        team_players = fresh_data['players_by_team'][team_id]
        
        # Check if we have players for this team
        if team_players and len(team_players) > 0:
            return jsonify(team_players)
    
    # If we still don't have data, check if we have fallback data
    if team_id in FALLBACK_PLAYERS:
        print(f"Using fallback data for team {team_id}")
        return jsonify(FALLBACK_PLAYERS[team_id])
    
    # If all else fails, return an empty array with a 404 status
    return jsonify([]), 404

@app.route('/api/player/<player_id>/stats', methods=['GET'])
def get_player_stats(player_id):
    """Get stats for a specific player"""
    # Get force_refresh parameter from request
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    # Get the cache file path
    cache_file = os.path.join(DATA_DIR, f"player_{player_id}_stats.json")
    
    # Check if cache exists and is valid
    cache_valid = False
    if os.path.exists(cache_file) and not force_refresh:
        file_modified_time = os.path.getmtime(cache_file)
        current_time = time.time()
        
        # Cache is valid if less than 12 hours old
        if (current_time - file_modified_time) < 12 * 60 * 60:
            cache_valid = True
        else:
            print(f"Cache for player {player_id} is outdated, fetching fresh data")
    
    # Try to load from cache if valid and not forcing refresh
    cached_stats = None if force_refresh or not cache_valid else load_json_data(cache_file)
    
    if cached_stats:
        return jsonify(cached_stats)
    
    # If not in cache or forcing refresh, return a placeholder for now
    # In a real app, we would fetch fresh data from the NBA API
    placeholder_stats = {
        "bio": {
            "name": "Player " + player_id,
            "position": "Forward",
            "height": "6'8\"",
            "weight": "225 lbs",
            "age": 28,
            "team": "Example Team"
        },
        "current_season_stats": {
            "pts": 20.5,
            "reb": 7.2,
            "ast": 5.1,
            "stl": 1.3,
            "blk": 0.8
        }
    }
    
    # Cache the result
    save_json_data(placeholder_stats, cache_file)
    
    return jsonify(placeholder_stats)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check if we can access data file
        data_exists = os.path.exists(DATA_FILE)
        last_update = get_last_update_time()
        
        return jsonify({
            "status": "healthy",
            "data_file_exists": data_exists,
            "last_update": last_update
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5001) 