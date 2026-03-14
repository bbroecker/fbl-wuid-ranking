#!/usr/bin/env python3
"""
Circle21 Sync Script
Fetches athlete data from Circle21 API and updates Firebase automatically
"""

import json
import urllib.request
import sys
from datetime import datetime

# ====================
# CONFIGURATION
# ====================

# Athletes to track - format: ("Name", "Gender")
# Gender: "M" for Male, "F" for Female  
ATHLETES_TO_TRACK = [
    ("Bastian Broecker", "M"),
    # Add more athletes here...
]

# Firebase configuration
FIREBASE_CONFIG = {
    "databaseURL": "https://fbl-wuid-ranking-default-rtdb.europe-west1.firebasedatabase.app",
    "apiKey": "AIzaSyBVQUrZ7KajXAWNcppBCQkCBPBtbB_RHvw",
}

# Circle21 API configuration  
CIRCLE21_API = {
    "base_url": "https://api.circle21.events/api/leaderboard",
    "competition_id": "ca492eb3-516d-445b-8093-66b3df1c6465",
    "division_male": "5b561478-69cb-435d-b090-53513293c22f",
    "division_female": "TBD",  # TODO: Get female division ID
    "bearer_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ODlmMDRjZC1iNWRhLTQ2ZTUtOTg0Yy1kYjU3YmIxOWNlZjIiLCJqdGkiOiJmZDE1NzM3MDM2YTczYWIyZTY4MjAyNmQ4YmJiMzdlNDVhNjY0YjlkZmM5YzI5YmFjZWFlMGIzNzZhYTdjZjM0ODZhZGM2ODhlYThmZmMyNiIsImlhdCI6MTc3Mjk4NjU5MC44NzI1MiwibmJmIjoxNzcyOTg2NTkwLjg3MjUyMywiZXhwIjoxODA0NTIyNTkwLjg2NjUzNywic3ViIjoiMzA1Y2M1ZGItMGNmMS00MzFiLThjYzktYjg5MWFiOWQwMzNmIiwic2NvcGVzIjpbXX0.qTGPTD2SmVhihQgeX_yYEjNXU8wuyXJOrm9OliEbWNUf48LoY1xRONGjtIQPbdVdk-7Ye2kpvyNOfdrT7N8dKCWPIht9wLXafasFGF4qRrdD-EPxPuR6Ygxvu-tmlrDEbTj9mF94bucWuil83cXfAVAYrTyGITa-mK26bPIBHGC-Wbk0VJzDGL9a4oiQEo_RDHyh3MOrkA_iralEStNYfdZ-jF8nJVsPkeWVcPYnyZK1Ar0NuIFD0yIEhGbaJKbZu8RoJDgFwAk2aRyrAhVSc1cRg6tF49VAISJAk-KGJr4Bs7Yw7rop89dOVdzh-ZeyqLvdMR4tpQzpt8t7Y6KSXl9Rmq9OYuOThfavvqir5CqCQmYWixy2yrXHwcqhBcVk0SvajUmRuKrDyqPrcv5xWFQjcDD_rYFPj355FQoZDmbqyhsp2P7NRMlXdCjWtwInnOQ2q1zGKnaXATkD1yHMD_C3bTqlxLLQy2odTQmX9U6Ggp8B6ZEvyL2GICEL7ZFT427M3O0WJhDSPRpR2w9K1bIyoRGzPy2t_aOfLwqoD3x-PxljIfB1O6hxbf1kSz3oeWjVvBkTm48V48v2fwgfubSiclm8hLn3wHErSj_u4LY8gQR42DSKGDHpSZVw8W0TNQ8RGTcwOs5WDnlh0FG5WAWc1CWXBvTVlSkXF3IIb6M"
}


# ====================
# FUNCTIONS
# ====================

def fetch_circle21_leaderboard(gender):
    """
    Fetch Circle21 leaderboard data for a specific gender division
    Returns JSON data with athletes and workout results
    """
    division_id = CIRCLE21_API["division_male"] if gender == "M" else CIRCLE21_API["division_female"]
    
    url = f"{CIRCLE21_API['base_url']}?competition_id={CIRCLE21_API['competition_id']}&division_id={division_id}"
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                'Accept': 'application/json, text/plain, */*',
                'Authorization': f"Bearer {CIRCLE21_API['bearer_token']}"
            }
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            return data
            
    except Exception as e:
        print(f"  ❌ Error fetching {gender} leaderboard: {e}")
        return None


def calculate_workout_rank(athlete_id, wod_data):
    """Calculate an athlete's rank in a specific workout"""
    if not wod_data.get('workouts'):
        return None
    
    workout_data = wod_data['workouts'][0]
    results = workout_data.get('results', [])
    
    # Find athlete's result
    athlete_result = None
    for result in results:
        if result.get('athlete_id') == athlete_id:
            athlete_result = result
            break
    
    if not athlete_result:
        return None
    
    # Calculate rank by counting better scores
    # CrossFit scoring: lower time or higher reps if capped
    athlete_time = athlete_result.get('time') or 999999999
    athlete_reps = athlete_result.get('how_many') or 0
    
    rank = 1
    for result in results:
        other_time = result.get('time') or 999999999
        other_reps = result.get('how_many') or 0
        
        # If both finished, lower time wins
        # If both capped, more reps wins
        if other_time < athlete_time or (other_time == athlete_time and other_reps > athlete_reps):
            rank += 1
    
    return rank


def find_athlete_data(athlete_name, gender, leaderboard_data):
    """Find athlete in leaderboard and extract all placement data"""
    if not leaderboard_data:
        return None
    
    # Find athlete in athletes list
    athlete_info = None
    for athlete in leaderboard_data.get('athletes', []):
        if athlete.get('name', '').lower() == athlete_name.lower():
            athlete_info = athlete
            break
    
    if not athlete_info:
        return None
    
    athlete_id = athlete_info['id']
    
    # Calculate overall rank (higher points = better)
    athletes_sorted = sorted(
        leaderboard_data.get('athletes', []),
        key=lambda x: x.get('points', 0),
        reverse=True
    )
    overall_rank = None
    for i, ath in enumerate(athletes_sorted, 1):
        if ath['id'] == athlete_id:
            overall_rank = i
            break
    
    # Get workout rankings
    workouts = {}
    for wod in leaderboard_data.get('wods', []):
        wod_name = wod['wod']['name']
        rank = calculate_workout_rank(athlete_id, wod)
        workouts[wod_name] = rank
    
    return {
        'name': athlete_name,
        'gender': gender,
        'overall': overall_rank,
        'workouts': workouts,
        'timestamp': int(datetime.now().timestamp())
    }


def update_firebase(athletes_data):
    """Update Firebase Realtime Database with athlete data"""
    firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21.json?auth={FIREBASE_CONFIG['apiKey']}"
    
    try:
        json_data = json.dumps(athletes_data).encode('utf-8')
        req = urllib.request.Request(
            firebase_url,
            data=json_data,
            method='PUT',
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            response.read()
            return True
    
    except Exception as e:
        print(f"❌ Error updating Firebase: {e}")
        return False


def sync_circle21_data():
    """Main sync function"""
    print("\n" + "="*60)
    print("🏆 Circle21 Sync Script")
    print("="*60)
    print(f"\n📋 Athletes to track: {len(ATHLETES_TO_TRACK)}")
    
    if not ATHLETES_TO_TRACK:
        print("⚠️  No athletes configured! Add athletes to ATHLETES_TO_TRACK list.")
        return False
    
    # Group by gender
    male_athletes = [name for name, gender in ATHLETES_TO_TRACK if gender == "M"]
    female_athletes = [name for name, gender in ATHLETES_TO_TRACK if gender == "F"]
    
    # Fetch leaderboards
    print(f"\n🔄 Fetching data from Circle21 API...")
    male_data = None
    female_data = None
    
    if male_athletes:
        print(f"   Fetching male division...")
        male_data = fetch_circle21_leaderboard("M")
        if male_data:
            print(f"   ✅ Male data received ({len(male_data.get('athletes', []))} athletes)")
    
    if female_athletes:
        print(f"   Fetching female division...")
        female_data = fetch_circle21_leaderboard("F")
        if female_data:
            print(f"   ✅ Female data received ({len(female_data.get('athletes', []))} athletes)")
    
    # Process athletes
    athletes_found = []
    athletes_not_found = []
    
    print(f"\n🔍 Processing athletes...")
    
    for name, gender in ATHLETES_TO_TRACK:
        leaderboard_data = male_data if gender == "M" else female_data
        
        athlete_data = find_athlete_data(name, gender, leaderboard_data)
        
        if athlete_data:
            athletes_found.append(athlete_data)
            workouts_completed = sum(1 for v in athlete_data['workouts'].values() if v is not None)
            print(f"   ✅ {name} ({gender}) - Overall: #{athlete_data['overall']} | {workouts_completed}/6 workouts")
        else:
            athletes_not_found.append((name, gender))
            print(f"   ❌ {name} ({gender}) - Not found")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   Found: {len(athletes_found)}")
    print(f"   Not Found: {len(athletes_not_found)}")
    
    if athletes_not_found:
        print(f"\n⚠️  Athletes not found:")
        for name, gender in athletes_not_found:
            print(f"      - {name} ({gender})")
    
    # Update Firebase
    print(f"\n📤 Updating Firebase database...")
    if update_firebase(athletes_found):
        print(f"✅ Firebase updated successfully!")
        print(f"\n✅ Sync completed!")
        print(f"   {len(athletes_found)} athletes now in Firebase")
        return True
    else:
        print(f"❌ Firebase update failed!")
        return False


def main():
    """Main entry point"""
    try:
        success = sync_circle21_data()
        print("\n" + "="*60 + "\n")
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Sync cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
