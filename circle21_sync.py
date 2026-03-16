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

# Workout types for correct rank direction
WORKOUT_TYPES = {
    'LQ1': 'fortime',   # lower time = better
    'LQ2': 'maxweight', # higher weight (how_many) = better
    'LQ3': 'fortime',
    'LQ4': 'fortime',
    'LQ5': 'fortime',
    'LQ6': 'fortime',   # lower time = better
}

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
    "division_female": "6546e368-3f42-4c98-a42e-eb220486c81e",
    "division_team": "c0ebe4e1-afe1-44b7-9275-c433748f5d22",  # Team division for fetching all teams with IDs
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


def fetch_circle21_team_leaderboard():
    """
    Fetch Circle21 team leaderboard to get list of all registered teams with their IDs
    Returns JSON data with teams array: [{name, id, ...}, ...]
    """
    url = f"{CIRCLE21_API['base_url']}/team?competition_id={CIRCLE21_API['competition_id']}&division_id={CIRCLE21_API['division_team']}"
    
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
        print(f"  ❌ Error fetching team leaderboard: {e}")
        return None


def calculate_workout_rank(athlete_id, wod_data):
    """Look up athlete's rank using the position field pre-computed by Circle21.
    Only returns a rank if the athlete actually submitted a result."""
    if not wod_data.get('workouts'):
        return None
    workout_data = wod_data['workouts'][0]
    # Only athletes who have a result entry actually competed
    has_result = any(r.get('athlete_id') == athlete_id for r in workout_data.get('results', []))
    if not has_result:
        return None
    for athlete in workout_data.get('athletes', []):
        if athlete.get('id') == athlete_id:
            return athlete.get('position')
    return None


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
    
    # Get workout placements with detailed results
    workouts = {}
    for wod in leaderboard_data.get('wods', []):
        wod_name = wod['wod']['name']
        rank = calculate_workout_rank(athlete_id, wod)
        
        # Extract detailed workout result
        workout_result = None
        if wod.get('workouts'):
            workout_data = wod['workouts'][0]
            results = workout_data.get('results', [])
            for result in results:
                if result.get('athlete_id') == athlete_id:
                    workout_result = {
                        'rank': rank,
                        'time': result.get('time'),
                        'reps': result.get('how_many'),
                        'weight': result.get('weight'),
                        'tiebreak': result.get('athlete_tie_break'),
                        'score_text': result.get('score_text')  # Human-readable score
                    }
                    break
        
        # Store rank (for backwards compatibility) or detailed result
        workouts[wod_name] = workout_result if workout_result else rank
    
    # Calculate overall rank using Circle21 rules:
    # Sum of BEST 4 workout placements (lower is better)
    # Athletes with < 4 workouts rank lower than those with 4+
    completed_workouts = []
    for wod_name, wod_data in workouts.items():
        if wod_data is not None:
            # Handle both old format (just rank) and new format (dict with details)
            rank = wod_data['rank'] if isinstance(wod_data, dict) else wod_data
            if rank is not None:
                completed_workouts.append(rank)
    
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


def sync_all_team_scores():
    """
    Calculate scores for ALL teams in the competition and store in Firebase
    Uses Circle21 team leaderboard API to automatically fetch all registered teams
    """
    print("\n" + "="*60)
    print("🏆 SYNCING ALL TEAM SCORES")
    print("="*60 + "\n")
    
    # Fetch leaderboards (individual athlete data)
    print("🔄 Fetching leaderboard data...")
    male_data = fetch_circle21_leaderboard("M")
    female_data = fetch_circle21_leaderboard("F")
    
    if not male_data or not female_data:
        print("❌ Failed to fetch leaderboard data")
        return False
    
    print(f"✅ Fetched {len(male_data['athletes'])}M + {len(female_data['athletes'])}F athletes")
    
    # Fetch team leaderboard (all registered teams with IDs)
    print("\n🔄 Fetching team leaderboard...")
    team_leaderboard = fetch_circle21_team_leaderboard()
    
    if not team_leaderboard or 'teams' not in team_leaderboard:
        print("❌ Failed to fetch team leaderboard")
        return False
    
    registered_teams = team_leaderboard['teams']
    print(f"✅ Found {len(registered_teams)} registered teams in Circle21")
    
    # Fetch rosters for all registered teams
    print("\n🔄 Fetching team rosters from Circle21...")
    team_rosters = {}  # {team_name: {'males': [], 'females': []}}
    
    for team in registered_teams:
        team_name = team.get('name')
        team_id = team.get('id')
        
        if not team_name or not team_id:
            continue
        
        # Fetch team members
        members = fetch_team_members(team_id)
        if not members:
            continue
        
        # Match members to leaderboard data to get full athlete info
        roster = {'males': [], 'females': []}
        
        for member in members:
            gender = member['gender']
            athlete_data = male_data if gender == 'M' else female_data
            
            # Find matching athlete in leaderboard
            for athlete in athlete_data['athletes']:
                if athlete.get('name', '').lower() == member['name'].lower():
                    roster['males' if gender == 'M' else 'females'].append(athlete)
                    break
        
        team_rosters[team_name] = roster
    
    print(f"✅ Loaded {len(team_rosters)} team rosters")
    
    # Build set of athletes assigned to registered teams
    print("\n🔄 Extracting remaining athletes...")
    assigned_athlete_ids = set()
    for roster in team_rosters.values():
        for athlete in roster['males'] + roster['females']:
            assigned_athlete_ids.add(athlete['id'])
    
    # Group remaining athletes by club_name (fallback for unregistered teams)
    teams = {}
    teams.update(team_rosters)  # Start with registered teams
    
    # Process males not yet assigned
    for athlete in male_data['athletes']:
        if athlete['id'] in assigned_athlete_ids:
            continue
        
        club_name = athlete.get('club_name')
        if not club_name or club_name == 'null':
            continue
        
        if club_name not in teams:
            teams[club_name] = {'males': [], 'females': []}
        teams[club_name]['males'].append(athlete)
    
    # Process females not yet assigned
    for athlete in female_data['athletes']:
        if athlete['id'] in assigned_athlete_ids:
            continue
        
        club_name = athlete.get('club_name')
        if not club_name or club_name == 'null':
            continue
        
        if club_name not in teams:
            teams[club_name] = {'males': [], 'females': []}
        teams[club_name]['females'].append(athlete)
    
    print(f"✅ Found {len(teams)} teams total")
    
    # Override with Firebase names for WUID teams (special case - manually tracked athletes)
    print("\n🔄 Applying Firebase team names for tracked teams...")
    firebase_athletes = []
    try:
        firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21/leaderboard.json"
        with urllib.request.urlopen(firebase_url) as response:
            firebase_data = json.loads(response.read().decode('utf-8'))
            if firebase_data:
                if isinstance(firebase_data, dict) and 'athletes' in firebase_data:
                    firebase_athletes = firebase_data['athletes']
                elif isinstance(firebase_data, list):
                    firebase_athletes = firebase_data
    except Exception as e:
        print(f"  ⚠️  Could not load Firebase data: {e}")
    
    if firebase_athletes:
        print(f"  ✅ Loaded {len(firebase_athletes)} athletes from Firebase")
        
        # For WUID teams: use Firebase data DIRECTLY (not Circle21 API)
        # This ensures we use the correct roster without duplicates
        print("  🔄 Building WUID teams from Firebase data...")
        wuid_teams = {}
        for fb_athlete in firebase_athletes:
            if not isinstance(fb_athlete, dict):
                continue
            
            fb_team_name = fb_athlete.get('team_name', '')
            if 'wuid' not in fb_team_name.lower():
                continue
            
            if fb_team_name not in wuid_teams:
                wuid_teams[fb_team_name] = {'males': [], 'females': []}
            
            # Convert Firebase athlete to Circle21 format
            gender = fb_athlete.get('gender', 'M')
            athlete_data = {
                'name': fb_athlete.get('name'),
                'id': fb_athlete.get('id', fb_athlete.get('name')),
                'gender': gender,
                'firebase_workouts': fb_athlete.get('workouts', {})
            }
            
            if gender == 'M':
                wuid_teams[fb_team_name]['males'].append(athlete_data)
            else:
                wuid_teams[fb_team_name]['females'].append(athlete_data)
        
        if wuid_teams:
            print(f"  ✅ Built {len(wuid_teams)} WUID teams from Firebase:")
            for wuid_team, roster in wuid_teams.items():
                print(f"    {wuid_team}: {len(roster['males'])}M + {len(roster['females'])}F")
        
        # Replace Circle21 WUID teams with Firebase WUID teams
        firebase_teams = {}
        for team_name, roster in teams.items():
            if 'wuid' not in team_name.lower():
                firebase_teams[team_name] = roster
        
        firebase_teams.update(wuid_teams)
        teams = firebase_teams
        print(f"✅ Applied Firebase names, now {len(teams)} teams")
    
    # Calculate score for each team
    print("\n🔄 Calculating team scores...")
    workout_names = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6']
    
    # PRE-CALCULATE rank maps for each workout
    print("  📊 Pre-calculating workout rankings...")
    male_rank_maps = []
    female_rank_maps = []
    
    def build_rank_map(workout):
        """Build {athlete_id: position} using Circle21's pre-computed positions,
        only for athletes who actually submitted a result."""
        results_ids = {r['athlete_id'] for r in workout.get('results', [])}
        return {
            a['id']: a['position']
            for a in workout.get('athletes', [])
            if a.get('position') is not None and a['id'] in results_ids
        }
    
    for wod_entry in male_data.get('wods', []):
        workout = wod_entry['workouts'][0] if wod_entry.get('workouts') else {}
        male_rank_maps.append(build_rank_map(workout))
    
    for wod_entry in female_data.get('wods', []):
        workout = wod_entry['workouts'][0] if wod_entry.get('workouts') else {}
        female_rank_maps.append(build_rank_map(workout))
    
    print(f"  ✅ Rank maps built for {len(male_rank_maps)} male + {len(female_rank_maps)} female workouts")
    
    team_scores = {}
    
    for team_name, roster in teams.items():
        males = roster['males']
        females = roster['females']
        
        # Build athlete objects with workout ranks
        team_athletes = []
        
        # Process males
        for athlete in males:
            workouts = {}
            
            # Check if this is a Firebase athlete (WUID) with pre-loaded workout data
            if 'firebase_workouts' in athlete:
                fb_workouts = athlete['firebase_workouts']
                for workout_name in workout_names:
                    wod_val = fb_workouts.get(workout_name)
                    if wod_val is None:
                        continue
                    if isinstance(wod_val, dict) and 'rank' in wod_val:
                        workouts[workout_name] = {'rank': wod_val['rank']}
                    elif isinstance(wod_val, int):
                        workouts[workout_name] = {'rank': wod_val}
            else:
                # Look up ranks from Circle21 API rank maps
                athlete_id = athlete['id']
                for idx, workout_name in enumerate(workout_names):
                    if idx < len(male_rank_maps):
                        rank = male_rank_maps[idx].get(athlete_id)
                        if rank:
                            workouts[workout_name] = {'rank': rank}
            
            team_athletes.append({
                'name': athlete['name'],
                'gender': 'M',
                'workouts': workouts
            })
        
        # Process females
        for athlete in females:
            workouts = {}
            
            # Check if this is a Firebase athlete (WUID) with pre-loaded workout data
            if 'firebase_workouts' in athlete:
                fb_workouts = athlete['firebase_workouts']
                for workout_name in workout_names:
                    wod_val = fb_workouts.get(workout_name)
                    if wod_val is None:
                        continue
                    if isinstance(wod_val, dict) and 'rank' in wod_val:
                        workouts[workout_name] = {'rank': wod_val['rank']}
                    elif isinstance(wod_val, int):
                        workouts[workout_name] = {'rank': wod_val}
            else:
                # Look up ranks from Circle21 API rank maps
                athlete_id = athlete['id']
                for idx, workout_name in enumerate(workout_names):
                    if idx < len(female_rank_maps):
                        rank = female_rank_maps[idx].get(athlete_id)
                        if rank:
                            workouts[workout_name] = {'rank': rank}
            
            team_athletes.append({
                'name': athlete['name'],
                'gender': 'F',
                'workouts': workouts
            })
        
        # Calculate team score
        team_score = calculate_team_score_from_athletes(team_name, team_athletes)
        team_scores[team_name] = team_score
    
    print(f"✅ Calculated {len(team_scores)} team scores")
    
    # Store in Firebase
    print("\n📤 Updating Firebase with team scores...")
    firebase_url = f"{FIREBASE_CONFIG['databaseURL']}/circle21/team_scores.json?auth={FIREBASE_CONFIG['apiKey']}"
    
    team_scores_array = [
        {
            'team_name': team_name,
            **score_data
        }
        for team_name, score_data in team_scores.items()
    ]
    
    data_to_store = {
        'teams': team_scores_array,
        'metadata': {
            'last_sync': int(datetime.now().timestamp()),
            'sync_timestamp_readable': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_teams': len(team_scores)
        }
    }
    
    try:
        req = urllib.request.Request(
            firebase_url,
            data=json.dumps(data_to_store).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='PUT'
        )
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                valid_count = len([t for t in team_scores_array if t.get('valid')])
                invalid_count = len([t for t in team_scores_array if not t.get('valid')])
                print(f"✅ Team scores updated in Firebase!")
                print(f"   {valid_count} valid teams, {invalid_count} invalid teams")
                return True
    except urllib.error.URLError as e:
        print(f"❌ Firebase update failed: {e}")
        return False


def calculate_team_score_from_athletes(team_name, athletes):
    """Calculate team score from athlete list (Python version of JS function)"""
    females = [a for a in athletes if a['gender'] == 'F']
    males = [a for a in athletes if a['gender'] == 'M']
    
    workout_names = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6']
    
    # Process athletes - mark as valid if 4+ workouts
    def process_athlete(athlete):
        workouts = athlete.get('workouts', {})
        completed = sum(1 for wod in workout_names if workouts.get(wod))
        return {
            'name': athlete['name'],
            'workouts': {wod: workouts.get(wod, {}).get('rank') for wod in workout_names},
            'completed': completed,
            'valid': completed >= 4
        }
    
    processed_females = [process_athlete(a) for a in females]
    processed_males = [process_athlete(a) for a in males]
    
    # Calculate score for each workout
    workout_scores = []
    for wod in workout_names:
        # Get valid athletes who completed this workout
        valid_f = [a for a in processed_females if a['valid'] and a['workouts'].get(wod)]
        valid_m = [a for a in processed_males if a['valid'] and a['workouts'].get(wod)]
        
        if len(valid_f) >= 3 and len(valid_m) >= 3:
            # Sort and take best 3
            valid_f.sort(key=lambda a: a['workouts'][wod])
            valid_m.sort(key=lambda a: a['workouts'][wod])
            
            best_f = valid_f[:3]
            best_m = valid_m[:3]
            
            score = sum(a['workouts'][wod] for a in best_f + best_m)
            workout_scores.append({'wod': wod, 'score': score})
    
    # Take best 4 workouts
    if len(workout_scores) >= 4:
        workout_scores.sort(key=lambda w: w['score'])
        best_4 = workout_scores[:4]
        total = sum(w['score'] for w in best_4)
        
        return {
            'team_name': team_name,
            'total_score': total,
            'valid_workouts': len(workout_scores),
            'valid': True,
            'valid_females': len([a for a in processed_females if a['valid']]),
            'valid_males': len([a for a in processed_males if a['valid']])
        }
    
    return {
        'team_name': team_name,
        'total_score': None,
        'valid_workouts': len(workout_scores),
        'valid': False,
        'valid_females': len([a for a in processed_females if a['valid']]),
        'valid_males': len([a for a in processed_males if a['valid']])
    }


def main():
    """Main entry point"""
    try:
        # Sync athlete data
        success = sync_circle21_data()
        
        # Also sync team scores
        if success:
            team_success = sync_all_team_scores()
        
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
