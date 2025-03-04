from flask import Flask, jsonify
from flask_cors import CORS
from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import commonteamroster, playerprofilev2, leaguedashplayerstats, leaguestandingsv3
import json
import os
import threading
import time
import datetime
import schedule
import random

app = Flask(__name__)
CORS(app)

# File paths for cached data
DATA_FILE = 'nba_data.json'
PLAYER_STATS_FILE = 'player_stats.json'
TEAM_STATS_FILE = 'team_stats.json'
STANDINGS_FILE = 'standings.json'
LAST_UPDATE_FILE = 'last_update.txt'

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
            
            # Fetch team roster
            try:
                roster = commonteamroster.CommonTeamRoster(team_id=team_id).get_data_frames()[0]
                
                # Initialize team players list
                team_players = []
                
                # Process each player in the roster
                for _, player in roster.iterrows():
                    # Some APIs don't provide jersey numbers consistently, so we'll mock if missing
                    jersey_number = player.get('JERSEY', None)
                    if jersey_number is None or jersey_number == '':
                        jersey_number = random.randint(0, 99)  # Mock jersey number
                    
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
                
                # Sort team players by jersey number
                team_players.sort(key=lambda x: int(x['jersey_number']) if isinstance(x['jersey_number'], (int, str)) and str(x['jersey_number']).isdigit() else 999)
                
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

def fetch_player_stats(player_id):
    """
    Fetch detailed stats for a specific player
    """
    try:
        # Get player profile and stats
        player_profile = playerprofilev2.PlayerProfileV2(player_id=player_id)
        
        # Get regular season stats
        regular_season = player_profile.get_dict()['resultSets'][0]
        regular_season_headers = regular_season['headers']
        regular_season_data = regular_season['rowSet']
        
        # Convert to list of dictionaries
        regular_season_stats = []
        for row in regular_season_data:
            raw_stats = dict(zip(regular_season_headers, row))
            
            # Map the stats to our frontend format
            season_stats = {
                "season": raw_stats.get('SEASON_ID', ''),
                "team": raw_stats.get('TEAM_ABBREVIATION', ''),
                "games_played": raw_stats.get('GP', 0),
                "games_started": raw_stats.get('GS', 0),
                "min": float(raw_stats.get('MIN', 0)),
                "pts": float(raw_stats.get('PTS', 0)),
                "reb": float(raw_stats.get('REB', 0)),
                "ast": float(raw_stats.get('AST', 0)),
                "stl": float(raw_stats.get('STL', 0)),
                "blk": float(raw_stats.get('BLK', 0)),
                "turnover": float(raw_stats.get('TOV', 0)),
                "fg_pct": float(raw_stats.get('FG_PCT', 0)),
                "fg3_pct": float(raw_stats.get('FG3_PCT', 0)),
                "ft_pct": float(raw_stats.get('FT_PCT', 0)),
                "off_rating": float(raw_stats.get('OFF_RATING', 0)),
                "def_rating": float(raw_stats.get('DEF_RATING', 0))
            }
            regular_season_stats.append(season_stats)
        
        # Current season stats (most recent season)
        current_season_stats = regular_season_stats[0] if regular_season_stats else {}
        
        # Compile player data
        player_data = {
            "current_season_stats": current_season_stats,
            "career_stats": regular_season_stats[1:] if len(regular_season_stats) > 1 else []
        }
        
        return player_data
        
    except Exception as e:
        print(f"Error fetching stats for player {player_id}: {e}")
        return None

def fetch_standings():
    """
    Fetch current NBA standings
    """
    try:
        # Get league standings
        standings = leaguestandingsv3.LeagueStandingsV3(season="2023-24")
        standings_df = standings.get_dict()['resultSets'][0]['rowSet']
        columns = standings.get_dict()['resultSets'][0]['headers']
        
        # Process standings data
        eastern_conf = []
        western_conf = []
        
        for team_data in standings_df:
            team_dict = dict(zip(columns, team_data))
            team_info = {
                "id": team_dict['TeamID'],
                "teamName": f"{team_dict['TeamCity']} {team_dict['TeamName']}",
                "conference": team_dict['Conference'],
                "wins": int(team_dict['WINS']),
                "losses": int(team_dict['LOSSES']),
                "winPct": float(team_dict['WinPCT']),
                "gb": team_dict.get('GamesBehind', '0'),
                "confRank": int(team_dict.get('PlayoffRank', 0)),
                "homeRecord": team_dict.get('HOME', 'N/A'),
                "roadRecord": team_dict.get('ROAD', 'N/A')
            }
            
            if team_dict['Conference'] == 'East':
                eastern_conf.append(team_info)
            else:
                western_conf.append(team_info)
        
        # Sort by conference rank
        eastern_conf.sort(key=lambda x: x['confRank'])
        western_conf.sort(key=lambda x: x['confRank'])
        
        return {
            "eastern": eastern_conf,
            "western": western_conf
        }
        
    except Exception as e:
        print(f"Error fetching standings: {e}")
        return None

def fetch_all_player_stats():
    """
    Fetch current season stats for all players
    """
    try:
        # Get league dashboard stats for current season
        league_stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season="2023-24",
            per_mode_detailed="PerGame",
            measure_type_detailed_defense="Base"
        )
        
        stats_df = league_stats.league_dash_player_stats.get_data_frames()[0]
        
        # Convert to dictionary with player ID as keys
        player_stats_dict = {}
        
        for _, player in stats_df.iterrows():
            player_id = str(player['PLAYER_ID'])
            player_stats_dict[player_id] = player.to_dict()
        
        return player_stats_dict
    
    except Exception as e:
        print(f"Error fetching all player stats: {e}")
        return {}

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

def should_update_data():
    """Check if data should be updated based on last update time"""
    last_update = get_last_update_time()
    
    # If no last update or data file doesn't exist, update needed
    if last_update is None or not os.path.exists(DATA_FILE):
        return True
    
    try:
        # Parse last update time
        last_update_dt = datetime.datetime.strptime(last_update, "%Y-%m-%d %H:%M:%S")
        current_dt = datetime.datetime.now()
        
        # Check if it's been more than 24 hours since last update
        diff = current_dt - last_update_dt
        return diff.days >= 1  # Update if at least 1 day has passed
    except Exception as e:
        print(f"Error checking update time: {e}")
        return True  # Update on error

def update_data_job():
    """Job to update NBA data"""
    if should_update_data():
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
            
        # Update standings
        standings = fetch_standings()
        if standings:
            save_json_data(standings, STANDINGS_FILE)
            
        # Update overall player stats
        player_stats = fetch_all_player_stats()
        if player_stats:
            save_json_data(player_stats, PLAYER_STATS_FILE)

def start_scheduler():
    """Start the scheduler for daily updates"""
    # Schedule to run at midnight
    schedule.every().day.at("00:00").do(update_data_job)
    
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    # Run in a separate thread to not block the app
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True
    scheduler_thread.start()

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
    data = load_nba_data()
    
    if not data:
        # If cached data is not available, fetch fresh data
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
        else:
            return jsonify({"error": "Failed to fetch NBA data"}), 500
    
    # Get players for the specified team, return empty list if team not found
    team_players = data.get('players_by_team', {}).get(str(team_id), [])
    return jsonify(team_players)

@app.route('/api/player/<player_id>/stats', methods=['GET'])
def get_player_stats(player_id):
    """Get stats for a specific player"""
    # Try to load from cache first
    cached_stats = load_json_data(f"player_{player_id}_stats.json")
    
    if cached_stats:
        return jsonify(cached_stats)
    
    # If not in cache, fetch fresh data
    player_stats = fetch_player_stats(player_id)
    
    if not player_stats:
        return jsonify({"error": "Failed to fetch player stats"}), 500
    
    # Cache the result
    save_json_data(player_stats, f"player_{player_id}_stats.json")
    
    return jsonify(player_stats)

@app.route('/api/standings', methods=['GET'])
def get_standings():
    """Get current NBA standings"""
    # Try to load from cache first
    standings = load_json_data(STANDINGS_FILE)
    
    if not standings:
        # If not in cache, fetch fresh data
        standings = fetch_standings()
        if standings:
            save_json_data(standings, STANDINGS_FILE)
        else:
            return jsonify({"error": "Failed to fetch standings"}), 500
    
    return jsonify(standings)

if __name__ == '__main__':
    # Initial data check and update if needed
    update_data_job()
    
    # Start scheduler for daily updates
    start_scheduler()
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5001) 