from nba_api.stats.static import players, teams
from nba_api.stats.endpoints import playercareerstats, teamyearbyyearstats, commonteamroster
import pandas as pd
import pickle
import time

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

def main():
    # Get all NBA teams
    all_teams = teams.get_teams()
    
    # Initialize dictionaries for all data
    all_player_stats = {}
    all_team_stats = {}
    
    # Track progress
    total_teams = len(all_teams)
    
    print(f"Starting to fetch data for {total_teams} NBA teams...")
    
    # Process each team
    for i, team in enumerate(all_teams, 1):
        print(f"\nProcessing team {i}/{total_teams}: {team['full_name']}")
        print("-" * 50)
        
        player_stats, team_stats = fetch_team_data(team)
        
        # Update our complete dictionaries
        all_player_stats.update(player_stats)
        all_team_stats.update(team_stats)
        
        # Save progress after each team (in case of crashes)
        print(f"Saving progress after {team['full_name']}...")
        with open('player_data.pkl', 'wb') as f:
            pickle.dump(all_player_stats, f)
        with open('team_data.pkl', 'wb') as f:
            pickle.dump(all_team_stats, f)
        
        print(f"Completed {i}/{total_teams} teams")
        print(f"Players in database: {len(all_player_stats)}")
        print(f"Teams in database: {len(all_team_stats)}")
        
        # Short break between teams
        time.sleep(2)
    
    print("\nAll data fetched and saved successfully!")
    print(f"Final count - Players: {len(all_player_stats)}, Teams: {len(all_team_stats)}")

if __name__ == "__main__":
    main()