import sqlite3

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
    except Exception as e:
        print(f"Error fixing conferences: {e}")

if __name__ == "__main__":
    fix_conferences() 