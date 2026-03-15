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

# Teams to track - format: {"Team Name": "team_id"}
TEAMS_TO_TRACK = {
    "CrossFit WUID 1": "ff20e796-8ad9-4ade-a371-c35e9960cc8c",
    "CrossFit WUID 2": "7214e07a-285f-4644-a396-1d8757c66914"
}

# Legacy: Individual athletes to track (DEPRECATED - use teams instead)
# Kept for backwards compatibility, will be merged with team rosters
ATHLETES_TO_TRACK = [
    # Athletes not in a team can still be tracked individually
    # Format: ("Name", "Gender", optional_identifier)
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
    "division_female": "6546e368-3f42-4c98-a42e-eb220486c81e",  # TODO: Get female division ID
    "bearer_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ODlmMDRjZC1iNWRhLTQ2ZTUtOTg0Yy1kYjU3YmIxOWNlZjIiLCJqdGkiOiJmZDE1NzM3MDM2YTczYWIyZTY4MjAyNmQ4YmJiMzdlNDVhNjY0YjlkZmM5YzI5YmFjZWFlMGIzNzZhYTdjZjM0ODZhZGM2ODhlYThmZmMyNiIsImlhdCI6MTc3Mjk4NjU5MC44NzI1MiwibmJmIjoxNzcyOTg2NTkwLjg3MjUyMywiZXhwIjoxODA0NTIyNTkwLjg2NjUzNywic3ViIjoiMzA1Y2M1ZGItMGNmMS00MzFiLThjYzktYjg5MWFiOWQwMzNmIiwic2NvcGVzIjpbXX0.qTGPTD2SmVhihQgeX_yYEjNXU8wuyXJOrm9OliEbWNUf48LoY1xRONGjtIQPbdVdk-7Ye2kpvyNOfdrT7N8dKCWPIht9wLXafasFGF4qRrdD-EPxPuR6Ygxvu-tmlrDEbTj9mF94bucWuil83cXfAVAYrTyGITa-mK26bPIBHGC-Wbk0VJzDGL9a4oiQEo_RDHyh3MOrkA_iralEStNYfdZ-jF8nJVsPkeWVcPYnyZK1Ar0NuIFD0yIEhGbaJKbZu8RoJDgFwAk2aRyrAhVSc1cRg6tF49VAISJAk-KGJr4Bs7Yw7rop89dOVdzh-ZeyqLvdMR4tpQzpt8t7Y6KSXl9Rmq9OYuOThfavvqir5CqCQmYWixy2yrXHwcqhBcVk0SvajUmRuKrDyqPrcv5xWFQjcDD_rYFPj355FQoZDmbqyhsp2P7NRMlXdCjWtwInnOQ2q1zGKnaXATkD1yHMD_C3bTqlxLLQy2odTQmX9U6Ggp8B6ZEvyL2GICEL7ZFT427M3O0WJhDSPRpR2w9K1bIyoRGzPy2t_aOfLwqoD3x-PxljIfB1O6hxbf1kSz3oeWjVvBkTm48V48v2fwgfubSiclm8hLn3wHErSj_u4LY8gQR42DSKGDHpSZVw8W0TNQ8RGTcwOs5WDnlh0FG5WAWc1CWXBvTVlSkXF3IIb6M"
}


# ====================
# FUNCTIONS
# ====================

def fetch_team_members(team_id):
    """Fetch team members from Circle21 API"""
    url = f"https://api.circle21.events/api/teams/{team_id}/member"
    
    try:
        req = urllib.request.Request(
            url,
            headers={'Authorization': f"Bearer {CIRCLE21_API['bearer_token']}"}
        )
        
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())
            
        # Extract athlete info from member list
        athletes = []
        if isinstance(data, list):
            for member in data:
                if 'athlete' in member:
                    athlete = member['athlete']
                    user = athlete.get('user', {})
                    
                    name = user.get('name')
                    gender_raw = user.get('gender', '').lower()  # 'm' or 'f' (lowercase)
                    gender = gender_raw.upper() if gender_raw in ['m', 'f'] else None
                    
                    if name and gender:
                        athletes.append({
                            'name': name,
                            'gender': gender,
                            'user_id': athlete.get('user_id')
                        })
        
        return athletes
        
    except Exception as e:
        print(f"  ❌ Error fetching team members: {e}")
        return []


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
    athlete_tiebreak = athlete_result.get('athlete_tie_break') or 999999999
    
    rank = 1
    for result in results:
        other_time = result.get('time') or 999999999
        other_reps = result.get('how_many') or 0
        other_tiebreak = result.get('athlete_tie_break') or 999999999
        
        # Scoring logic with tiebreaker:
        # 1. If different completion times, lower wins
        # 2. If both capped (same time), more reps wins
        # 3. If same reps, lower tiebreak time wins (reached that rep count faster)
        if other_time < athlete_time:
            rank += 1
        elif other_time == athlete_time and other_reps > athlete_reps:
            rank += 1
        elif other_time == athlete_time and other_reps == athlete_reps and other_tiebreak < athlete_tiebreak:
            rank += 1
    
    return rank


def calculate_overall_rank(leaderboard_data, athlete_id, athlete_score):
    """Calculate overall rank based on Circle21 rules (sum of best 4 workouts)
    
    Args:
        leaderboard_data: Full API response
        athlete_id: ID of the athlete to rank
        athlete_score: Sum of best 4 workout placements (with penalty if < 4 workouts)
        
    Returns:
        Overall rank (1-based)
    """
    # Calculate scores for all athletes
    athlete_scores = []
    total_athletes = len(leaderboard_data.get('athletes', []))
    
    for athlete in leaderboard_data.get('athletes', []):
        other_id = athlete['id']
        
        # Get all workout placements for this athlete
        placements = []
        for wod in leaderboard_data.get('wods', []):
            rank = calculate_workout_rank(other_id, wod)
            if rank is not None:
                placements.append(rank)
        
        # Calculate score (sum of best 4)
        if len(placements) >= 4:
            best_4 = sorted(placements)[:4]
            score = sum(best_4)
        else:
            # Not enough workouts - add penalty
            # Penalty = (4 - num_completed) * total_athletes
            completed_sum = sum(sorted(placements)) if placements else 0
            missing_workouts = 4 - len(placements)
            penalty = missing_workouts * total_athletes
            score = completed_sum + penalty
        
        athlete_scores.append((other_id, score))
    
    # Sort by score (lower is better)
    athlete_scores.sort(key=lambda x: x[1])
    
    # Find rank (1-based)
    for rank, (other_id, score) in enumerate(athlete_scores, 1):
        if other_id == athlete_id:
            return rank
    
    return None


def find_athlete_data(athlete_name, gender, leaderboard_data, identifier=None):
    """Find athlete in leaderboard and extract all placement data
    
    Args:
        athlete_name: Name of the athlete
        gender: M or F
        leaderboard_data: API response data
        identifier: Optional - can be age (int) or partial user_id (str) to resolve duplicates
    """
    if not leaderboard_data:
        return None
    
    # Find all athletes matching the name
    matching_athletes = []
    
    for athlete in leaderboard_data.get('athletes', []):
        if athlete.get('name', '').lower() == athlete_name.lower():
            matching_athletes.append(athlete)
    
    if not matching_athletes:
        return None
    
    # Handle duplicates
    if len(matching_athletes) > 1:
        print(f"   ⚠️  DUPLICATE: Found {len(matching_athletes)} athletes named '{athlete_name}':")
        for ath in matching_athletes:
            print(f"      Age {ath.get('age')} - {ath.get('club_name')} - {ath.get('points')} pts - UserID: {ath.get('user_id')[:8]}...")
        
        # Try to resolve with identifier
        if identifier:
            selected = None
            if isinstance(identifier, int):  # Age-based selection
                for ath in matching_athletes:
                    if ath.get('age') == identifier:
                        selected = ath
                        print(f"   ✅ Selected by age {identifier}")
                        break
            elif isinstance(identifier, str):  # User ID-based selection
                for ath in matching_athletes:
                    if identifier.lower() in ath.get('user_id', '').lower():
                        selected = ath
                        print(f"   ✅ Selected by user_id '{identifier}'")
                        break
            
            if selected:
                athlete_info = selected
            else:
                print(f"   ❌ Identifier '{identifier}' didn't match any duplicate - using first")
                athlete_info = matching_athletes[0]
        else:
            # No identifier - use first match and warn
            athlete_info = matching_athletes[0]
            print(f"   ⚠️  No identifier provided - defaulting to first match")
            print(f"      To specify which one, add identifier: (\"{athlete_name}\", \"{gender}\", age_or_userid)")
    else:
        # Single match - no ambiguity
        athlete_info = matching_athletes[0]
    
    athlete_id = athlete_info['id']
    
    # Get workout placements
    workouts = {}
    for wod in leaderboard_data.get('wods', []):
        wod_name = wod['wod']['name']
        rank = calculate_workout_rank(athlete_id, wod)
        workouts[wod_name] = rank
    
    # Calculate overall rank using Circle21 rules:
    # Sum of BEST 4 workout placements (lower is better)
    # Athletes with < 4 workouts rank lower than those with 4+
    completed_workouts = [r for r in workouts.values() if r is not None]
    total_athletes = len(leaderboard_data.get('athletes', []))
    
    if len(completed_workouts) >= 4:
        # Take best 4 placements (lowest ranks)
        best_4 = sorted(completed_workouts)[:4]
        overall_score = sum(best_4)
    else:
        # Not enough workouts - add penalty
        # Penalty = (4 - num_completed) * total_athletes
        completed_sum = sum(sorted(completed_workouts)) if completed_workouts else 0
        missing_workouts = 4 - len(completed_workouts)
        penalty = missing_workouts * total_athletes
        overall_score = completed_sum + penalty
    
    # Calculate actual overall rank by comparing to all athletes
    overall_rank = calculate_overall_rank(leaderboard_data, athlete_id, overall_score)
    
    return {
        'name': athlete_name,
        'gender': gender,
        'overall': overall_rank,
        'overall_score': overall_score,
        'workouts_completed': len(completed_workouts),
        'workouts': workouts,
        'timestamp': int(datetime.now().timestamp())
    }


def fetch_athletes_from_firebase():
    """Fetch athlete list from Firebase config
    
    Returns:
        List of tuples in format: (name, gender, identifier) or (name, gender)
        Returns None if not found or on error
    """
    firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21/config/athletes_to_track.json?auth={FIREBASE_CONFIG['apiKey']}"
    
    try:
        req = urllib.request.Request(firebase_url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            if data is None:
                return None
            
            # Empty list is valid (no athletes to track)
            if isinstance(data, list) and len(data) == 0:
                return []
            
            # Convert dict format back to tuples
            athletes_list = []
            for athlete in data:
                if athlete.get('identifier'):
                    # Try to convert to int if it's a numeric string
                    identifier = athlete['identifier']
                    try:
                        identifier = int(identifier)
                    except (ValueError, TypeError):
                        pass
                    athletes_list.append((athlete['name'], athlete['gender'], identifier))
                else:
                    athletes_list.append((athlete['name'], athlete['gender']))
            
            return athletes_list
    
    except Exception as e:
        # Silently fail - will use fallback
        return None


def fetch_teams_from_firebase():
    """Fetch team list from Firebase config
    
    Returns:
        Dict in format: {team_name: team_id}
        Returns None if not found or on error
    """
    firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21/config/teams_to_track.json?auth={FIREBASE_CONFIG['apiKey']}"
    
    try:
        req = urllib.request.Request(firebase_url)
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            
            if data is None:
                return None
            
            # Convert list format to dict
            if isinstance(data, list):
                teams_dict = {}
                for team in data:
                    if 'name' in team and 'id' in team:
                        teams_dict[team['name']] = team['id']
                return teams_dict if teams_dict else None
            
            # Already dict format
            elif isinstance(data, dict):
                return data
            
            return None
    
    except Exception as e:
        # Silently fail - will use fallback
        return None


def update_firebase(athletes_data):
    """Update Firebase Realtime Database with athlete data"""
    firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21/leaderboard.json?auth={FIREBASE_CONFIG['apiKey']}"
    
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
    print("🏆 Circle21 Sync Script (Team-Based)")
    print("="*60)
    
    # Try to fetch teams from Firebase first
    print(f"\n📥 Checking for team list in Firebase...")
    teams_to_track = fetch_teams_from_firebase()
    
    if teams_to_track:
        print(f"✅ Using team list from Firebase ({len(teams_to_track)} teams)")
    else:
        print(f"⚠️  No teams in Firebase, using hardcoded list")
        teams_to_track = TEAMS_TO_TRACK
    
    if not teams_to_track:
        print("⚠️  No teams configured! Add teams to Firebase or TEAMS_TO_TRACK dict.")
        return False
    
    # Fetch team rosters from Circle21
    print(f"\n🏃 Fetching team rosters from Circle21...")
    team_rosters = {}  # {team_name: [athlete_dict, ...]}
    
    for team_name, team_id in teams_to_track.items():
        print(f"   • {team_name}...")
        members = fetch_team_members(team_id)
        if members:
            team_rosters[team_name] = members
            males = sum(1 for m in members if m['gender'] == 'M')
            females = sum(1 for m in members if m['gender'] == 'F')
            print(f"     ✅ {len(members)} members ({males}M, {females}F)")
        else:
            team_rosters[team_name] = []
            print(f"     ⚠️  No members found")
    
    # Build complete athlete list with team associations
    athletes_by_name = {}  # {name: {gender, team_name, user_id}}
    
    for team_name, members in team_rosters.items():
        for member in members:
            name = member['name']
            # If duplicate name, keep first occurrence (or could merge)
            if name not in athletes_by_name:
                athletes_by_name[name] = {
                    'name': name,
                    'gender': member['gender'],
                    'team_name': team_name,
                    'user_id': member.get('user_id')
                }
    
    # Add any manually tracked athletes (legacy)
    for entry in ATHLETES_TO_TRACK:
        name = entry[0]
        gender = entry[1]
        if name not in athletes_by_name:
            athletes_by_name[name] = {
                'name': name,
                'gender': gender,
                'team_name': None,  # No team
                'identifier': entry[2] if len(entry) > 2 else None
            }
    
    print(f"\n📋 Total unique athletes to track: {len(athletes_by_name)}")
    males = sum(1 for a in athletes_by_name.values() if a['gender'] == 'M')
    females = sum(1 for a in athletes_by_name.values() if a['gender'] == 'F')
    print(f"   • Male: {males}")
    print(f"   • Female: {females}")
    
    # Fetch leaderboards
    print(f"\n🔄 Fetching leaderboard data from Circle21 API...")
    male_data = None
    female_data = None
    
    if males > 0:
        print(f"   Fetching male division...")
        male_data = fetch_circle21_leaderboard("M")
        if male_data:
            print(f"   ✅ Male data received ({len(male_data.get('athletes', []))} athletes)")
    
    if females > 0:
        print(f"   Fetching female division...")
        female_data = fetch_circle21_leaderboard("F")
        if female_data:
            print(f"   ✅ Female data received ({len(female_data.get('athletes', []))} athletes)")
    
    # Process athletes
    print(f"\n🔍 Processing athlete rankings...")
    results = []
    found_count = 0
    not_found = []
    
    for name, athlete_info in athletes_by_name.items():
        gender = athlete_info['gender']
        team_name = athlete_info.get('team_name')
        identifier = athlete_info.get('identifier')
        
        leaderboard_data = male_data if gender == "M" else female_data
        
        if not leaderboard_data:
            not_found.append((name, gender, team_name))
            continue
        
        athlete_data = find_athlete_data(name, gender, leaderboard_data, identifier)
        
        if athlete_data:
            # Add team information to athlete data
            athlete_data['team_name'] = team_name
            results.append(athlete_data)
            found_count += 1
            
            workouts_completed = athlete_data.get('workouts_completed', 0)
            score = athlete_data.get('overall_score', 0)
            score_display = f"{score} ({workouts_completed}/6)" if workouts_completed >= 4 else f"{score} ({workouts_completed}/6)*"
            team_display = f" [{team_name}]" if team_name else ""
            print(f"   ✅ {name} ({gender}){team_display} - Overall: #{athlete_data['overall']} | Score: {score_display}")
        else:
            not_found.append((name, gender, team_name))
            team_display = f" [{team_name}]" if team_name else ""
            print(f"   ❌ {name} ({gender}){team_display} - Not found")
    
    # Summary
    print(f"\n📊 Summary:")
    print(f"   Found: {found_count}")
    print(f"   Not Found: {len(not_found)}")
    
    if not_found:
        print(f"\n⚠️  Athletes not found:")
        for name, gender, team_name in not_found:
            team_display = f" [{team_name}]" if team_name else ""
            print(f"      - {name} ({gender}){team_display}")
    
    # Prepare data with metadata (total athlete counts per division)
    sync_data = {
        'athletes': results,
        'metadata': {
            'total_athletes_male': len(male_data.get('athletes', [])) if male_data else 0,
            'total_athletes_female': len(female_data.get('athletes', [])) if female_data else 0,
            'last_sync': int(datetime.now().timestamp()),
            'sync_timestamp_readable': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'teams_tracked': list(teams_to_track.keys())
        }
    }
    
    # Update Firebase
    print(f"\n📤 Updating Firebase database...")
    if update_firebase(sync_data):
        print(f"✅ Firebase updated successfully!")
        print(f"\n✅ Sync completed!")
        print(f"   {found_count} athletes now in Firebase")
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
