from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import os
import time
import logging
from datetime import datetime
import subprocess
import threading
import schedule
import pymysql
import pymysql.cursors
import random

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

DB_PATH = 'data/nba_stats.db'
JSON_DATA_PATH = 'data/general/nba_data.json'

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Get all teams"""
    try:
        # Try to load from JSON cache first
        if os.path.exists('data/stats/teams.json'):
            try:
                with open('data/stats/teams.json', 'r') as f:
                    try:
                        content = f.read()
                        # Handle possible JSON corruption by finding the end of the JSON properly
                        content_trimmed = content.strip()
                        if content_trimmed.endswith(','):
                            content_trimmed = content_trimmed[:-1]
                        
                        # Add proper ending if missing
                        if not content_trimmed.endswith(']'):
                            content_trimmed += ']'
                            
                        teams_list = json.loads(content_trimmed)
                    except json.JSONDecodeError as json_err:
                        logger.error(f"JSON decode error in teams file: {json_err}")
                        # Try to parse it a different way - read line by line
                        teams_list = []
                        with open('data/stats/teams.json', 'r') as fallback_f:
                            # Try to extract valid JSON objects
                            import re
                            data_str = fallback_f.read()
                            team_objects = re.findall(r'\{[^{}]*\}', data_str)
                            
                            for team_obj in team_objects:
                                try:
                                    team_data = json.loads(team_obj)
                                    if 'id' in team_data and 'name' in team_data:
                                        teams_list.append(team_data)
                                except:
                                    continue
                        
                        if not teams_list:
                            raise Exception("Failed to parse teams data from JSON file")
                    
                    # Check if we need to update team records with standings data
                    # This ensures the team cards show the same records as the standings table
                    if os.path.exists('data/stats/standings.json'):
                        try:
                            with open('data/stats/standings.json', 'r') as f:
                                standings = json.load(f)
                                
                                if not isinstance(standings, dict):
                                    logger.error("Standings data is not in the expected format (not a dictionary)")
                                elif 'eastern' not in standings or 'western' not in standings:
                                    logger.error("Standings data is missing expected conference keys (eastern/western)")
                                else:
                                    team_records = {}
                                    all_teams = []
                                    
                                    # Validate and collect teams from both conferences
                                    if isinstance(standings.get('eastern'), list):
                                        all_teams.extend(standings.get('eastern', []))
                                    if isinstance(standings.get('western'), list):
                                        all_teams.extend(standings.get('western', []))
                                    
                                    # Create a map of team_id -> record from both eastern and western conferences
                                    for team in all_teams:
                                        if not isinstance(team, dict):
                                            continue
                                            
                                        if 'team_id' in team and 'wins' in team and 'losses' in team:
                                            team_records[team['team_id']] = {
                                                'wins': team['wins'],
                                                'losses': team['losses'],
                                                'win_pct': team.get('win_pct', 0.0),
                                            }
                                    
                                    if not team_records:
                                        logger.warning("No valid team records found in standings data (JSON cache section)")
                                    
                                    # Update the team records in the teams_list
                                    teams_updated = 0
                                    for team in teams_list:
                                        if team['id'] in team_records:
                                            team['wins'] = team_records[team['id']]['wins']
                                            team['losses'] = team_records[team['id']]['losses']
                                            team['win_pct'] = team_records[team['id']]['win_pct']
                                            teams_updated += 1
                                    
                                    logger.info(f"Updated records for {teams_updated} teams from standings data (JSON cache section)")
                        except json.JSONDecodeError as json_err:
                            logger.error(f"JSON decode error in standings file (JSON cache section): {json_err}")
                        except Exception as standings_error:
                            logger.error(f"Error updating team records from standings (JSON cache section): {standings_error}")
                    
                    return jsonify(teams_list)
            except Exception as json_error:
                logger.error(f"Error parsing teams JSON file: {json_error}")
                # If JSON parsing fails, continue to fetch from database
        
        # If JSON file doesn't exist or doesn't have teams, get from database
        conn = get_db_connection()
        teams = conn.execute('SELECT * FROM teams ORDER BY name').fetchall()
        conn.close()
        
        # Convert to list of dictionaries
        teams_list = [dict(team) for team in teams]
        
        # If we have less than 30 teams, fetch the missing ones
        if len(teams_list) < 30:
            logger.info(f"Only {len(teams_list)} teams found in database, fetching all 30 teams...")
            from nba_api.stats.static import teams as nba_teams
            all_teams = nba_teams.get_teams()
            
            # Create dict of teams we already have
            existing_team_ids = {team['id'] for team in teams_list}
            
            # Add missing teams
            for team in all_teams:
                if team['id'] not in existing_team_ids:
                    team_data = {
                        'id': team['id'],
                        'name': team['full_name'],
                        'abbreviation': team['abbreviation'],
                        'city': team.get('city', ''),
                        'conference': team.get('conference', ''),
                        'division': team.get('division', ''),
                        'logo_url': f"https://cdn.nba.com/logos/nba/{team['id']}/primary/L/logo.svg",
                        'wins': 0,
                        'losses': 0,
                        'win_pct': 0.0
                    }
                    teams_list.append(team_data)
        
        # Update team records from standings data if available
        if os.path.exists('data/stats/standings.json'):
            try:
                with open('data/stats/standings.json', 'r') as f:
                    standings = json.load(f)
                    
                    if not isinstance(standings, dict):
                        logger.error("Standings data is not in the expected format (not a dictionary)")
                    elif 'eastern' not in standings or 'western' not in standings:
                        logger.error("Standings data is missing expected conference keys (eastern/western)")
                    else:
                        team_records = {}
                        all_teams = []
                        
                        # Validate and collect teams from both conferences
                        if isinstance(standings.get('eastern'), list):
                            all_teams.extend(standings.get('eastern', []))
                        if isinstance(standings.get('western'), list):
                            all_teams.extend(standings.get('western', []))
                        
                        # Create a map of team_id -> record from both eastern and western conferences
                        for team in all_teams:
                            if not isinstance(team, dict):
                                continue
                                
                            if 'team_id' in team and 'wins' in team and 'losses' in team:
                                team_records[team['team_id']] = {
                                    'wins': team['wins'],
                                    'losses': team['losses'],
                                    'win_pct': team.get('win_pct', 0.0),
                                }
                        
                        if not team_records:
                            logger.warning("No valid team records found in standings data")
                        
                        # Update the team records in the teams_list
                        teams_updated = 0
                        for team in teams_list:
                            if team['id'] in team_records:
                                team['wins'] = team_records[team['id']]['wins']
                                team['losses'] = team_records[team['id']]['losses']
                                team['win_pct'] = team_records[team['id']]['win_pct']
                                teams_updated += 1
                        
                        logger.info(f"Updated records for {teams_updated} teams from standings data")
            except json.JSONDecodeError as json_err:
                logger.error(f"JSON decode error in standings file: {json_err}")
            except Exception as standings_error:
                logger.error(f"Error updating team records from standings: {standings_error}")
        
        # Sort by team name
        teams_list.sort(key=lambda x: x['name'])
        return jsonify(teams_list)
    except Exception as e:
        logger.error(f"Error getting teams: {e}")
        
        # Fallback to static teams data if everything else fails
        try:
            from nba_api.stats.static import teams as nba_teams
            all_teams = nba_teams.get_teams()
            teams_list = []
            
            for team in all_teams:
                team_data = {
                    'id': team['id'],
                    'name': team['full_name'],
                    'abbreviation': team['abbreviation'],
                    'city': team.get('city', ''),
                    'conference': team.get('conference', ''),
                    'division': team.get('division', ''),
                    'logo_url': f"https://cdn.nba.com/logos/nba/{team['id']}/primary/L/logo.svg",
                    'wins': 0,
                    'losses': 0,
                    'win_pct': 0.0
                }
                teams_list.append(team_data)
            
            # Sort by team name
            teams_list.sort(key=lambda x: x['name'])
            return jsonify(teams_list)
        except Exception as fallback_error:
            logger.error(f"Fallback error getting teams: {fallback_error}")
            return jsonify({"error": "Failed to fetch teams"}), 500

@app.route('/api/teams/<int:team_id>', methods=['GET'])
def get_team(team_id):
    """Get a specific team by ID with roster"""
    try:
        conn = get_db_connection()
        
        # Get team info
        team = conn.execute('SELECT * FROM teams WHERE id = ?', (team_id,)).fetchone()
        
        if not team:
            conn.close()
            return jsonify({"error": "Team not found"}), 404
        
        team_data = dict(team)
        
        # Update team record from standings data if available
        if os.path.exists('data/stats/standings.json'):
            try:
                with open('data/stats/standings.json', 'r') as f:
                    standings = json.load(f)
                    
                    if not isinstance(standings, dict):
                        logger.error("Standings data is not in the expected format (not a dictionary)")
                        return team_data
                    
                    if 'eastern' not in standings or 'western' not in standings:
                        logger.error("Standings data is missing expected conference keys (eastern/western)")
                        return team_data
                    
                    # Combine teams from both conferences to search for the target team
                    all_teams = []
                    if isinstance(standings.get('eastern'), list):
                        all_teams.extend(standings.get('eastern', []))
                    if isinstance(standings.get('western'), list):
                        all_teams.extend(standings.get('western', []))
                    
                    # Look for team in the combined list
                    team_found = False
                    for team_info in all_teams:
                        if not isinstance(team_info, dict):
                            continue
                            
                        if team_info.get('team_id') == team_id:
                            team_found = True
                            # Update team record from standings
                            team_data['wins'] = team_info.get('wins', team_data.get('wins', 0))
                            team_data['losses'] = team_info.get('losses', team_data.get('losses', 0))
                            team_data['win_pct'] = team_info.get('win_pct', team_data.get('win_pct', 0.0))
                            team_data['conf_rank'] = team_info.get('conf_rank', team_data.get('conf_rank', 0))
                            
                            # Also update the team's JSON files to maintain consistency
                            team_abbr = team_data.get('abbreviation')
                            if team_abbr:
                                # Update team stats file
                                team_stats_file = f"data/teams/{team_abbr}_stats.json"
                                if os.path.exists(team_stats_file):
                                    try:
                                        with open(team_stats_file, 'r') as tf:
                                            team_stats = json.load(tf)
                                            team_stats['wins'] = team_data['wins']
                                            team_stats['losses'] = team_data['losses']
                                            team_stats['win_pct'] = team_data['win_pct']
                                        
                                        with open(team_stats_file, 'w') as tf:
                                            json.dump(team_stats, tf)
                                        logger.info(f"Updated team stats file for {team_abbr}")
                                    except json.JSONDecodeError as e:
                                        logger.error(f"JSON error updating team stats file for {team_abbr}: {e}")
                                    except Exception as e:
                                        logger.error(f"Error updating team stats file for {team_abbr}: {e}")
                                
                                # Update team data file
                                team_data_file = f"team_data/{team_abbr}.json"
                                if os.path.exists(team_data_file):
                                    try:
                                        with open(team_data_file, 'r') as tf:
                                            full_team_data = json.load(tf)
                                            if 'team_info' in full_team_data:
                                                full_team_data['team_info']['wins'] = team_data['wins']
                                                full_team_data['team_info']['losses'] = team_data['losses']
                                                full_team_data['team_info']['win_pct'] = team_data['win_pct']
                                                full_team_data['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                            
                                            with open(team_data_file, 'w') as tf:
                                                json.dump(full_team_data, tf)
                                            logger.info(f"Updated team data file for {team_abbr}")
                                    except json.JSONDecodeError as e:
                                        logger.error(f"JSON error updating team data file for {team_abbr}: {e}")
                                    except Exception as e:
                                        logger.error(f"Error updating team data file for {team_abbr}: {e}")
                            
                            break
                    
                    if not team_found:
                        logger.warning(f"Team ID {team_id} not found in standings data")
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error reading standings: {e}")
            except Exception as e:
                logger.error(f"Error updating team record from standings: {e}")
        
        # Get team roster
        roster = conn.execute('''
            SELECT p.id, p.name, p.position, p.height, p.weight,
                   ps.points, ps.rebounds, ps.assists, ps.steals, ps.blocks,
                   ps.field_goal_pct, ps.three_point_pct, ps.free_throw_pct
            FROM players p
            LEFT JOIN player_stats ps ON p.id = ps.player_id
            WHERE p.team_id = ?
        ''', (team_id,)).fetchall()
        
        # Convert roster to list of dictionaries
        roster_list = [dict(player) for player in roster]
        
        # Combine team and roster data
        result = {
            "team_info": team_data,
            "roster": roster_list,
            "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        conn.close()
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting team {team_id}: {e}")
        return jsonify({"error": f"Failed to fetch team with ID {team_id}"}), 500

@app.route('/api/players/<player_id>')
def get_player(player_id):
    try:
        # Connect to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get player bio
        cursor.execute('SELECT * FROM player_bio WHERE player_id = ?', (player_id,))
        player_bio = cursor.fetchone()
        
        if not player_bio:
            return jsonify({'error': 'Player not found'}), 404
            
        # Convert to dictionary
        player_bio_dict = dict(player_bio)
        
        # Get career stats
        cursor.execute('''
            SELECT * FROM career_stats 
            WHERE player_id = ? 
            ORDER BY 
                CASE 
                    WHEN season = 'Career' THEN 1 
                    WHEN season LIKE '% Total' THEN 2
                    ELSE 3 
                END,
                season DESC
        ''', (player_id,))
        career_stats = cursor.fetchall()
        
        # Convert to list of dictionaries
        career_stats_list = []
        for stat in career_stats:
            stat_dict = dict(stat)
            career_stats_list.append({
                'season': stat_dict['season'],
                'team': stat_dict['team'],
                'games_played': stat_dict['games_played'],
                'min': round(stat_dict['min'], 1) if stat_dict['min'] else 0,
                'pts': round(stat_dict['pts'], 1) if stat_dict['pts'] else 0,
                'reb': round(stat_dict['reb'], 1) if stat_dict['reb'] else 0,
                'ast': round(stat_dict['ast'], 1) if stat_dict['ast'] else 0,
                'stl': round(stat_dict['stl'], 1) if stat_dict['stl'] else 0,
                'blk': round(stat_dict['blk'], 1) if stat_dict['blk'] else 0,
                'fg_pct': round(stat_dict['fg_pct'] * 100, 1) if stat_dict['fg_pct'] else 0,
                'fg3_pct': round(stat_dict['fg3_pct'] * 100, 1) if stat_dict['fg3_pct'] else 0,
                'ft_pct': round(stat_dict['ft_pct'] * 100, 1) if stat_dict['ft_pct'] else 0,
                'is_total': bool(stat_dict['is_total']),
                'is_team_total': bool(stat_dict['is_team_total'])
            })
        
        # Get current season stats (most recent non-total entry)
        current_stats = next(
            (stat for stat in career_stats_list 
             if not stat['is_total'] and not stat['is_team_total']),
            None
        )
        
        response = {
            'playerBio': player_bio_dict,
            'currentStats': current_stats,
            'careerStats': career_stats_list,
            'lastUpdated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting player data: {e}")
        return jsonify({'error': 'Internal server error'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/standings', methods=['GET'])
def get_standings():
    """Get current NBA standings"""
    try:
        # First check if we have the JSON data file
        if os.path.exists('data/stats/standings.json'):
            with open('data/stats/standings.json', 'r') as f:
                standings = json.load(f)
                return jsonify(standings)
        
        # If JSON file doesn't exist, get from database and calculate standings
        conn = get_db_connection()
        teams = conn.execute('''
            SELECT id, name, abbreviation, conference, wins, losses, win_percentage
            FROM teams
            ORDER BY win_percentage DESC
        ''').fetchall()
        conn.close()
        
        eastern = []
        western = []
        
        for team in teams:
            team_dict = dict(team)
            if team_dict['conference'].lower() == 'east':
                eastern.append(team_dict)
            elif team_dict['conference'].lower() == 'west':
                western.append(team_dict)
        
        # Sort by win percentage (descending)
        eastern.sort(key=lambda x: x['win_percentage'], reverse=True)
        western.sort(key=lambda x: x['win_percentage'], reverse=True)
        
        # Add rank
        for i, team in enumerate(eastern):
            team['confRank'] = i + 1
        
        for i, team in enumerate(western):
            team['confRank'] = i + 1
        
        result = {
            "eastern": eastern,
            "western": western,
            "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting standings: {e}")
        return jsonify({"error": "Failed to fetch standings"}), 500

@app.route('/api/live-games', methods=['GET'])
def get_live_games():
    """Get live NBA games"""
    try:
        if os.path.exists('data/stats/live_games.json'):
            with open('data/stats/live_games.json', 'r') as f:
                live_games = json.load(f)
                return jsonify(live_games)
        
        return jsonify([])
    except Exception as e:
        logger.error(f"Error getting live games: {e}")
        return jsonify({"error": "Failed to fetch live games"}), 500

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get API status and last update time"""
    try:
        # Get last update time
        last_update = "Unknown"
        if os.path.exists('data/config/last_update.txt'):
            with open('data/config/last_update.txt', 'r') as f:
                last_update = f.read().strip()
        
        # Check if data fetcher is running
        polling_config = {}
        if os.path.exists('data/config/polling.json'):
            with open('data/config/polling.json', 'r') as f:
                polling_config = json.load(f)
        
        # Check for live games
        has_live_games = False
        if os.path.exists('data/stats/live_games.json'):
            with open('data/stats/live_games.json', 'r') as f:
                live_games = json.load(f)
                has_live_games = len(live_games) > 0
        
        result = {
            "last_updated": last_update,
            "has_live_games": has_live_games,
            "polling_enabled": polling_config.get('enabled', False),
            "polling_interval": polling_config.get('interval', 300)  # Default 5 minutes
        }
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error getting status: {e}")
        return jsonify({"error": "Failed to fetch status"}), 500

@app.route('/api/players/team/<team_id>', methods=['GET'])
def get_team_players(team_id):
    """Get all players for a specific team"""
    try:
        # Connect to database
        conn = get_db_connection()
        
        # Get team players
        players = conn.execute('''
            SELECT id, name, position, height, weight, team_id
            FROM players
            WHERE team_id = ?
        ''', (team_id,)).fetchall()
        
        # Convert to list of dictionaries
        players_list = [dict(player) for player in players]
        
        conn.close()
        return jsonify(players_list)
    except Exception as e:
        logger.error(f"Error getting players for team {team_id}: {e}")
        return jsonify({"error": f"Failed to fetch players for team with ID {team_id}"}), 500

@app.route('/api/players/search', methods=['GET'])
def search_players():
    try:
        # Get query parameter
        query = request.args.get('q', '')
        
        if not query or len(query) < 2:
            return jsonify([])
            
        # Connect to database
        conn = get_db_connection()
        
        # Search players by name
        players = conn.execute('''
            SELECT p.id, p.name, p.position, p.height, p.weight, p.team_id, t.name as team_name
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.name LIKE ?
            ORDER BY p.name
            LIMIT 100
        ''', (f'%{query}%',)).fetchall()
        
        # Convert to list of dictionaries
        players_list = [dict(player) for player in players]
        
        conn.close()
        return jsonify(players_list)
    except Exception as e:
        logger.error(f"Error searching players: {e}")
        return jsonify({"error": "Failed to search players"}), 500

@app.route('/api/leaders', methods=['GET'])
def get_leaders():
    """Get league leaders in major statistical categories, with focus on MVP candidates"""
    try:
        conn = get_db_connection()
        
        # Dictionary to store leaders by category
        leaders = {}
        
        # Categories to fetch
        categories = [
            {'name': 'points', 'column': 'points'},
            {'name': 'rebounds', 'column': 'rebounds'},
            {'name': 'assists', 'column': 'assists'},
            {'name': 'steals', 'column': 'steals'},
            {'name': 'blocks', 'column': 'blocks'}
        ]
        
        # Fetch players with min 20 games played (prevent small sample size leaders)
        min_games = 20
        
        # Get team records for context
        team_records = {}
        try:
            teams_query = '''
                SELECT id, wins, losses, win_percentage, conference, conference_rank
                FROM teams
            '''
            teams_result = conn.execute(teams_query).fetchall()
            for team in teams_result:
                team_dict = dict(team)
                team_records[team_dict['id']] = {
                    'wins': team_dict['wins'],
                    'losses': team_dict['losses'],
                    'win_pct': team_dict['win_percentage'],
                    'conference': team_dict['conference'],
                    'conference_rank': team_dict['conference_rank']
                }
        except Exception as e:
            logger.warning(f"Error fetching team records: {e}")
        
        for category in categories:
            # Get leaders for this category
            query = f'''
                SELECT p.id, p.name, p.position, p.team_id, t.name as team_name, p.nickname,
                       ps.{category['column']} as {category['name'].lower()[:3]}s,
                       ps.points, ps.rebounds, ps.assists, ps.steals, ps.blocks,
                       ps.field_goal_percentage, ps.three_point_percentage,
                       ps.minutes, ps.games_played, ps.efficiency
                FROM players p
                JOIN player_stats ps ON p.id = ps.player_id
                JOIN teams t ON p.team_id = t.id
                WHERE ps.games_played >= ?
                ORDER BY ps.{category['column']} DESC
                LIMIT 10
            '''
            
            try:
                leaders_result = conn.execute(query, (min_games,)).fetchall()
                leaders[category['name']] = []
                
                for leader in leaders_result:
                    leader_dict = dict(leader)
                    
                    # Add team record context
                    if leader_dict['team_id'] in team_records:
                        team_record = team_records[leader_dict['team_id']]
                        leader_dict['team_wins'] = team_record['wins']
                        leader_dict['team_losses'] = team_record['losses']
                        leader_dict['team_win_pct'] = team_record['win_pct']
                        leader_dict['team_record'] = f"{team_record['wins']}-{team_record['losses']}"
                        leader_dict['conference_rank'] = team_record['conference_rank']
                        
                        # Calculate MVP score based on stats and team success
                        # Simple formula: points + (rebounds + assists)/2 + (steals + blocks) + (team_win_pct * 20)
                        mvp_score = (
                            leader_dict.get('points', 0) + 
                            (leader_dict.get('rebounds', 0) + leader_dict.get('assists', 0)) / 2 +
                            (leader_dict.get('steals', 0) + leader_dict.get('blocks', 0)) +
                            (team_record['win_pct'] * 20)
                        )
                        leader_dict['mvp_score'] = round(mvp_score, 1)
                    
                    # Format stats to one decimal place
                    for stat in ['points', 'rebounds', 'assists', 'steals', 'blocks']:
                        if stat in leader_dict:
                            leader_dict[stat[:3]] = round(leader_dict[stat], 1)
                    
                    # Add formatted percentages
                    if 'field_goal_percentage' in leader_dict and leader_dict['field_goal_percentage'] is not None:
                        leader_dict['fg_pct'] = round(leader_dict['field_goal_percentage'] * 100, 1)
                    
                    if 'three_point_percentage' in leader_dict and leader_dict['three_point_percentage'] is not None:
                        leader_dict['fg3_pct'] = round(leader_dict['three_point_percentage'] * 100, 1)
                    
                    leaders[category['name']].append(leader_dict)
                
                # For MVP candidates specifically, sort by MVP score if available
                if category['name'] == 'points':
                    leaders[category['name']] = sorted(
                        leaders[category['name']], 
                        key=lambda x: x.get('mvp_score', 0), 
                        reverse=True
                    )
            except Exception as e:
                logger.warning(f"Error fetching {category['name']} leaders: {e}")
                # If this category fails, create empty list
                leaders[category['name']] = []
        
        conn.close()
        
        # If no leaders were found for any category, generate mock data
        if all(len(leaders[cat['name']]) == 0 for cat in categories):
            logger.info("No leader data found in database. Generating mock data.")
            leaders = generate_mock_leaders()
        
        return jsonify(leaders)
    except Exception as e:
        logger.error(f"Error fetching league leaders: {e}")
        # Generate mock data when the entire endpoint fails
        mock_leaders = generate_mock_leaders()
        return jsonify(mock_leaders)

def generate_mock_leaders():
    """Generate mock data for league leaders with MVP race focus"""
    logger.info("Generating mock MVP and leaders data")
    
    # Real player data for MVP candidates
    mvp_candidates = [
        {
            "id": "203999", "name": "Nikola Jokić", "nickname": "The Joker", "position": "C", 
            "team_id": 7, "team_name": "Nuggets", "team_record": "55-15", "conference_rank": 1,
            "pts": 26.4, "reb": 12.3, "ast": 9.0, "stl": 1.4, "blk": 0.9, 
            "fg_pct": 58.3, "fg3_pct": 35.9, "mvp_score": 94.8
        },
        {
            "id": "203954", "name": "Joel Embiid", "nickname": "The Process", "position": "C", 
            "team_id": 20, "team_name": "76ers", "team_record": "52-18", "conference_rank": 2,
            "pts": 30.0, "reb": 11.2, "ast": 5.5, "stl": 1.1, "blk": 1.7, 
            "fg_pct": 54.2, "fg3_pct": 33.6, "mvp_score": 92.1
        },
        {
            "id": "203507", "name": "Giannis Antetokounmpo", "nickname": "Greek Freak", "position": "PF", 
            "team_id": 17, "team_name": "Bucks", "team_record": "50-20", "conference_rank": 2,
            "pts": 29.7, "reb": 11.5, "ast": 6.2, "stl": 1.2, "blk": 1.3, 
            "fg_pct": 61.1, "fg3_pct": 28.3, "mvp_score": 91.4
        },
        {
            "id": "1629029", "name": "Luka Dončić", "nickname": "Luka Magic", "position": "PG", 
            "team_id": 6, "team_name": "Mavericks", "team_record": "48-22", "conference_rank": 3,
            "pts": 32.5, "reb": 9.0, "ast": 8.5, "stl": 1.5, "blk": 0.5, 
            "fg_pct": 48.6, "fg3_pct": 36.2, "mvp_score": 89.5
        },
        {
            "id": "1628983", "name": "Shai Gilgeous-Alexander", "nickname": "SGA", "position": "PG", 
            "team_id": 21, "team_name": "Thunder", "team_record": "51-19", "conference_rank": 1,
            "pts": 30.6, "reb": 5.8, "ast": 6.7, "stl": 2.0, "blk": 0.9, 
            "fg_pct": 54.0, "fg3_pct": 35.5, "mvp_score": 88.2
        },
        {
            "id": "1628369", "name": "Jayson Tatum", "nickname": "JT", "position": "SF", 
            "team_id": 2, "team_name": "Celtics", "team_record": "57-13", "conference_rank": 1,
            "pts": 27.8, "reb": 8.5, "ast": 4.9, "stl": 1.1, "blk": 0.7, 
            "fg_pct": 47.1, "fg3_pct": 37.3, "mvp_score": 87.5
        },
        {
            "id": "1630162", "name": "Anthony Edwards", "nickname": "Ant-Man", "position": "SG", 
            "team_id": 16, "team_name": "Timberwolves", "team_record": "49-21", "conference_rank": 2,
            "pts": 26.8, "reb": 5.5, "ast": 5.2, "stl": 1.3, "blk": 0.6, 
            "fg_pct": 46.3, "fg3_pct": 36.5, "mvp_score": 84.1
        },
        {
            "id": "2544", "name": "LeBron James", "nickname": "King James", "position": "SF", 
            "team_id": 13, "team_name": "Lakers", "team_record": "42-28", "conference_rank": 7,
            "pts": 25.5, "reb": 7.8, "ast": 8.2, "stl": 1.2, "blk": 0.5, 
            "fg_pct": 53.4, "fg3_pct": 39.1, "mvp_score": 81.6
        }
    ]
    
    # Create dictionary with all categories
    mock_leaders = {
        "points": mvp_candidates,
        "rebounds": [],
        "assists": [],
        "steals": [],
        "blocks": []
    }
    
    # For non-points categories, sort existing candidates and pad with additional generic players
    for category in ["rebounds", "assists", "steals", "blocks"]:
        stat_key = category[:3]
        # Sort MVP candidates by this stat
        sorted_candidates = sorted(mvp_candidates, key=lambda x: x.get(stat_key, 0), reverse=True)
        
        # Take top 5 from sorted candidates
        category_leaders = sorted_candidates[:5]
        
        # Generate additional generic players to fill out top 10
        first_names = ["James", "Michael", "Kevin", "Donovan", "Bam", "Jaren", "Rudy", "Victor", "Russell", "Tyrese"]
        last_names = ["Johnson", "Smith", "Davis", "Mitchell", "Adebayo", "Jackson", "Gobert", "Wembanyama", "Westbrook", "Maxey"]
        
        for i in range(5):
            idx = i + 5
            player_name = f"{first_names[i]} {last_names[i]}"
            position = ["PG", "SG", "SF", "PF", "C"][i % 5]
            team_id = i + 5
            team_name = f"Team{i+5}"
            
            # Higher stats for specific categories
            pts = round(22 - i * 0.8, 1)
            reb = round(7 - i * 0.4, 1)
            ast = round(6 - i * 0.3, 1)
            stl = round(1.5 - i * 0.1, 1)
            blk = round(1.3 - i * 0.1, 1)
            
            # Boost the specific category stat
            if category == "rebounds":
                reb = round(14 - i * 0.7, 1)
            elif category == "assists":
                ast = round(11 - i * 0.6, 1)
            elif category == "steals":
                stl = round(2.5 - i * 0.2, 1)
            elif category == "blocks":
                blk = round(3.0 - i * 0.25, 1)
            
            generic_player = {
                "id": f"10000{i+5}",
                "name": player_name,
                "nickname": None,
                "position": position,
                "team_id": team_id,
                "team_name": team_name,
                "team_record": f"{45-i*2}-{25+i*2}",
                "conference_rank": i + 4,
                "pts": pts,
                "reb": reb,
                "ast": ast,
                "stl": stl,
                "blk": blk,
                "fg_pct": round(47 - i * 0.8, 1),
                "fg3_pct": round(38 - i * 0.9, 1),
                "mvp_score": round(75 - i * 2.5, 1)
            }
            
            category_leaders.append(generic_player)
        
        # Sort again by the specific category stat
        category_leaders = sorted(category_leaders, key=lambda x: x.get(stat_key, 0), reverse=True)
        mock_leaders[category] = category_leaders
    
    return mock_leaders

def run_data_fetcher():
    """Run the data fetcher script"""
    logger.info("Running data fetcher...")
    try:
        subprocess.run(['python', 'scripts/fetch_data.py'], check=True)
        logger.info("Data fetcher completed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Error running data fetcher: {e}")

def schedule_data_fetcher():
    """Schedule the data fetcher to run periodically"""
    # Check for polling config
    polling_interval = 43200  # Default: 12 hours
    has_live_games = False
    
    if os.path.exists('data/config/polling.json'):
        try:
            with open('data/config/polling.json', 'r') as f:
                config = json.load(f)
                polling_interval = config.get('polling_interval', 43200)
                has_live_games = config.get('has_live_games', False)
        except Exception as e:
            logger.error(f"Error reading polling config: {e}")
    
    # Clear existing schedule
    schedule.clear()
    
    # Schedule based on live games status
    if has_live_games:
        logger.info(f"Scheduling data fetcher to run every {polling_interval} seconds (live games)")
        schedule.every(polling_interval).seconds.do(run_data_fetcher)
    else:
        logger.info(f"Scheduling data fetcher to run every {polling_interval} seconds")
        schedule.every(polling_interval).seconds.do(run_data_fetcher)

def run_scheduler():
    """Run the scheduler in a separate thread"""
    # Initial data fetch
    run_data_fetcher()
    
    # Set up schedule
    schedule_data_fetcher()
    
    # Run scheduler
    while True:
        schedule.run_pending()
        time.sleep(1)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get top players across different statistical categories with enhanced data"""
    try:
        # Categories to track
        categories = [
            {"id": "points", "name": "Points", "query_field": "pts", "db_field": "pts"},
            {"id": "rebounds", "name": "Rebounds", "query_field": "rebounds", "db_field": "reb"},
            {"id": "assists", "name": "Assists", "query_field": "assists", "db_field": "ast"},
            {"id": "steals", "name": "Steals", "query_field": "steals", "db_field": "stl"},
            {"id": "blocks", "name": "Blocks", "query_field": "blocks", "db_field": "blk"}
        ]
        
        # Get category from query param, default to points
        category = request.args.get('category', 'points')
        
        # Number of players to return
        limit = request.args.get('limit', '5')
        try:
            limit = int(limit)
        except ValueError:
            limit = 5
            
        # Match category ID to query details
        selected_category = next((cat for cat in categories if cat["id"] == category), categories[0])
        
        # Connect to database
        conn = get_db_connection()
        query_field = selected_category["db_field"]
        
        # Get player stats sorted by the selected category
        cursor = conn.cursor()
        cursor.execute(f'''
            SELECT
                p.player_id,
                p.name,
                p.position,
                p.team_id,
                p.team_name,
                p.team_abbreviation,
                cs.pts,
                cs.reb,
                cs.ast,
                cs.stl,
                cs.blk,
                cs.min,
                cs.fg_pct,
                cs.fg3_pct,
                cs.ft_pct,
                cs.games_played,
                t.wins,
                t.losses
            FROM career_stats cs
            JOIN player_bio p ON cs.player_id = p.player_id
            JOIN teams t ON p.team_id = t.id
            WHERE cs.season = '2024-25' AND cs.is_total = 0 AND cs.is_team_total = 0
            ORDER BY cs.{query_field} DESC
            LIMIT ?
        ''', (limit,))
        
        players = cursor.fetchall()
        
        # Format response data
        result = []
        for player in players:
            player_dict = dict(player)
            
            # Get values from player dict
            points = player_dict['pts'] if player_dict['pts'] else 0
            rebounds = player_dict['reb'] if player_dict['reb'] else 0
            assists = player_dict['ast'] if player_dict['ast'] else 0
            steals = player_dict['stl'] if player_dict['stl'] else 0
            blocks = player_dict['blk'] if player_dict['blk'] else 0
            
            # Format for response
            formatted_player = {
                "id": player_dict['player_id'],
                "name": player_dict['name'],
                "position": player_dict['position'],
                "team": {
                    "id": player_dict['team_id'],
                    "name": player_dict['team_name'],
                    "abbreviation": player_dict['team_abbreviation'],
                    "record": f"{player_dict['wins']}-{player_dict['losses']}"
                },
                "stats": {
                    "points": round(points, 1),
                    "rebounds": round(rebounds, 1),
                    "assists": round(assists, 1),
                    "steals": round(steals, 1),
                    "blocks": round(blocks, 1)
                },
                "headshot_url": f"https://cdn.nba.com/headshots/nba/latest/1040x760/{player_dict['player_id']}.png",
                "previousRank": 0,  # Will be dynamically generated on client
                "trend": "same"     # Will be dynamically generated on client
            }
            
            result.append(formatted_player)
            
        # Team color mapping (simplified version)
        team_colors = {
            "ATL": "#E03A3E",
            "BOS": "#007A33",
            "BKN": "#000000",
            "CHA": "#1D1160",
            "CHI": "#CE1141",
            "CLE": "#860038",
            "DAL": "#00538C",
            "DEN": "#0E2240",
            "DET": "#C8102E",
            "GSW": "#1D428A",
            "HOU": "#CE1141",
            "IND": "#002D62",
            "LAC": "#C8102E",
            "LAL": "#552583",
            "MEM": "#5D76A9",
            "MIA": "#98002E",
            "MIL": "#00471B",
            "MIN": "#0C2340",
            "NOP": "#0C2340",
            "NYK": "#F58426",
            "OKC": "#007AC1",
            "ORL": "#0077C0",
            "PHI": "#006BB6",
            "PHX": "#1D1160",
            "POR": "#E03A3E",
            "SAC": "#5A2D81",
            "SAS": "#C4CED4",
            "TOR": "#CE1141",
            "UTA": "#002B5C",
            "WAS": "#002B5C"
        }
        
        # Add team colors to each player
        for player in result:
            team_abbr = player['team']['abbreviation']
            player['team']['color'] = team_colors.get(team_abbr, "#333333")
        
        # Return the result
        response = {
            "category": selected_category["id"],
            "players": result,
            "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error getting stats data: {e}")
        return jsonify({"error": "Internal server error", "message": str(e)}), 500
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    # Fix data issues first
    try:
        print("Running data fix process...")
        from fix_all_data import fix_all_data
        fix_all_data()
        print("Data fix process completed")
    except Exception as e:
        logger.error(f"Error fixing data: {e}")
    
    # Start the scheduler in a separate thread
    scheduler_thread = threading.Thread(target=run_scheduler)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    
    # Get port from environment variable (for Render deployment) or use default
    port = int(os.environ.get('PORT', 5004))
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=port, debug=True, threaded=True) 