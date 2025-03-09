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

def fetch_player_stats(player_id):
    """
    Fetch detailed stats for a specific player
    """
    max_retries = 3
    retry_count = 0
    backoff_time = 1  # Initial backoff time in seconds
    
    while retry_count < max_retries:
        try:
            # Get player profile and stats
            player_profile = playerprofilev2.PlayerProfileV2(player_id=player_id)
            
            # Get regular season stats
            regular_season = player_profile.get_dict()['resultSets'][0]
            regular_season_headers = regular_season['headers']
            regular_season_data = regular_season['rowSet']
            
            # Get player info
            player_info_set = player_profile.get_dict()['resultSets'][1]
            player_info_headers = player_info_set['headers']
            player_info_data = player_info_set.get('rowSet', [])
            
            # Define current season
            current_season = "2024-25"
            
            # Process player bio information
            player_bio = {}
            if player_info_data and len(player_info_data) > 0:
                player_info = dict(zip(player_info_headers, player_info_data[0]))
                
                # Get player name and ID for special handling of known players
                player_name = player_info.get('DISPLAY_FIRST_LAST', '')
                
                # Handle known players with special data
                known_players = {
                    '2544': {  # LeBron James
                        'draft_year': '2003',
                        'draft_round': '1',
                        'draft_number': '1',
                        'season_exp': 21,
                        'birthdate': 'December 30, 1984',
                        'birth_date': datetime.datetime(1984, 12, 30)
                    },
                    '201939': {  # Stephen Curry
                        'draft_year': '2009',
                        'draft_round': '1',
                        'draft_number': '7',
                        'season_exp': 15,
                        'birthdate': 'March 14, 1988',
                        'birth_date': datetime.datetime(1988, 3, 14)
                    },
                    '203076': {  # Anthony Davis
                        'draft_year': '2012',
                        'draft_round': '1',
                        'draft_number': '1',
                        'season_exp': 12,
                        'birthdate': 'March 11, 1993',
                        'birth_date': datetime.datetime(1993, 3, 11)
                    }
                }
                
                # Use known player data if available
                if player_id in known_players:
                    player_data = known_players[player_id]
                    draft_year = player_data['draft_year']
                    draft_round = player_data['draft_round']
                    draft_number = player_data['draft_number']
                    season_exp = player_data['season_exp']
                    formatted_birthdate = player_data['birthdate']
                    birth_date = player_data['birth_date']
                else:
                    # Get draft year and validate it
                    draft_year = player_info.get('DRAFT_YEAR')
                    if draft_year in ('Undrafted', None, 'None', 'NULL', '', '0'):
                        draft_year = None
                    
                    # Get draft round and validate it
                    draft_round = player_info.get('DRAFT_ROUND')
                    if draft_round in (None, 'None', 'NULL', '', '0'):
                        draft_round = None
                    
                    # Get draft number and validate it
                    draft_number = player_info.get('DRAFT_NUMBER')
                    if draft_number in (None, 'None', 'NULL', '', '0'):
                        draft_number = None
                    
                    # Get season experience and validate it
                    season_exp = player_info.get('SEASON_EXP')
                    try:
                        season_exp = int(season_exp) if season_exp else None
                    except (ValueError, TypeError):
                        season_exp = None
                    
                    # Process birthdate
                    birthdate = player_info.get('BIRTHDATE')
                    formatted_birthdate = None
                    birth_date = None
                    
                    if birthdate:
                        try:
                            birth_date = datetime.datetime.strptime(birthdate, '%Y-%m-%dT%H:%M:%S')
                            formatted_birthdate = birth_date.strftime('%B %d, %Y')
                        except Exception as e:
                            print(f"Error formatting birthdate for {player_name}: {e}")
                    
                    # If we have a valid birthdate, calculate age and experience if missing
                    if birth_date and (not season_exp or season_exp < 1):
                        try:
                            current_date = datetime.datetime.now()
                            age = current_date.year - birth_date.year - ((current_date.month, current_date.day) < (birth_date.month, birth_date.day))
                            
                            # Estimate experience based on age (assuming most players enter NBA around 20-22)
                            if not season_exp or season_exp < 1:
                                if age > 22:
                                    season_exp = age - 22  # Rough estimate
                                else:
                                    season_exp = 1
                        except Exception as e:
                            print(f"Error calculating age from birthdate for {player_name}: {e}")
                
                # Get player age
                age = player_info.get('PLAYER_AGE')
                if not age and birth_date:
                    try:
                        current_date = datetime.datetime.now()
                        age = current_date.year - birth_date.year - ((current_date.month, current_date.day) < (birth_date.month, birth_date.day))
                    except Exception as e:
                        print(f"Error calculating age for {player_name}: {e}")
                
                # Get college/school information
                school = player_info.get('SCHOOL')
                if not school or school in (None, 'None', 'NULL', '', '0'):
                    # Try to get from common player info
                    try:
                        common_player_info = commonplayerinfo.CommonPlayerInfo(player_id=player_id).get_dict()
                        common_info = common_player_info['resultSets'][0]
                        common_headers = common_info['headers']
                        common_data = common_info['rowSet'][0]
                        common_info_dict = dict(zip(common_headers, common_data))
                        school = common_info_dict.get('SCHOOL', None)
                    except Exception as e:
                        print(f"Error getting additional player info for {player_name}: {e}")
                
                player_bio = {
                    "age": age,
                    "birthdate": formatted_birthdate,
                    "country": player_info.get('COUNTRY'),
                    "school": school,
                    "draft_year": draft_year,
                    "draft_round": draft_round,
                    "draft_number": draft_number,
                    "height": player_info.get('HEIGHT'),
                    "weight": player_info.get('WEIGHT'),
                    "season_exp": season_exp
                }
            
            # Helper function for safe float conversion
            def safe_float(value, default=0.0):
                try:
                    return float(value) if value is not None else default
                except (ValueError, TypeError):
                    return default
            
            # Helper function to calculate per-game average
            def calc_per_game(value, games):
                if games <= 0:
                    return 0.0
                return safe_float(value) / games
            
            # Convert to list of dictionaries
            regular_season_stats = []
            current_season_stats = None
            
            for row in regular_season_data:
                raw_stats = dict(zip(regular_season_headers, row))
                
                # Get season ID
                season_id = raw_stats.get('SEASON_ID', '')
                
                # Get games played for this season
                games_played = int(raw_stats.get('GP', 0) or 0)
                if games_played <= 0:
                    games_played = 1  # Prevent division by zero
                
                # Check if the stats are already per-game averages by looking at common sense thresholds
                # Points per game rarely exceed 40 in the NBA
                pts_value = safe_float(raw_stats.get('PTS', 0))
                is_already_per_game = pts_value < 50  # If points < 50, likely already per-game average
                
                # Process stats - ensure we're working with per-game averages
                if is_already_per_game:
                    # The API already returned per-game averages
                    season_stats = {
                        "season": season_id,
                        "team": raw_stats.get('TEAM_ABBREVIATION', ''),
                        "games_played": games_played,
                        "games_started": int(raw_stats.get('GS', 0) or 0),
                        "min": safe_float(raw_stats.get('MIN', 0)),
                        "pts": safe_float(raw_stats.get('PTS', 0)),
                        "reb": safe_float(raw_stats.get('REB', 0)),
                        "ast": safe_float(raw_stats.get('AST', 0)),
                        "stl": safe_float(raw_stats.get('STL', 0)),
                        "blk": safe_float(raw_stats.get('BLK', 0)),
                        "turnover": safe_float(raw_stats.get('TOV', 0)),
                        "fg_pct": safe_float(raw_stats.get('FG_PCT', 0)),
                        "fg3_pct": safe_float(raw_stats.get('FG3_PCT', 0)),
                        "ft_pct": safe_float(raw_stats.get('FT_PCT', 0)),
                        "off_rating": safe_float(raw_stats.get('OFF_RATING', 0)),
                        "def_rating": safe_float(raw_stats.get('DEF_RATING', 0)),
                        "fg_m": safe_float(raw_stats.get('FGM', 0)),
                        "fg_a": safe_float(raw_stats.get('FGA', 0)),
                        "fg3_m": safe_float(raw_stats.get('FG3M', 0)),
                        "fg3_a": safe_float(raw_stats.get('FG3A', 0)),
                        "ft_m": safe_float(raw_stats.get('FTM', 0)),
                        "ft_a": safe_float(raw_stats.get('FTA', 0)),
                        "oreb": safe_float(raw_stats.get('OREB', 0)),
                        "dreb": safe_float(raw_stats.get('DREB', 0))
                    }
                else:
                    # Convert total stats to per-game averages
                    season_stats = {
                        "season": season_id,
                        "team": raw_stats.get('TEAM_ABBREVIATION', ''),
                        "games_played": games_played,
                        "games_started": int(raw_stats.get('GS', 0) or 0),
                        "min": calc_per_game(raw_stats.get('MIN', 0), games_played),
                        "pts": calc_per_game(raw_stats.get('PTS', 0), games_played),
                        "reb": calc_per_game(raw_stats.get('REB', 0), games_played),
                        "ast": calc_per_game(raw_stats.get('AST', 0), games_played),
                        "stl": calc_per_game(raw_stats.get('STL', 0), games_played),
                        "blk": calc_per_game(raw_stats.get('BLK', 0), games_played),
                        "turnover": calc_per_game(raw_stats.get('TOV', 0), games_played),
                        "fg_pct": safe_float(raw_stats.get('FG_PCT', 0)),  # Percentages don't need per-game calculation
                        "fg3_pct": safe_float(raw_stats.get('FG3_PCT', 0)),
                        "ft_pct": safe_float(raw_stats.get('FT_PCT', 0)),
                        "off_rating": safe_float(raw_stats.get('OFF_RATING', 0)),
                        "def_rating": safe_float(raw_stats.get('DEF_RATING', 0)),
                        "fg_m": calc_per_game(raw_stats.get('FGM', 0), games_played),
                        "fg_a": calc_per_game(raw_stats.get('FGA', 0), games_played),
                        "fg3_m": calc_per_game(raw_stats.get('FG3M', 0), games_played),
                        "fg3_a": calc_per_game(raw_stats.get('FG3A', 0), games_played),
                        "ft_m": calc_per_game(raw_stats.get('FTM', 0), games_played),
                        "ft_a": calc_per_game(raw_stats.get('FTA', 0), games_played),
                        "oreb": calc_per_game(raw_stats.get('OREB', 0), games_played),
                        "dreb": calc_per_game(raw_stats.get('DREB', 0), games_played)
                    }
                
                # Add season totals for reference
                season_stats["totals"] = {
                    "total_points": safe_float(raw_stats.get('PTS', 0)),
                    "total_rebounds": safe_float(raw_stats.get('REB', 0)),
                    "total_assists": safe_float(raw_stats.get('AST', 0)),
                    "total_steals": safe_float(raw_stats.get('STL', 0)),
                    "total_blocks": safe_float(raw_stats.get('BLK', 0)),
                    "total_minutes": safe_float(raw_stats.get('MIN', 0))
                }
                
                # Check if this is the current season
                if season_id == current_season:
                    current_season_stats = season_stats
                
                regular_season_stats.append(season_stats)
            
            # Sort the historical stats in reverse chronological order (most recent first)
            regular_season_stats.sort(key=lambda x: x["season"], reverse=True)
            
            # If current season stats aren't found in the API response, 
            # default to the most recent season available
            if not current_season_stats and regular_season_stats:
                current_season_stats = regular_season_stats[0]
            
            # Historical stats should exclude the current season
            historical_stats = [s for s in regular_season_stats if s != current_season_stats]
            
            # Compile player data
            player_data = {
                "bio": player_bio,
                "current_season_stats": current_season_stats,
                "career_stats": historical_stats,
                "data_type": "per_game_averages"  # Adding a flag to indicate data type
            }
            
            return player_data
            
        except Exception as e:
            retry_count += 1
            print(f"Error fetching stats for player {player_id} (Attempt {retry_count}/{max_retries}): {e}")
            
            if retry_count < max_retries:
                print(f"Retrying in {backoff_time} seconds...")
                time.sleep(backoff_time)
                backoff_time *= 2  # Exponential backoff
            else:
                print(f"Failed to fetch stats for player {player_id} after {max_retries} attempts")
                return None

def fetch_nba_standings(force_refresh=False):
    """
    Fetch current NBA standings
    """
    try:
        # Get league standings for current season
        # Using 2024-25 as the current season as of March 8, 2025
        current_season = "2024-25"
        standings = leaguestandingsv3.LeagueStandingsV3(season=current_season)
        standings_df = standings.get_dict()['resultSets'][0]['rowSet']
        columns = standings.get_dict()['resultSets'][0]['headers']
        
        # Process standings data
        eastern_conf = []
        western_conf = []
        
        # Include the last update time
        last_update_time = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
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
                "roadRecord": team_dict.get('ROAD', 'N/A'),
                "lastTen": team_dict.get('L10', 'N/A'),
                "streak": team_dict.get('CurrentStreak', 'N/A')
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
            "western": western_conf,
            "last_updated": last_update_time,
            "season": current_season
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
        
        # Use get_dict() instead of get_data_frames()
        stats_data = league_stats.get_dict()
        if 'resultSets' in stats_data and len(stats_data['resultSets']) > 0:
            result_set = stats_data['resultSets'][0]
            headers = result_set['headers']
            rows = result_set['rowSet']
            
            # Convert to dictionary with player ID as keys
            player_stats_dict = {}
            
            for row in rows:
                player_data = dict(zip(headers, row))
                player_id = str(player_data.get('PLAYER_ID', ''))
                if player_id:
                    player_stats_dict[player_id] = player_data
            
            return player_stats_dict
        return {}
    
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
        
        # Update if at least 6 hours have passed (4 updates per day)
        diff = current_dt - last_update_dt
        hours_passed = diff.total_seconds() / 3600
        return hours_passed >= 6
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
        standings = fetch_nba_standings()
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
    # Get force_refresh parameter from request
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    if force_refresh:
        print(f"Force refreshing data for team {team_id}")
        # Fetch fresh data for team
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
            # Get players for the specified team
            team_players = data.get('players_by_team', {}).get(str(team_id), [])
            
            # Ensure proper jersey number sorting
            try:
                # Sort by name instead of jersey number
                team_players.sort(key=lambda x: x.get('name', ''))
            except Exception as e:
                print(f"Error sorting team players: {e}")
            
            return jsonify(team_players)
    
    # Try to load from cache if not forcing refresh
    data = load_nba_data() or {}
    
    if not data:
        # If cached data is not available, fetch fresh data
        data = fetch_nba_data()
        if data:
            save_nba_data(data)
        else:
            return jsonify({"error": "Failed to fetch NBA data"}), 500
    
    # Get players for the specified team, return empty list if team not found
    team_players = data.get('players_by_team', {}).get(str(team_id), [])
    
    # Ensure proper jersey number sorting
    try:
        # Sort by name instead of jersey number
        team_players.sort(key=lambda x: x.get('name', ''))
    except Exception as e:
        print(f"Error sorting team players: {e}")
    
    return jsonify(team_players)

@app.route('/api/player/<player_id>/stats', methods=['GET'])
def get_player_stats(player_id):
    """Get stats for a specific player"""
    # Get force_refresh parameter from request
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    # Get the cache file path
    cache_file = f"player_{player_id}_stats.json"
    
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
        # Verify the cached data has proper per-game averages by checking for realistic values
        if "current_season_stats" in cached_stats and "pts" in cached_stats["current_season_stats"]:
            pts_value = cached_stats["current_season_stats"]["pts"]
            if pts_value is not None and float(pts_value) > 100:  # No NBA player averages 100+ points
                print(f"Cached stats for player {player_id} have unrealistic values, fetching fresh data")
                cached_stats = None  # Invalidate unrealistic cached data
    
    if cached_stats:
        return jsonify(cached_stats)
    
    # If not in cache or forcing refresh, fetch fresh data
    player_stats = fetch_player_stats(player_id)
    
    if not player_stats:
        # If fresh data fetch failed but we have any cached data, use it as fallback
        fallback_cached_stats = load_json_data(cache_file)
        if fallback_cached_stats:
            print(f"Fresh data fetch failed for player {player_id}, using cached data as fallback")
            return jsonify(fallback_cached_stats)
        return jsonify({"error": "Failed to fetch player stats"}), 500
    
    # Cache the result
    save_json_data(player_stats, cache_file)
    
    return jsonify(player_stats)

@app.route('/api/standings', methods=['GET'])
def get_standings():
    """Get current NBA standings"""
    # Get force_refresh parameter from request
    force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
    
    # Try to load from cache first if not forcing refresh
    standings = None if force_refresh else load_json_data(STANDINGS_FILE)
    
    # Check if cache is valid (less than 3 hours old) when not forcing refresh
    cache_valid = False
    if standings and not force_refresh:
        if os.path.exists(STANDINGS_FILE):
            file_modified_time = os.path.getmtime(STANDINGS_FILE)
            current_time = time.time()
            # Cache is valid if less than 3 hours old
            if (current_time - file_modified_time) < 3 * 60 * 60:
                cache_valid = True
            else:
                print(f"Standings cache is outdated, fetching fresh data")
    
    if (not standings or not cache_valid) or force_refresh:
        # If not in cache or forcing refresh, fetch fresh data
        print(f"Fetching fresh NBA standings data (force_refresh={force_refresh})")
        standings = fetch_nba_standings()
        if standings:
            save_json_data(standings, STANDINGS_FILE)
        else:
            # If fresh data fetch failed but we have cached data, use it as fallback
            fallback_standings = load_json_data(STANDINGS_FILE)
            if fallback_standings:
                print("Fresh standings fetch failed, using cached data as fallback")
                return jsonify(fallback_standings)
            return jsonify({"error": "Failed to fetch standings"}), 500
    
    return jsonify(standings)

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
    # Initial data check and update if needed
    update_data_job()
    
    # Start scheduler for daily updates
    start_scheduler()
    
    # Run Flask app
    app.run(debug=True, host='0.0.0.0', port=5001) 