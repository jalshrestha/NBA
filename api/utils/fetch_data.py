from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import playercareerstats, teamyearbyyearstats, commonteamroster
import pandas as pd
import pickle
import time
import os

# Define data directory
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

def fetch_team_data(team):
    """Fetch data for a single team and its players"""
    player_stats = {}
    team_stats = {}
    
    try:
        print(f"\nFetching {team['full_name']} roster...")
        # Get team roster
        roster = commonteamroster.CommonTeamRoster(team_id=team['id'])
        team_players = roster.get_data_frames()[0]
        time.sleep(1)  # Prevent rate limiting
        
        # Fetch players stats
        for _, player in team_players.iterrows():
            try:
                print(f"  - Fetching data for {player['PLAYER']}...")
                career = playercareerstats.PlayerCareerStats(player_id=player['PLAYER_ID'])
                df = career.get_data_frames()[0]
                if not df.empty:
                    latest_season = df.iloc[-1]
                    player_stats[player['PLAYER'].lower()] = {
                        'name': player['PLAYER'],
                        'points': latest_season['PTS'] / latest_season['GP'],
                        'rebounds': latest_season['REB'] / latest_season['GP'],
                        'assists': latest_season['AST'] / latest_season['GP'],
                        'games': latest_season['GP'],
                        'season': latest_season['SEASON_ID'],
                        'team': team['abbreviation']
                    }
                time.sleep(1)  # Prevent rate limiting
            except Exception as e:
                print(f"    Error fetching data for {player['PLAYER']}: {e}")
        
        # Fetch team stats
        print(f"  Fetching {team['full_name']} team stats...")
        team_stats_data = teamyearbyyearstats.TeamYearByYearStats(team_id=team['id'])
        df = team_stats_data.get_data_frames()[0]
        if not df.empty:
            latest_season = df.iloc[-1]
            team_stats[team['full_name'].lower()] = {
                'name': team['full_name'],
                'wins': latest_season['WINS'],
                'losses': latest_season['LOSSES'],
                'points': latest_season['PTS'] / (latest_season['WINS'] + latest_season['LOSSES']),
                'win_pct': latest_season['WIN_PCT'],
                'season': latest_season['YEAR']
            }
        time.sleep(1)  # Prevent rate limiting
        
    except Exception as e:
        print(f"Error fetching data for {team['full_name']}: {e}")
    
    return player_stats, team_stats

def fetch_all_data():
    """Fetch data for all NBA teams and players"""
    all_teams = teams.get_teams()
    all_player_stats = {}
    all_team_stats = {}
    
    for team in all_teams:
        player_stats, team_stats = fetch_team_data(team)
        all_player_stats.update(player_stats)
        all_team_stats.update(team_stats)
    
    return all_player_stats, all_team_stats

def save_data(player_stats, team_stats):
    """Save the fetched data to pickle files"""
    player_file = os.path.join(DATA_DIR, 'player_data.pkl')
    team_file = os.path.join(DATA_DIR, 'team_data.pkl')
    
    with open(player_file, 'wb') as f:
        pickle.dump(player_stats, f)
    
    with open(team_file, 'wb') as f:
        pickle.dump(team_stats, f)
    
    print(f"Data saved to {player_file} and {team_file}")

if __name__ == "__main__":
    player_stats, team_stats = fetch_all_data()
    save_data(player_stats, team_stats)