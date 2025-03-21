import json
import os
from datetime import datetime

def fix_standings_json():
    """Check and fix the standings.json file if needed"""
    try:
        # Check if standings file exists
        standings_file = 'data/stats/standings.json'
        if not os.path.exists(standings_file):
            print(f"Creating new standings.json file...")
            # Create basic structure
            standings = {
                "eastern": [],
                "western": [],
                "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            with open(standings_file, 'w') as f:
                json.dump(standings, f)
            print("Created empty standings file.")
            return
        
        # Try to load and validate the file
        try:
            with open(standings_file, 'r') as f:
                standings = json.load(f)
            
            # Check if it has the required keys
            if not isinstance(standings, dict):
                raise ValueError("Standings is not a dictionary")
            
            if "eastern" not in standings or "western" not in standings:
                raise ValueError("Standings is missing eastern or western conferences")
            
            # Check if eastern and western are lists
            if not isinstance(standings["eastern"], list) or not isinstance(standings["western"], list):
                raise ValueError("Eastern or western is not a list")
            
            # Add last_updated if missing
            if "last_updated" not in standings:
                standings["last_updated"] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                with open(standings_file, 'w') as f:
                    json.dump(standings, f)
            
            # If we got here, the file is valid
            print(f"Standings file is valid. Eastern: {len(standings['eastern'])} teams, Western: {len(standings['western'])} teams")
            return
        
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error validating standings.json: {e}")
            # Backup the bad file
            if os.path.exists(standings_file):
                backup_file = f"{standings_file}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
                os.rename(standings_file, backup_file)
                print(f"Backed up bad standings file to {backup_file}")
            
            # Create a new empty file
            standings = {
                "eastern": [],
                "western": [],
                "last_updated": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            with open(standings_file, 'w') as f:
                json.dump(standings, f)
            print("Created new empty standings file")
    
    except Exception as e:
        print(f"Unexpected error fixing standings.json: {e}")

if __name__ == "__main__":
    fix_standings_json() 