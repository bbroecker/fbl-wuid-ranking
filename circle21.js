// ====================================
// Circle21 Competition Tracking - ISOLATED MODULE
// ====================================
// This module is completely separate from the main athlete scoring system
// Uses its own Firebase path (/circle21) and localStorage key

// Circle21-specific storage key (different from main STORAGE_KEY)
const CIRCLE21_STORAGE_KEY = 'fbl-circle21-athletes-v2';

// Circle21 local cache
let circle21AthleteCache = [];
let circle21Metadata = {};
let circle21DataLoaded = false;

// Circle21 data structure: { name, gender, overall, workouts: {LQ1, LQ2, LQ3, LQ4, LQ5, LQ6}, timestamp }
// Metadata: { total_athletes_male, total_athletes_female, last_sync, sync_timestamp_readable }

// ====================================
// Firebase Integration (Separate Path)
// ====================================

// Setup Circle21 Firebase listener (completely separate from main athletes)
function setupCircle21FirebaseListener() {
    if (!window.database) {
        console.log('Circle21: Firebase not available, using localStorage only');
        return;
    }
    
    try {
        const circle21Ref = window.database.ref('circle21/leaderboard');
        circle21Ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Handle new structure with metadata
                if (data.athletes && Array.isArray(data.athletes)) {
                    circle21AthleteCache = data.athletes;
                    circle21Metadata = data.metadata || {};
                } 
                // Handle old structure (direct array)
                else if (Array.isArray(data)) {
                    circle21AthleteCache = data;
                    circle21Metadata = {};
                } else {
                    circle21AthleteCache = [];
                    circle21Metadata = {};
                }
                
                circle21DataLoaded = true;
                
                // Save to localStorage as backup
                localStorage.setItem(CIRCLE21_STORAGE_KEY, JSON.stringify({
                    athletes: circle21AthleteCache,
                    metadata: circle21Metadata
                }));
                
                // Debug: log gender breakdown
                const genderBreakdown = circle21AthleteCache.reduce((acc, a) => { 
                    acc[a.gender] = (acc[a.gender] || 0) + 1; 
                    return acc; 
                }, {});
                console.log(`Circle21: Loaded ${circle21AthleteCache.length} athletes from Firebase - Gender breakdown:`, genderBreakdown);
                
                // Update displays (only on user pages, not admin)
                const isAdminPage = document.getElementById('circle21-team-name') || document.getElementById('circle21-teams-list');
                if (!isAdminPage && typeof displayCircle21AthletesList === 'function') {
                    displayCircle21AthletesList();
                }
                if (typeof displayCircle21Leaderboard === 'function') {
                    populateCircle21TeamFilter();
                    displayCircle21Leaderboard();
                }
                if (typeof displayCircle21Workouts === 'function') {
                    populateCircle21WorkoutsTeamFilter();
                    populateCircle21WorkoutSelect();
                    displayCircle21Workouts();
                }
                
                console.log(`Circle21: Loaded ${circle21AthleteCache.length} athletes from Firebase`);
            } else {
                circle21AthleteCache = [];
                circle21Metadata = {};
                circle21DataLoaded = true;
            }
        }, (error) => {
            console.error('Circle21: Firebase error:', error);
            // Fall back to localStorage
            loadCircle21FromLocalStorage();
        });
    } catch (error) {
        console.error('Circle21: Failed to setup Firebase listener:', error);
        loadCircle21FromLocalStorage();
    }
}

// Load Circle21 data from localStorage
function loadCircle21FromLocalStorage() {
    const stored = localStorage.getItem(CIRCLE21_STORAGE_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        // Handle new structure with metadata
        if (data.athletes && Array.isArray(data.athletes)) {
            circle21AthleteCache = data.athletes;
            circle21Metadata = data.metadata || {};
        } 
        // Handle old structure (direct array)
        else if (Array.isArray(data)) {
            circle21AthleteCache = data;
            circle21Metadata = {};
        } else {
            circle21AthleteCache = [];
            circle21Metadata = {};
        }
    } else {
        circle21AthleteCache = [];
        circle21Metadata = {};
    }
    circle21DataLoaded = true;
}

// Get all Circle21 athletes
function getAllCircle21Athletes() {
    if (!circle21DataLoaded) {
        loadCircle21FromLocalStorage();
    }
    return circle21AthleteCache || [];
}

// Populate team filter dropdown dynamically
function populateCircle21TeamFilter() {
    const teamFilterEl = document.getElementById('circle21TeamFilter');
    if (!teamFilterEl) {
        console.log('Circle21: Team filter element not found');
        return;
    }
    
    console.log('Circle21: Populating team filter...');
    console.log('Circle21: Metadata:', circle21Metadata);
    
    // Store current selection
    const currentSelection = teamFilterEl.value || 'all';
    
    // Get unique team names from metadata (preferred) or athlete data
    let teams = [];
    
    // Try metadata first (has teams_tracked array)
    if (circle21Metadata && circle21Metadata.teams_tracked) {
        teams = circle21Metadata.teams_tracked;
        console.log('Circle21: Using teams from metadata:', teams);
    } else {
        // Fallback: extract unique team names from athlete data
        const allAthletes = getAllCircle21Athletes();
        const teamSet = new Set();
        allAthletes.forEach(athlete => {
            if (athlete.team_name && athlete.team_name !== 'null') {
                teamSet.add(athlete.team_name);
            }
        });
        teams = Array.from(teamSet).sort();
        console.log('Circle21: Using teams from athlete data:', teams);
    }
    
    // Clear existing options except "All Athletes"
    teamFilterEl.innerHTML = '<option value="all">All Athletes</option>';
    
    // Add team options
    teams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        teamFilterEl.appendChild(option);
    });
    
    // Restore previous selection if still valid
    if (currentSelection !== 'all' && teams.includes(currentSelection)) {
        teamFilterEl.value = currentSelection;
    } else {
        teamFilterEl.value = 'all';
    }
    
    console.log(`Circle21: Populated team filter with ${teams.length} teams:`, teams);
}

// Save Circle21 athletes (updates both Firebase and localStorage)
function saveAllCircle21Athletes(athletes) {
    circle21AthleteCache = athletes;
    
    // Save to localStorage
    localStorage.setItem(CIRCLE21_STORAGE_KEY, JSON.stringify(athletes));
    
    // Save to Firebase (separate path: /circle21/leaderboard)
    if (window.database) {
        try {
            const circle21Ref = window.database.ref('circle21/leaderboard');
            circle21Ref.set(athletes).catch(error => {
                console.error('Circle21: Error saving to Firebase:', error);
            });
        } catch (error) {
            console.error('Circle21: Failed to save to Firebase:', error);
        }
    }
}

// ====================================
// Admin Panel Functions
// ====================================

// Display Circle21 athletes list in admin panel
function displayCircle21AthletesList() {
    const container = document.getElementById('circle21-athletes-list');
    if (!container) return;
    
    const athletes = getAllCircle21Athletes();
    
    if (athletes.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 40px;">No athletes synced yet. Run <code>circle21_sync.py</code> to fetch data.</p>';
        return;
    }
    
    // Group by gender
    const males = athletes.filter(a => a.gender === 'M');
    const females = athletes.filter(a => a.gender === 'F');
    
    let html = '';
    
    // Male athletes
    if (males.length > 0) {
        html += '<h4 style="color: #2196F3; margin-top: 20px;">Male Athletes</h4>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px;">';
        
        males.forEach(athlete => {
            const workouts = athlete.workouts || {};
            const workoutsCompleted = Object.values(workouts).filter(v => v !== null).length;
            
            // Calculate which workouts are in the best 4 (for athletes with 4+ workouts)
            let best4Workouts = new Set();
            if (workoutsCompleted >= 4) {
                const workoutsList = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6']
                    .map(wod => ({ wod, rank: workouts[wod] }))
                    .filter(w => w.rank !== null && w.rank !== undefined);
                
                // Sort by rank (lower is better) and take top 4
                workoutsList.sort((a, b) => a.rank - b.rank);
                workoutsList.slice(0, 4).forEach(w => best4Workouts.add(w.wod));
            }
            
            html += `
                <div style="background: #1a2a3a; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
                    <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">${athlete.name}</div>
                    <div style="color: #999; font-size: 13px; margin-bottom: 10px;">
                        <div>Overall: <strong style="color: #64b5f6;">#${athlete.overall}</strong></div>
                        <div>Workouts: ${workoutsCompleted}/6 completed</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 12px;">
                        ${['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'].map(wod => {
                            const isBest4 = best4Workouts.has(wod);
                            const color = workouts[wod] 
                                ? (isBest4 ? '#008AC2' : '#4CAF50')
                                : '#666';
                            return `<div style="background: #0d1820; padding: 5px; border-radius: 4px; text-align: center;">
                                <div style="color: #666;">${wod}</div>
                                <div style="color: ${color}; font-weight: ${isBest4 ? 'bold' : '600'};">
                                    ${workouts[wod] ? '#' + workouts[wod] : '-'}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Female athletes
    if (females.length > 0) {
        html += '<h4 style="color: #E91E63; margin-top: 30px;">Female Athletes</h4>';
        html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 15px; margin-top: 15px;">';
        
        females.forEach(athlete => {
            const workouts = athlete.workouts || {};
            const workoutsCompleted = Object.values(workouts).filter(v => v !== null).length;
            
            // Calculate which workouts are in the best 4 (for athletes with 4+ workouts)
            let best4Workouts = new Set();
            if (workoutsCompleted >= 4) {
                const workoutsList = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6']
                    .map(wod => ({ wod, rank: workouts[wod] }))
                    .filter(w => w.rank !== null && w.rank !== undefined);
                
                // Sort by rank (lower is better) and take top 4
                workoutsList.sort((a, b) => a.rank - b.rank);
                workoutsList.slice(0, 4).forEach(w => best4Workouts.add(w.wod));
            }
            
            html += `
                <div style="background: #1a2a3a; padding: 15px; border-radius: 8px; border-left: 4px solid #E91E63;">
                    <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">${athlete.name}</div>
                    <div style="color: #999; font-size: 13px; margin-bottom: 10px;">
                        <div>Overall: <strong style="color: #F48FB1;">#${athlete.overall}</strong></div>
                        <div>Workouts: ${workoutsCompleted}/6 completed</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 12px;">
                        ${['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'].map(wod => {
                            const isBest4 = best4Workouts.has(wod);
                            const color = workouts[wod] 
                                ? (isBest4 ? '#008AC2' : '#4CAF50')
                                : '#666';
                            return `<div style="background: #0d1820; padding: 5px; border-radius: 4px; text-align: center;">
                                <div style="color: #666;">${wod}</div>
                                <div style="color: ${color}; font-weight: ${isBest4 ? 'bold' : '600'};">
                                    ${workouts[wod] ? '#' + workouts[wod] : '-'}
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    html += '<p style="color: #999; margin-top: 20px; font-size: 13px; text-align: center;">💡 To add/remove athletes, edit <code>ATHLETES_TO_TRACK</code> in <code>circle21_sync.py</code> and run the script.</p>';
    container.innerHTML = html;
}

// ====================================
// Main Page Leaderboard
// ====================================

// Display Circle21 leaderboard (main page)
let circle21SortColumn = 'overall';
let circle21SortAscending = true;

function displayCircle21Leaderboard() {
    try {
        const container = document.getElementById('circle21-leaderboard-display');
        if (!container) {
            console.log('Circle21 Leaderboard: Container not found');
            return;
        }
        
        const genderFilterEl = document.getElementById('circle21GenderFilter');
        const genderFilter = genderFilterEl ? genderFilterEl.value : '';
        
        const teamFilterEl = document.getElementById('circle21TeamFilter');
        const teamFilter = teamFilterEl ? teamFilterEl.value : 'all';
        
        // Check if no gender selected
        if (!genderFilter || genderFilter === '') {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 80px 40px; font-size: 16px;">👆 Please select a gender above to view the leaderboard</p>';
            return;
        }
        
        const allAthletes = getAllCircle21Athletes();
        console.log(`Circle21 Leaderboard: Total athletes loaded: ${allAthletes.length}`);
        console.log(`Circle21 Leaderboard: Gender filter: "${genderFilter}"`);
        console.log(`Circle21 Leaderboard: Team filter: "${teamFilter}"`);
        console.log('Circle21 Leaderboard: Gender breakdown:', 
            allAthletes.reduce((acc, a) => { 
                const g = a.gender || 'undefined';
                acc[g] = (acc[g] || 0) + 1; 
                return acc; 
            }, {}));
        
        // Filter by gender
        let athletes = allAthletes.filter(a => a.gender === genderFilter);
        
        // Filter by team if not "all"
        if (teamFilter && teamFilter !== 'all') {
            athletes = athletes.filter(a => a.team_name === teamFilter);
        }
        
        console.log(`Circle21 Leaderboard: Filtered athletes (${genderFilter}, ${teamFilter}): ${athletes.length}`);
        
        if (athletes.length > 0) {
            console.log('Circle21 Leaderboard: First filtered athlete:', athletes[0]);
        }
    
    if (athletes.length === 0) {
        const genderName = genderFilter === 'M' ? 'male' : 'female';
        const teamMsg = teamFilter !== 'all' ? ` in ${teamFilter}` : '';
        container.innerHTML = `<p style="text-align: center; color: #999; padding: 80px 40px;">No ${genderName} athletes${teamMsg}.<br><small>Admin can add teams by running the <code>circle21_sync.py</code> script.</small></p>`;
        return;
    }
    
    // Sort by current column
    sortCircle21Athletes(athletes, circle21SortColumn, circle21SortAscending);
    
    // Get total athlete count for current gender
    const totalAthletes = genderFilter === 'M' 
        ? (circle21Metadata.total_athletes_male || 0)
        : (circle21Metadata.total_athletes_female || 0);
    
    // Build header with total count
    let html = '';
    if (totalAthletes > 0) {
        const teamMsg = teamFilter !== 'all' ? ` from ${teamFilter}` : '';
        html += `<div style="text-align: center; color: #999; font-size: 13px; margin-bottom: 15px; padding: 8px; background: #1a1a1a; border-radius: 4px;">
            Tracking ${athletes.length} athlete${athletes.length !== 1 ? 's' : ''}${teamMsg} out of ${totalAthletes.toLocaleString()} total competitors
        </div>`;
    }
    
    // Build table
    html += '<div class="table-container"><table>';
    html += '<thead><tr>';
    html += `<th onclick="sortCircle21('overall')" style="cursor: pointer;">Overall ${circle21SortColumn === 'overall' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('name')" style="cursor: pointer;">Name ${circle21SortColumn === 'name' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('team_name')" style="cursor: pointer;">Team ${circle21SortColumn === 'team_name' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ1')" style="cursor: pointer;">LQ1 ${circle21SortColumn === 'LQ1' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ2')" style="cursor: pointer;">LQ2 ${circle21SortColumn === 'LQ2' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ3')" style="cursor: pointer;">LQ3 ${circle21SortColumn === 'LQ3' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ4')" style="cursor: pointer;">LQ4 ${circle21SortColumn === 'LQ4' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ5')" style="cursor: pointer;">LQ5 ${circle21SortColumn === 'LQ5' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ6')" style="cursor: pointer;">LQ6 ${circle21SortColumn === 'LQ6' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('score')" style="cursor: pointer;">Score ${circle21SortColumn === 'score' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('completed')" style="cursor: pointer;">Completed ${circle21SortColumn === 'completed' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += '</tr></thead><tbody>';
    
    athletes.forEach((athlete, index) => {
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        const workoutsCompleted = athlete.workouts_completed || 0;
        const score = athlete.overall_score || '-';
        const scoreDisplay = workoutsCompleted < 4 && score !== '-' ? `${score}*` : score;
        
        // Ensure workouts object exists
        const workouts = athlete.workouts || {};
        
        // Calculate which workouts are in the best 4 (for athletes with 4+ workouts)
        let best4Workouts = new Set();
        if (workoutsCompleted >= 4) {
            const workoutsList = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6']
                .map(wod => {
                    const wodData = workouts[wod];
                    // Handle both old format (number) and new format (object)
                    const rank = typeof wodData === 'object' ? wodData?.rank : wodData;
                    return { wod, rank };
                })
                .filter(w => w.rank !== null && w.rank !== undefined);
            
            // Sort by rank (lower is better) and take top 4
            workoutsList.sort((a, b) => a.rank - b.rank);
            workoutsList.slice(0, 4).forEach(w => best4Workouts.add(w.wod));
        }
        
        html += `<tr class="${rankClass}">`;
        html += `<td><strong>#${athlete.overall}</strong></td>`;
        html += `<td><strong>${athlete.name}</strong></td>`;
        html += `<td style="color: #999; font-size: 13px;">${athlete.team_name || '-'}</td>`;
        
        // Display workouts with blue highlighting for best 4
        ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'].forEach(wod => {
            const wodData = workouts[wod];
            // Handle both old format (number) and new format (object)
            const rank = typeof wodData === 'object' ? wodData?.rank : wodData;
            const isBest4 = best4Workouts.has(wod);
            const style = isBest4 ? 'font-weight: bold; color: #008AC2;' : '';
            const value = rank ? '#' + rank : '-';
            html += `<td style="${style}">${value}</td>`;
        });
        
        html += `<td style="text-align: center;">${scoreDisplay}</td>`;
        html += `<td style="text-align: center;">${workoutsCompleted}/6</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
    console.log(`Circle21 Leaderboard: Successfully rendered ${athletes.length} athletes`);
    
    } catch (error) {
        console.error('Circle21 Leaderboard: Error displaying leaderboard:', error);
        const container = document.getElementById('circle21-leaderboard-display');
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 40px;">Error loading leaderboard. Check console for details.</p>`;
        }
    }
}

// Sort Circle21 athletes array
function sortCircle21Athletes(athletes, column, ascending) {
    athletes.sort((a, b) => {
        let valA, valB;
        
        if (column === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (column === 'team_name') {
            valA = (a.team_name || '').toLowerCase();
            valB = (b.team_name || '').toLowerCase();
            return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (column === 'overall') {
            valA = a.overall;
            valB = b.overall;
        } else if (column === 'score') {
            valA = a.overall_score || 999999;
            valB = b.overall_score || 999999;
        } else if (column === 'completed') {
            valA = a.workouts_completed || 0;
            valB = b.workouts_completed || 0;
        } else {
            // Workout columns (LQ1-LQ6)
            const wodDataA = a.workouts[column];
            const wodDataB = b.workouts[column];
            // Handle both old format (number) and new format (object)
            valA = typeof wodDataA === 'object' ? (wodDataA?.rank || 999999) : (wodDataA || 999999);
            valB = typeof wodDataB === 'object' ? (wodDataB?.rank || 999999) : (wodDataB || 999999);
        }
        
        return ascending ? valA - valB : valB - valA;
    });
}

// Sort handler for column clicks
function sortCircle21(column) {
    if (circle21SortColumn === column) {
        circle21SortAscending = !circle21SortAscending;
    } else {
        circle21SortColumn = column;
        circle21SortAscending = true;
    }
    displayCircle21Leaderboard();
}

// ====================================
// Circle21 Workout Details Display
// ====================================

// Workout specifications (type and details)
const WORKOUT_SPECS = {
    'LQ1': { type: 'fortime', timecap: 1200000, totalReps: 150 }, // 20min cap, 150 reps total
    'LQ2': { type: 'maxweight', unit: 'kg' },
    'LQ3': { type: 'fortime', timecap: 1200000, totalReps: 285 }, // 20min cap
    'LQ4': { type: 'fortime', timecap: 720000, totalReps: 246 }, // 12min cap
    'LQ5': { type: 'fortime', timecap: 900000, totalReps: 132 }, // 15min cap, 132 reps total
    'LQ6': { type: 'amrap', timecap: 1200000, totalReps: null } // AMRAP - reps matter, show tiebreak
};

// Format time from milliseconds to MM:SS
function formatWorkoutTime(milliseconds) {
    if (!milliseconds) return '-';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Display Circle21 workout results
function displayCircle21Workouts() {
    try {
        const container = document.getElementById('circle21-workouts-display');
        if (!container) {
            console.log('Circle21 Workouts: Container not found');
            return;
        }
        
        const genderFilterEl = document.getElementById('circle21WorkoutsGenderFilter');
        const teamFilterEl = document.getElementById('circle21WorkoutsTeamFilter');
        const workoutSelectEl = document.getElementById('circle21WorkoutSelect');
        
        const genderFilter = genderFilterEl ? genderFilterEl.value : '';
        const teamFilter = teamFilterEl ? teamFilterEl.value : 'all';
        const selectedWorkout = workoutSelectEl ? workoutSelectEl.value : '';
        
        console.log('Circle21 Workouts: Gender:', genderFilter, 'Team:', teamFilter, 'Workout:', selectedWorkout);
        
        // Check if selections are complete
        if (!genderFilter || genderFilter === '') {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 80px 40px;">👆 Please select gender, team, and workout above</p>';
            return;
        }
        
        if (!selectedWorkout || selectedWorkout === '') {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 80px 40px;">👆 Please select a workout to view results</p>';
            return;
        }
        
        // Get all athletes and filter
        let athletes = getAllCircle21Athletes().filter(a => a.gender === genderFilter);
        
        if (teamFilter && teamFilter !== 'all') {
            athletes = athletes.filter(a => a.team_name === teamFilter);
        }
        
        console.log('Circle21 Workouts: Filtered athletes:', athletes.length);
        
        // Extract workout results for selected workout
        const workoutResults = [];
        athletes.forEach(athlete => {
            const workouts = athlete.workouts || {};
            const workoutData = workouts[selectedWorkout];
            
            if (workoutData) {
                const result = typeof workoutData === 'object' ? workoutData : { rank: workoutData };
                workoutResults.push({
                    name: athlete.name,
                    team: athlete.team_name || '-',
                    rank: result.rank,
                    time: result.time,
                    reps: result.reps,
                    weight: result.weight,
                    tiebreak: result.tiebreak,
                    score_text: result.score_text
                });
            }
        });
        
        console.log('Circle21 Workouts: Results found:', workoutResults.length);
        
        if (workoutResults.length === 0) {
            const genderName = genderFilter === 'M' ? 'male' : 'female';
            const teamMsg = teamFilter !== 'all' ? ` from ${teamFilter}` : '';
            container.innerHTML = `<p style="text-align: center; color: #999; padding: 80px 40px;">No ${genderName} athletes${teamMsg} have completed ${selectedWorkout}</p>`;
            return;
        }
        
        // Sort by rank
        workoutResults.sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
        
        // Get workout specifications
        const workoutSpec = WORKOUT_SPECS[selectedWorkout] || {};
        const isMaxWeight = workoutSpec.type === 'maxweight';
        const isForTime = workoutSpec.type === 'fortime';
        const isAmrap = workoutSpec.type === 'amrap';
        
        // Build table
        let html = `<div style="text-align: center; color: #999; font-size: 13px; margin-bottom: 15px; padding: 8px; background: #1a1a1a; border-radius: 4px;">
            ${selectedWorkout} Results - ${workoutResults.length} athlete${workoutResults.length !== 1 ? 's' : ''}
        </div>`;
        
        html += '<div class="table-container"><table>';
        html += '<thead><tr>';
        html += '<th>Rank</th>';
        html += '<th>Name</th>';
        html += '<th>Team</th>';
        html += '<th>Time</th>';
        
        // Adjust column headers based on workout type
        if (isMaxWeight) {
            html += `<th>Weight (${workoutSpec.unit || 'kg'})</th>`;
        } else {
            html += '<th>Reps</th>';
        }
        
        html += '</tr></thead><tbody>';
        
        workoutResults.forEach(result => {
            html += '<tr>';
            html += `<td style="text-align: center; font-weight: bold;">#${result.rank || '-'}</td>`;
            html += `<td>${result.name}</td>`;
            html += `<td style="color: #999;">${result.team}</td>`;
            html += `<td style="text-align: center;">${formatWorkoutTime(result.time)}</td>`;
            
            // Display reps or weight based on workout type
            if (isMaxWeight) {
                // Show weight for max weight workouts
                // Circle21 API stores weight in the reps field for max weight workouts
                const weightValue = result.weight !== null && result.weight !== undefined 
                    ? result.weight 
                    : (result.reps !== null && result.reps !== undefined ? result.reps : '-');
                html += `<td style="text-align: center;">${weightValue !== '-' ? weightValue + ' kg' : '-'}</td>`;
            } else {
                // For "for time" and AMRAP workouts
                let repsDisplay = '-';
                if (result.reps !== null && result.reps !== undefined && result.reps > 0) {
                    // Show actual reps completed
                    repsDisplay = result.reps;
                    // Show tiebreak for AMRAP or incomplete "for time" workouts
                    if (result.tiebreak) {
                        const showTiebreak = isAmrap || (workoutSpec.totalReps && result.reps < workoutSpec.totalReps);
                        if (showTiebreak) {
                            const tiebreakTime = formatWorkoutTime(result.tiebreak);
                            repsDisplay += ` (${tiebreakTime})`;
                        }
                    }
                } else if (isForTime && workoutSpec.totalReps && result.time && result.time <= workoutSpec.timecap) {
                    // Finished at or before time cap = completed all reps
                    repsDisplay = workoutSpec.totalReps;
                }
                html += `<td style="text-align: center;">${repsDisplay}</td>`;
            }
            
            html += '</tr>';
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Circle21 Workouts: Error displaying workouts:', error);
        const container = document.getElementById('circle21-workouts-display');
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: #f44336; padding: 40px;">Error loading workout data. Check console for details.</p>`;
        }
    }
}

// Populate workout select dropdown
function populateCircle21WorkoutSelect() {
    const workoutSelectEl = document.getElementById('circle21WorkoutSelect');
    if (!workoutSelectEl) {
        console.log('Circle21 Workouts: Workout select element not found');
        return;
    }
    
    // Get unique workout names from athlete data
    const allAthletes = getAllCircle21Athletes();
    console.log('Circle21 Workouts: Total athletes for workout list:', allAthletes.length);
    
    const workoutSet = new Set();
    
    allAthletes.forEach(athlete => {
        if (athlete.workouts) {
            Object.keys(athlete.workouts).forEach(wodName => {
                workoutSet.add(wodName);
            });
        }
    });
    
    const workouts = Array.from(workoutSet).sort();
    
    console.log(`Circle21 Workouts: Found ${workouts.length} unique workouts:`, workouts);
    
    // Clear and populate
    workoutSelectEl.innerHTML = '<option value="" selected disabled>-- Select Workout --</option>';
    workouts.forEach(wod => {
        const option = document.createElement('option');
        option.value = wod;
        option.textContent = wod;
        workoutSelectEl.appendChild(option);
    });
    
    console.log(`Circle21 Workouts: Populated workout select with ${workouts.length} workouts`);
}

// Populate team filter for workouts tab
function populateCircle21WorkoutsTeamFilter() {
    const teamFilterEl = document.getElementById('circle21WorkoutsTeamFilter');
    if (!teamFilterEl) {
        console.log('Circle21 Workouts: Team filter element not found');
        return;
    }
    
    // Get teams from metadata
    let teams = [];
    if (circle21Metadata && circle21Metadata.teams_tracked) {
        teams = circle21Metadata.teams_tracked;
        console.log('Circle21 Workouts: Using teams:', teams);
    } else {
        console.log('Circle21 Workouts: No teams in metadata');
    }
    
    // Clear and populate
    teamFilterEl.innerHTML = '<option value="all">All Athletes</option>';
    teams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        teamFilterEl.appendChild(option);
    });
    
    console.log(`Circle21 Workouts: Populated team filter with ${teams.length} teams`);
}

// ====================================
// Initialization
// ====================================

// Initialize Circle21 module (separate from main athlete initialization)
function initializeCircle21Module() {
    console.log('Circle21: Initializing module...');
    
    // Setup Firebase listener for Circle21 data (separate path)
    setupCircle21FirebaseListener();
    
    // Detect if we're on admin page or user page
    const isAdminPage = document.getElementById('circle21-team-name') || document.getElementById('circle21-teams-list');
    
    if (isAdminPage) {
        // Admin panel: show config list with add/remove buttons
        if (document.getElementById('circle21-teams-list')) {
            loadCircle21TrackedTeams();
        }
    } else {
        // User page: show leaderboard with scores
        if (document.getElementById('circle21-athletes-list')) {
            displayCircle21AthletesList();
        }
        if (document.getElementById('circle21-leaderboard-display')) {
            populateCircle21TeamFilter();
            displayCircle21Leaderboard();
        }
        if (document.getElementById('circle21-workouts-display')) {
            populateCircle21WorkoutsTeamFilter();
            populateCircle21WorkoutSelect();
            displayCircle21Workouts();
        }
        if (document.getElementById('team-leaderboard-display')) {
            displayTeamLeaderboard();
        }
        if (document.getElementById('team-breakdown-display')) {
            populateTeamBreakdownSelect();
        }
    }
    
    console.log('Circle21: Module initialized');
}

// ====================================
// Circle21 Team Management (Admin)
// ====================================

let circle21TrackedTeams = [];

// Load tracked teams from Firebase
function loadCircle21TrackedTeams() {
    if (!window.database) {
        document.getElementById('circle21-teams-list').innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 20px;">❌ Firebase not available</p>';
        return;
    }
    
    const teamsRef = window.database.ref('circle21/config/teams_to_track');
    
    teamsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        
        // Convert to array format for display
        if (data) {
            if (Array.isArray(data)) {
                circle21TrackedTeams = data;
            } else if (typeof data === 'object') {
                // Convert object {name: id} to array [{name, id}]
                circle21TrackedTeams = Object.entries(data).map(([name, id]) => ({name, id}));
            } else {
                circle21TrackedTeams = [];
            }
        } else {
            circle21TrackedTeams = [];
        }
        
        displayCircle21TrackedTeams();
    });
}

// Display tracked teams in admin panel
function displayCircle21TrackedTeams() {
    const container = document.getElementById('circle21-teams-list');
    const countElement = document.getElementById('circle21-teams-count');
    
    if (!container) return;
    
    countElement.textContent = circle21TrackedTeams.length;
    
    if (circle21TrackedTeams.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No teams tracked yet. Add your first team above!</p>';
        return;
    }
    
    let html = '<div style="display: grid; gap: 10px;">';
    
    circle21TrackedTeams.forEach((team, index) => {
        const teamIdShort = team.id.substring(0, 8) + '...';
        
        html += `
            <div style="background: #333; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 16px; color: #fff;">${team.name}</strong>
                    <div style="color: #888; font-size: 12px; margin-top: 4px;">ID: ${teamIdShort}</div>
                </div>
                <button onclick="removeCircle21Team(${index})" style="padding: 8px 16px; background: #e74c3c; border: none; border-radius: 5px; color: white; cursor: pointer; font-weight: 600;">
                    🗑️ Remove
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Add new team
function addCircle21Team() {
    const nameInput = document.getElementById('circle21-team-name');
    const idInput = document.getElementById('circle21-team-id');
    
    const name = nameInput.value.trim();
    const id = idInput.value.trim();
    
    // Validation
    if (!name) {
        alert('❌ Please enter a team name');
        return;
    }
    
    if (!id) {
        alert('❌ Please enter a team ID');
        return;
    }
    
    // Basic UUID validation
    if (id.length !== 36 || !id.match(/^[0-9a-f-]+$/i)) {
        alert('❌ Team ID should be a UUID (e.g., ff20e796-8ad9-4ade-a371-c35e9960cc8c)');
        return;
    }
    
    if (!window.database) {
        alert('❌ Firebase not available');
        return;
    }
    
    // Read current data from Firebase, modify, and save (prevents race conditions)
    const teamsRef = window.database.ref('circle21/config/teams_to_track');
    
    teamsRef.once('value')
        .then((snapshot) => {
            let currentTeams = snapshot.val() || [];
            
            // Ensure we have an array
            if (!Array.isArray(currentTeams)) {
                // Convert object format to array
                if (typeof currentTeams === 'object') {
                    currentTeams = Object.entries(currentTeams).map(([n, i]) => ({name: n, id: i}));
                } else {
                    currentTeams = [];
                }
            }
            
            // Check for duplicates
            const existsByName = currentTeams.some(t => t && t.name && t.name.toLowerCase() === name.toLowerCase());
            const existsById = currentTeams.some(t => t && t.id === id);
            
            if (existsByName) {
                alert('⚠️  A team with this name is already being tracked');
                throw new Error('duplicate');
            }
            
            if (existsById) {
                alert('⚠️  A team with this ID is already being tracked');
                throw new Error('duplicate');
            }
            
            // Add to list
            const newTeam = { name, id };
            currentTeams.push(newTeam);
            
            // Save back to Firebase
            return teamsRef.set(currentTeams);
        })
        .then(() => {
            // Clear form
            nameInput.value = '';
            idInput.value = '';
            
            // Show success message
            showToast(`✅ Added ${name} to Circle21 tracking`);
        })
        .catch((error) => {
            if (error.message !== 'duplicate') {
                console.error('Error adding team:', error);
                alert('❌ Error adding team: ' + (error.message || error));
            }
        });
}

// Remove team
function removeCircle21Team(index) {
    const team = circle21TrackedTeams[index];
    
    if (!confirm(`Remove ${team.name} from Circle21 tracking?\n\nAll athletes from this team will no longer be synced.`)) {
        return;
    }
    
    if (!window.database) {
        alert('❌ Firebase not available');
        return;
    }
    
    // Read current data from Firebase, modify, and save (prevents race conditions)
    const teamsRef = window.database.ref('circle21/config/teams_to_track');
    
    teamsRef.once('value')
        .then((snapshot) => {
            let currentTeams = snapshot.val() || [];
            
            // Ensure array format
            if (!Array.isArray(currentTeams)) {
                if (typeof currentTeams === 'object') {
                    currentTeams = Object.entries(currentTeams).map(([name, id]) => ({name, id}));
                } else {
                    currentTeams = [];
                }
            }
            
            // Remove by index
            if (index >= 0 && index < currentTeams.length) {
                currentTeams.splice(index, 1);
                return teamsRef.set(currentTeams);
            } else {
                return Promise.reject('Invalid index');
            }
        })
        .then(() => {
            showToast(`✅ Removed ${team.name} from Circle21 tracking`);
        })
        .catch((error) => {
            console.error('Error removing team:', error);
            alert('❌ Error removing team: ' + error.message);
        });
}

// ====================================
// Legacy Athlete Management Functions (kept for backwards compatibility)
// ====================================

let circle21TrackedAthletes = [];

// Load tracked athletes from Firebase (legacy)
function loadCircle21TrackedAthletes() {
    if (!window.database) {
        const container = document.getElementById('circle21-athletes-list');
        if (container) {
            container.innerHTML = '<p style="color: #ff6b6b; text-align: center; padding: 20px;">❌ Firebase not available</p>';
        }
        return;
    }
    
    const athletesRef = window.database.ref('circle21/config/athletes_to_track');
    
    athletesRef.on('value', (snapshot) => {
        circle21TrackedAthletes = snapshot.val() || [];
        displayCircle21TrackedAthletes();
    });
}

// Display tracked athletes in admin panel (legacy)
function displayCircle21TrackedAthletes() {
    const container = document.getElementById('circle21-athletes-list');
    const countElement = document.getElementById('circle21-count');
    
    if (!container) return;
    
    if (countElement) countElement.textContent = circle21TrackedAthletes.length;
    
    if (circle21TrackedAthletes.length === 0) {
        container.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">No athletes tracked yet. Use team-based tracking instead!</p>';
        return;
    }
    
    let html = '<div style="display: grid; gap: 10px;">';
    
    circle21TrackedAthletes.forEach((athlete, index) => {
        const identifierDisplay = athlete.identifier 
            ? `<span style="color: #888; font-size: 12px; margin-left: 10px;">ID: ${athlete.identifier}</span>` 
            : '';
        
        const genderBadge = athlete.gender === 'M' 
            ? '<span style="background: #3498db; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px;">M</span>'
            : '<span style="background: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px;">F</span>';
        
        html += `
            <div style="background: #333; padding: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong style="font-size: 16px; color: #fff;">${athlete.name}</strong>
                    ${genderBadge}
                    ${identifierDisplay}
                </div>
                <button onclick="removeCircle21Athlete(${index})" style="padding: 8px 16px; background: #e74c3c; border: none; border-radius: 5px; color: white; cursor: pointer; font-weight: 600;">
                    🗑️ Remove
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Add new athlete (legacy - deprecated)
function addCircle21Athlete() {
    alert('⚠️ Individual athlete tracking is deprecated. Please use team-based tracking instead.');
}

// Remove athlete (legacy)
function removeCircle21Athlete(index) {
    const athlete = circle21TrackedAthletes[index];
    
    if (!confirm(`Remove ${athlete.name} from Circle21 tracking?`)) {
        return;
    }
    
    if (!window.database) {
        alert('❌ Firebase not available');
        return;
    }
    
    // Read current data from Firebase, modify, and save (prevents race conditions)
    const athletesRef = window.database.ref('circle21/config/athletes_to_track');
    
    athletesRef.once('value')
        .then((snapshot) => {
            const currentAthletes = snapshot.val() || [];
            
            // Remove by index
            if (index >= 0 && index < currentAthletes.length) {
                currentAthletes.splice(index, 1);
                return athletesRef.set(currentAthletes);
            } else {
                return Promise.reject('Invalid index');
            }
        })
        .then(() => {
            showToast(`✅ Removed ${athlete.name} from Circle21 tracking`);
        })
        .catch((error) => {
            console.error('Error removing athlete:', error);
            alert('❌ Error removing athlete: ' + error.message);
        });
}

// Save tracked athletes to Firebase (legacy)
function saveCircle21TrackedAthletes() {
    if (!window.database) {
        alert('❌ Firebase not available');
        return;
    }
    
    const athletesRef = window.database.ref('circle21/config/athletes_to_track');
    
    athletesRef.set(circle21TrackedAthletes)
        .then(() => {
            console.log('Circle21: Tracked athletes saved to Firebase');
        })
        .catch((error) => {
            console.error('Circle21: Error saving tracked athletes:', error);
            alert('❌ Error saving to Firebase: ' + error.message);
        });
}

// Toast notification helper (reuse from main admin.html if available)
function showToast(message) {
    if (window.showToast) {
        window.showToast(message);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// ====================================
// TEAM SCORING CALCULATION (Shared Logic)
// ====================================

function calculateTeamScore(teamName) {
    const allAthletes = getAllCircle21Athletes();
    const teamAthletes = allAthletes.filter(a => a.team_name === teamName);
    
    if (teamAthletes.length === 0) {
        return {
            teamName,
            totalScore: null,
            validWorkouts: 0,
            valid: false,
            message: 'No athletes found'
        };
    }
    
    const females = teamAthletes.filter(a => a.gender === 'F');
    const males = teamAthletes.filter(a => a.gender === 'M');
    
    // Process athletes to calculate validity
    const processAthlete = (athlete) => {
        const workouts = athlete.workouts || {};
        const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
        
        const athleteWorkouts = {};
        let completed = 0;
        
        workoutNames.forEach(wod => {
            const wodData = workouts[wod];
            if (wodData) {
                const rank = typeof wodData === 'object' ? wodData.rank : wodData;
                athleteWorkouts[wod] = rank;
                if (rank) completed++;
            } else {
                athleteWorkouts[wod] = null;
            }
        });
        
        const validWorkouts = [];
        workoutNames.forEach(wod => {
            if (athleteWorkouts[wod]) {
                validWorkouts.push({ wod, rank: athleteWorkouts[wod] });
            }
        });
        
        validWorkouts.sort((a, b) => a.rank - b.rank);
        const valid = completed >= 4;
        
        return {
            name: athlete.name,
            workouts: athleteWorkouts,
            completed,
            valid
        };
    };
    
    const processedFemales = females.map(processAthlete);
    const processedMales = males.map(processAthlete);
    
    // Calculate workout scores and validity
    const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
    const workoutScores = {};
    const workoutValidity = {};
    
    workoutNames.forEach(wod => {
        const validFemalesForWod = processedFemales.filter(a => a.valid && a.workouts[wod]);
        const validMalesForWod = processedMales.filter(a => a.valid && a.workouts[wod]);
        
        validFemalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        validMalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        
        const best3Females = validFemalesForWod.slice(0, 3);
        const best3Males = validMalesForWod.slice(0, 3);
        
        const isValid = best3Females.length >= 3 && best3Males.length >= 3;
        
        const femaleScore = best3Females.reduce((sum, a) => sum + a.workouts[wod], 0);
        const maleScore = best3Males.reduce((sum, a) => sum + a.workouts[wod], 0);
        const totalWodScore = isValid ? (femaleScore + maleScore) : null;
        
        workoutScores[wod] = totalWodScore;
        workoutValidity[wod] = isValid;
    });
    
    // Find best 4 valid workouts
    const validWorkoutScores = [];
    workoutNames.forEach(wod => {
        if (workoutValidity[wod]) {
            validWorkoutScores.push({ wod, score: workoutScores[wod] });
        }
    });
    
    validWorkoutScores.sort((a, b) => a.score - b.score);
    const best4Workouts = validWorkoutScores.slice(0, 4);
    
    // Calculate team total score
    const teamTotalScore = validWorkoutScores.length >= 4 
        ? best4Workouts.reduce((sum, w) => sum + w.score, 0)
        : null;
    
    const validFemales = processedFemales.filter(a => a.valid).length;
    const validMales = processedMales.filter(a => a.valid).length;
    
    return {
        teamName,
        totalScore: teamTotalScore,
        validWorkouts: validWorkoutScores.length,
        valid: teamTotalScore !== null,
        validFemales,
        validMales,
        workoutScores,
        best4Workouts: best4Workouts.map(w => w.wod)
    };
}

function calculateTeamScoreFromAthletes(teamName, athleteArray) {
    const teamAthletes = athleteArray.filter(a => a.team_name === teamName);
    
    console.log(`Calculating score for "${teamName}": ${teamAthletes.length} athletes`);
    
    if (teamAthletes.length === 0) {
        return {
            teamName,
            totalScore: null,
            validWorkouts: 0,
            valid: false,
            message: 'No athletes found'
        };
    }
    
    const females = teamAthletes.filter(a => a.gender === 'F');
    const males = teamAthletes.filter(a => a.gender === 'M');
    
    console.log(`  ${teamName}: ${females.length}F, ${males.length}M`);
    
    // Show sample athlete with workouts
    if (teamAthletes.length > 0) {
        const sample = teamAthletes[0];
        console.log(`  Sample athlete:`, sample.name, sample.workouts);
    }
    
    // Process athletes
    const processAthlete = (athlete) => {
        const workouts = athlete.workouts || {};
        const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
        
        const athleteWorkouts = {};
        let completed = 0;
        
        workoutNames.forEach(wod => {
            const wodData = workouts[wod];
            if (wodData) {
                const rank = typeof wodData === 'object' ? wodData.rank : wodData;
                athleteWorkouts[wod] = rank;
                if (rank) completed++;
            } else {
                athleteWorkouts[wod] = null;
            }
        });
        
        const validWorkouts = [];
        workoutNames.forEach(wod => {
            if (athleteWorkouts[wod]) {
                validWorkouts.push({ wod, rank: athleteWorkouts[wod] });
            }
        });
        
        validWorkouts.sort((a, b) => a.rank - b.rank);
        const valid = completed >= 4;
        
        return {
            name: athlete.name,
            workouts: athleteWorkouts,
            completed,
            valid
        };
    };
    
    const processedFemales = females.map(processAthlete);
    const processedMales = males.map(processAthlete);
    
    // Calculate workout scores
    const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
    const workoutScores = {};
    const workoutValidity = {};
    
    workoutNames.forEach(wod => {
        const validFemalesForWod = processedFemales.filter(a => a.valid && a.workouts[wod]);
        const validMalesForWod = processedMales.filter(a => a.valid && a.workouts[wod]);
        
        validFemalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        validMalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        
        const best3Females = validFemalesForWod.slice(0, 3);
        const best3Males = validMalesForWod.slice(0, 3);
        
        const isValid = best3Females.length >= 3 && best3Males.length >= 3;
        
        const femaleScore = best3Females.reduce((sum, a) => sum + a.workouts[wod], 0);
        const maleScore = best3Males.reduce((sum, a) => sum + a.workouts[wod], 0);
        const totalWodScore = isValid ? (femaleScore + maleScore) : null;
        
        workoutScores[wod] = totalWodScore;
        workoutValidity[wod] = isValid;
    });
    
    // Find best 4 valid workouts
    const validWorkoutScores = [];
    workoutNames.forEach(wod => {
        if (workoutValidity[wod]) {
            validWorkoutScores.push({ wod, score: workoutScores[wod] });
        }
    });
    
    validWorkoutScores.sort((a, b) => a.score - b.score);
    const best4Workouts = validWorkoutScores.slice(0, 4);
    
    // Calculate team total
    const teamTotalScore = validWorkoutScores.length >= 4 
        ? best4Workouts.reduce((sum, w) => sum + w.score, 0)
        : null;
    
    const validFemales = processedFemales.filter(a => a.valid).length;
    const validMales = processedMales.filter(a => a.valid).length;
    
    return {
        teamName,
        totalScore: teamTotalScore,
        validWorkouts: validWorkoutScores.length,
        valid: teamTotalScore !== null,
        validFemales,
        validMales,
        workoutScores,
        best4Workouts: best4Workouts.map(w => w.wod)
    };
}

// ====================================
// TEAM LEADERBOARD DISPLAY
// ====================================

async function fetchFullCircle21Leaderboard() {
    const API_CONFIG = {
        base_url: 'https://api.circle21.events/api/leaderboard',
        competition_id: 'ca492eb3-516d-445b-8093-66b3df1c6465',
        division_male: '5b561478-69cb-435d-b090-53513293c22f',
        division_female: '6546e368-3f42-4c98-a42e-eb220486c81e',
        bearer_token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5ODlmMDRjZC1iNWRhLTQ2ZTUtOTg0Yy1kYjU3YmIxOWNlZjIiLCJqdGkiOiJmZDE1NzM3MDM2YTczYWIyZTY4MjAyNmQ4YmJiMzdlNDVhNjY0YjlkZmM5YzI5YmFjZWFlMGIzNzZhYTdjZjM0ODZhZGM2ODhlYThmZmMyNiIsImlhdCI6MTc3Mjk4NjU5MC44NzI1MiwibmJmIjoxNzcyOTg2NTkwLjg3MjUyMywiZXhwIjoxODA0NTIyNTkwLjg2NjUzNywic3ViIjoiMzA1Y2M1ZGItMGNmMS00MzFiLThjYzktYjg5MWFiOWQwMzNmIiwic2NvcGVzIjpbXX0.qTGPTD2SmVhihQgeX_yYEjNXU8wuyXJOrm9OliEbWNUf48LoY1xRONGjtIQPbdVdk-7Ye2kpvyNOfdrT7N8dKCWPIht9wLXafasFGF4qRrdD-EPxPuR6Ygxvu-tmlrDEbTj9mF94bucWuil83cXfAVAYrTyGITa-mK26bPIBHGC-Wbk0VJzDGL9a4oiQEo_RDHyh3MOrkA_iralEStNYfdZ-jF8nJVsPkeWVcPYnyZK1Ar0NuIFD0yIEhGbaJKbZu8RoJDgFwAk2aRyrAhVSc1cRg6tF49VAISJAk-KGJr4Bs7Yw7rop89dOVdzh-ZeyqLvdMR4tpQzpt8t7Y6KSXl9Rmq9OYuOThfavvqir5CqCQmYWixy2yrXHwcqhBcVk0SvajUmRuKrDyqPrcv5xWFQjcDD_rYFPj355FQoZDmbqyhsp2P7NRMlXdCjWtwInnOQ2q1zGKnaXATkD1yHMD_C3bTqlxLLQy2odTQmX9U6Ggp8B6ZEvyL2GICEL7ZFT427M3O0WJhDSPRpR2w9K1bIyoRGzPy2t_aOfLwqoD3x-PxljIfB1O6hxbf1kSz3oeWjVvBkTm48V48v2fwgfubSiclm8hLn3wHErSj_u4LY8gQR42DSKGDHpSZVw8W0TNQ8RGTcwOs5WDnlh0FG5WAWc1CWXBvTVlSkXF3IIb6M'
    };
    
    console.log('Fetching both male and female divisions from Circle21...');
    
    try {
        // Fetch both divisions in parallel
        const [maleResponse, femaleResponse] = await Promise.all([
            fetch(`${API_CONFIG.base_url}?competition_id=${API_CONFIG.competition_id}&division_id=${API_CONFIG.division_male}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.bearer_token}`
                }
            }),
            fetch(`${API_CONFIG.base_url}?competition_id=${API_CONFIG.competition_id}&division_id=${API_CONFIG.division_female}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_CONFIG.bearer_token}`
                }
            })
        ]);
        
        if (!maleResponse.ok || !femaleResponse.ok) {
            throw new Error(`HTTP error - Male: ${maleResponse.status}, Female: ${femaleResponse.status}`);
        }
        
        const [maleData, femaleData] = await Promise.all([
            maleResponse.json(),
            femaleResponse.json()
        ]);
        
        console.log('Male athletes:', maleData.athletes?.length);
        console.log('Female athletes:', femaleData.athletes?.length);
        
        return { maleData, femaleData };
    } catch (error) {
        console.error('Error fetching full Circle21 leaderboard:', error);
        return null;
    }
}

function parseCircle21Athletes(apiData, gender) {
    if (!apiData || !apiData.athletes) {
        console.log(`No athletes data in ${gender} API response`);
        return [];
    }
    
    console.log(`Parsing ${apiData.athletes.length} ${gender} athletes from API`);
    console.log(`  ${gender} division has ${apiData.wods?.length} workouts`);
    
    // Debug: Check workout structure
    if (apiData.wods && apiData.wods[0]) {
        const firstWod = apiData.wods[0];
        console.log(`  First workout structure:`, firstWod.wod?.name);
        if (firstWod.workouts && firstWod.workouts[0]) {
            const workout = firstWod.workouts[0];
            console.log(`  Has ${workout.results?.length} results`);
            if (workout.results && workout.results[0]) {
                console.log(`  First result keys:`, Object.keys(workout.results[0]));
                console.log(`  First result sample:`, workout.results[0]);
            }
        }
    }
    
    const athletes = [];
    const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
    
    let athletesWithWorkouts = 0;
    let debugAthleteIndex = -1;
    
    apiData.athletes.forEach((athleteEntry, idx) => {
        // API uses 'club_name' for team name
        const name = athleteEntry.name;
        const teamName = athleteEntry.club_name;
        const teamId = athleteEntry.team_id;  // Might differentiate sub-teams
        
        if (!name || !teamName || teamName === 'null' || teamName === '') {
            return;
        }
        
        // Find first athlete with club name
        if (debugAthleteIndex === -1 && teamName) {
            debugAthleteIndex = idx;
            console.log(`  Debug athlete ${idx}: ${name}, id: ${athleteEntry.id}, team: ${teamName}, team_id: ${teamId}`);
        }
        
        const workouts = {};
        if (apiData.wods && Array.isArray(apiData.wods)) {
            apiData.wods.forEach((wodEntry, index) => {
                const wodName = workoutNames[index];
                if (!wodName) return;
                
                const wodWorkouts = wodEntry.workouts;
                if (!wodWorkouts || wodWorkouts.length === 0) return;
                
                const workout = wodWorkouts[0];
                const results = workout.results || [];
                
                // Use 'id' field to match athlete results
                const athleteId = athleteEntry.id;
                const athleteResult = results.find(r => r.athlete_id === athleteId);
                
                // Debug matching for first athlete
                if (idx === debugAthleteIndex && index === 0) {
                    console.log(`  Trying to match athlete id ${athleteId} in ${results.length} results`);
                    console.log(`  Found result:`, athleteResult);
                    console.log(`  Result has position field:`, athleteResult?.position);
                    console.log(`  Calculating rank from results...`);
                }
                
                if (athleteResult) {
                    // Position field doesn't exist in API, calculate rank by sorting results
                    // Sort by time (lower is better) or reps (higher is better for AMRAP)
                    const sortedResults = [...results].sort((a, b) => {
                        const aTime = a.time || 999999999;
                        const bTime = b.time || 999999999;
                        const aReps = a.how_many || 0;
                        const bReps = b.how_many || 0;
                        
                        // If different times, lower wins
                        if (aTime !== bTime) return aTime - bTime;
                        // If same time (capped), more reps wins
                        if (aReps !== bReps) return bReps - aReps;
                        // Tiebreak
                        const aTiebreak = a.tie_break || 999999999;
                        const bTiebreak = b.tie_break || 999999999;
                        return aTiebreak - bTiebreak;
                    });
                    
                    // Find position in sorted list
                    const rank = sortedResults.findIndex(r => r.athlete_id === athleteId) + 1;
                    
                    if (idx === debugAthleteIndex && index === 0) {
                        console.log(`  Calculated rank: ${rank}`);
                    }
                    
                    if (rank > 0) {
                        workouts[wodName] = { rank };
                    }
                }
            });
        }
        
        if (Object.keys(workouts).length > 0) {
            athletesWithWorkouts++;
        }
        
        // Debug first WUID athlete
        if (idx < 5 && teamName.toLowerCase().includes('wuid')) {
            console.log(`  ${gender} WUID athlete:`, name, teamName, 'workouts:', Object.keys(workouts).length);
        }
        
        athletes.push({
            name,
            team_name: teamName,
            team_id: teamId,  // Store team_id for sub-team differentiation
            gender,
            workouts
        });
    });
    
    console.log(`Parsed ${athletes.length} ${gender} athletes (${athletesWithWorkouts} with workout data)`);
    return athletes;
}

async function displayTeamLeaderboard() {
    const container = document.getElementById('team-leaderboard-display');
    if (!container) return;
    
    container.innerHTML = '<p style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin"></i> Loading team leaderboard from Firebase...</p>';
    
    // Fetch pre-calculated team scores from Firebase
    const firebaseUrl = 'https://fbl-wuid-ranking-default-rtdb.europe-west1.firebasedatabase.app';
    const teamScoresData = await fetch(`${firebaseUrl}/circle21/team_scores.json`)
        .then(res => res.json())
        .catch(err => {
            console.error('Error fetching team scores:', err);
            return null;
        });
    
    if (!teamScoresData || !teamScoresData.teams) {
        container.innerHTML = '<p style="color: #ff6b6b;">Failed to load team leaderboard. Please try again.</p>';
        return;
    }
    
    const teamScores = teamScoresData.teams;
    const metadata = teamScoresData.metadata || {};
    
    console.log(`Loaded ${teamScores.length} teams from Firebase`);
    console.log(`Last sync: ${metadata.sync_timestamp_readable || 'Unknown'}`);
    
    // Separate valid and invalid teams
    const validTeams = teamScores.filter(t => t.valid);
    const invalidTeams = teamScores.filter(t => !t.valid);
    
    console.log(`Team scores: ${validTeams.length} valid, ${invalidTeams.length} invalid`);
    
    // Sort valid teams by total score (ascending, lower is better)
    validTeams.sort((a, b) => a.total_score - b.total_score);
    
    // Build HTML
    let html = '<h2 style="text-align: center; margin-bottom: 20px;">🏆 Team Leaderboard</h2>';
    html += '<p style="text-align: center; color: #999; margin-bottom: 10px;">Based on best 4 out of 6 workouts (each workout = best 3F + best 3M)</p>';
    html += '<div style="background: #2a2000; border: 1px solid #665500; border-radius: 8px; padding: 10px 16px; margin: 0 auto 24px; max-width: 700px; color: #ccaa44; font-size: 0.85em; text-align: center;">⚠️ <strong>Disclaimer:</strong> This is a reverse-engineered leaderboard based on the Circle21 API. Scoring logic may not be 100% accurate and should be treated as unofficial/approximate.</div>';
    
    html += '<table class="leaderboard-table">';
    html += '<thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Team</th>';
    html += '<th>Total Score</th>';
    html += '<th>Valid Workouts</th>';
    html += '<th>Valid Athletes (F/M)</th>';
    html += '</tr></thead><tbody>';
    
    // Display valid teams
    validTeams.forEach((team, index) => {
        html += '<tr>';
        html += `<td style="font-weight: bold; color: #008AC2;">${index + 1}</td>`;
        html += `<td>${team.team_name}</td>`;
        html += `<td style="font-weight: bold; color: #4CAF50;">${team.total_score}</td>`;
        html += `<td>${team.valid_workouts}/6</td>`;
        html += `<td>${team.valid_females}F / ${team.valid_males}M</td>`;
        html += '</tr>';
    });
    
    // Display invalid teams at bottom
    if (invalidTeams.length > 0) {
        invalidTeams.forEach(team => {
            const reason = team.valid_workouts < 4 ? `Only ${team.valid_workouts}/6 valid workouts` : 'Incomplete data';
            html += '<tr style="opacity: 0.5; border-top: 2px solid #ff6b6b;">';
            html += '<td style="color: #ff6b6b;">-</td>';
            html += `<td>${team.team_name}</td>`;
            html += `<td style="color: #ff6b6b;" title="${reason}">Not Valid</td>`;
            html += `<td>${team.valid_workouts}/6</td>`;
            html += `<td>${team.valid_females}F / ${team.valid_males}M</td>`;
            html += '</tr>';
        });
    }
    
    html += '</tbody></table>';
    
    // Add legend
    html += '<div style="margin-top: 30px; padding: 20px; background: #1a1a1a; border-radius: 8px; font-size: 13px;">';
    html += '<p><strong>Scoring System:</strong></p>';
    html += '<ul style="margin: 10px 0; padding-left: 20px;">';
    html += '<li><strong>Workout Score:</strong> Best 3 female ranks + Best 3 male ranks</li>';
    html += '<li><strong>Workout Validity:</strong> Requires 3+ valid athletes from each gender</li>';
    html += '<li><strong>Valid Athlete:</strong> Completed 4+ workouts</li>';
    html += '<li><strong>Team Total:</strong> Sum of best 4 valid workout scores</li>';
    html += '<li style="color: #ff6b6b;"><strong>Not Valid:</strong> Team needs 4 valid workouts to have a total score</li>';
    html += '</ul>';
    if (metadata.sync_timestamp_readable) {
        html += `<p style="margin-top: 15px; color: #999; font-size: 12px;">Last updated: ${metadata.sync_timestamp_readable}</p>`;
    }
    html += '</div>';
    
    container.innerHTML = html;
}

// ====================================
// TEAM POINTS BREAKDOWN DISPLAY
// ====================================

function populateTeamBreakdownSelect() {
    const selectEl = document.getElementById('teamBreakdownSelect');
    if (!selectEl) return;
    
    let teams = [];
    if (circle21Metadata && circle21Metadata.teams_tracked) {
        teams = circle21Metadata.teams_tracked;
    }
    
    selectEl.innerHTML = '<option value="" selected disabled>-- Select Team --</option>';
    teams.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = teamName;
        selectEl.appendChild(option);
    });
}

function displayTeamBreakdown() {
    const selectEl = document.getElementById('teamBreakdownSelect');
    const container = document.getElementById('team-breakdown-display');
    
    if (!selectEl || !container) return;
    
    const selectedTeam = selectEl.value;
    
    if (!selectedTeam) {
        container.innerHTML = '<p>👆 Please select a team above</p>';
        return;
    }
    
    // Get all athletes from selected team
    const allAthletes = getAllCircle21Athletes();
    const teamAthletes = allAthletes.filter(a => a.team_name === selectedTeam);
    
    if (teamAthletes.length === 0) {
        container.innerHTML = `<p>No athletes found for ${selectedTeam}</p>`;
        return;
    }
    
    // Separate by gender
    const females = teamAthletes.filter(a => a.gender === 'F');
    const males = teamAthletes.filter(a => a.gender === 'M');
    
    // Process athletes to calculate validity and best 4
    const processAthlete = (athlete) => {
        const workouts = athlete.workouts || {};
        const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
        
        // Get ranks for all workouts
        const athleteWorkouts = {};
        let completed = 0;
        
        workoutNames.forEach(wod => {
            const wodData = workouts[wod];
            if (wodData) {
                const rank = typeof wodData === 'object' ? wodData.rank : wodData;
                athleteWorkouts[wod] = rank;
                if (rank) completed++;
            } else {
                athleteWorkouts[wod] = null;
            }
        });
        
        // Calculate best 4
        const validWorkouts = [];
        workoutNames.forEach(wod => {
            if (athleteWorkouts[wod]) {
                validWorkouts.push({ wod, rank: athleteWorkouts[wod] });
            }
        });
        
        validWorkouts.sort((a, b) => a.rank - b.rank);
        const best4 = new Set(validWorkouts.slice(0, 4).map(w => w.wod));
        
        const score = validWorkouts.slice(0, 4).reduce((sum, w) => sum + w.rank, 0);
        const valid = completed >= 4;
        
        return {
            name: athlete.name,
            workouts: athleteWorkouts,
            completed,
            best4,
            score,
            valid
        };
    };
    
    const processedFemales = females.map(processAthlete);
    const processedMales = males.map(processAthlete);
    
    // Calculate workout scores and validity
    const workoutNames = ['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'];
    const workoutScores = {};
    const workoutValidity = {};
    const workoutContributors = {}; // Track which athletes contribute to each workout
    
    workoutNames.forEach(wod => {
        // Get all valid athletes who completed this workout
        const validFemalesForWod = processedFemales.filter(a => a.valid && a.workouts[wod]);
        const validMalesForWod = processedMales.filter(a => a.valid && a.workouts[wod]);
        
        // Sort by rank (lower is better) and take best 3
        validFemalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        validMalesForWod.sort((a, b) => a.workouts[wod] - b.workouts[wod]);
        
        const best3Females = validFemalesForWod.slice(0, 3);
        const best3Males = validMalesForWod.slice(0, 3);
        
        // Workout is valid if we have at least 3 females AND 3 males
        const isValid = best3Females.length >= 3 && best3Males.length >= 3;
        
        // Calculate workout score (sum of best 3 from each gender)
        const femaleScore = best3Females.reduce((sum, a) => sum + a.workouts[wod], 0);
        const maleScore = best3Males.reduce((sum, a) => sum + a.workouts[wod], 0);
        const totalWodScore = isValid ? (femaleScore + maleScore) : null;
        
        workoutScores[wod] = totalWodScore;
        workoutValidity[wod] = isValid;
        workoutContributors[wod] = {
            females: new Set(best3Females.map(a => a.name)),
            males: new Set(best3Males.map(a => a.name))
        };
    });
    
    // Find best 4 valid workouts for team total
    const validWorkoutScores = [];
    workoutNames.forEach(wod => {
        if (workoutValidity[wod]) {
            validWorkoutScores.push({ wod, score: workoutScores[wod] });
        }
    });
    
    validWorkoutScores.sort((a, b) => a.score - b.score);
    const best4Workouts = new Set(validWorkoutScores.slice(0, 4).map(w => w.wod));
    
    // Calculate team total score
    const teamTotalScore = validWorkoutScores.length >= 4 
        ? validWorkoutScores.slice(0, 4).reduce((sum, w) => sum + w.score, 0)
        : null;
    
    // Calculate team totals (for summary)
    const validFemales = processedFemales.filter(a => a.valid);
    const validMales = processedMales.filter(a => a.valid);
    
    const maleScore = validMales.reduce((sum, a) => sum + a.score, 0);
    const femaleScore = validFemales.reduce((sum, a) => sum + a.score, 0);
    
    // Build HTML
    let html = `<h2 style="text-align: center; margin-bottom: 20px;">${selectedTeam}</h2>`;
    
    // Build table
    html += '<table class="leaderboard-table">';
    html += '<thead><tr>';
    html += '<th>Athlete</th>';
    html += '<th>Status</th>';
    workoutNames.forEach(wod => {
        const isValid = workoutValidity[wod];
        const borderStyle = isValid ? '' : 'border-left: 2px solid #ff6b6b; border-right: 2px solid #ff6b6b;';
        html += `<th style="${borderStyle}">${wod}</th>`;
    });
    html += '<th>Score</th>';
    html += '<th>Completed</th>';
    html += '</tr></thead><tbody>';
    
    // Female athletes first
    if (processedFemales.length > 0) {
        html += '<tr><td colspan="10" style="background: #1a1a1a; font-weight: bold; padding: 8px; font-size: 13px;">FEMALE ATHLETES</td></tr>';
        
        processedFemales.forEach(athlete => {
            const rowBorder = athlete.valid ? '' : 'border-top: 2px solid #ff6b6b; border-bottom: 2px solid #ff6b6b;';
            const rowOpacity = athlete.valid ? '' : ' opacity: 0.5;';
            const status = athlete.valid ? '✓ COUNTS' : '✗ INVALID';
            const statusStyle = athlete.valid ? '' : 'color: #ff6b6b;';
            const statusTitle = athlete.valid ? 
                'Completed 4+ workouts, counts toward team score' : 
                'Completed less than 4 workouts, does NOT count';
            
            html += `<tr style="${rowBorder}${rowOpacity}">`;
            html += `<td style="font-size: 13px;">${athlete.name}</td>`;
            html += `<td style="${statusStyle}" title="${statusTitle}">${status}</td>`;
            
            workoutNames.forEach(wod => {
                const rank = athlete.workouts[wod];
                const isWorkoutValid = workoutValidity[wod];
                const isContributor = athlete.valid && workoutContributors[wod]?.females.has(athlete.name);
                const isSelectedWorkout = best4Workouts.has(wod);
                const columnBorder = isWorkoutValid ? '' : 'border-left: 2px solid #ff6b6b; border-right: 2px solid #ff6b6b;';
                
                // Blue font + bold if this athlete contributes to a selected workout
                const shouldHighlight = isContributor && isSelectedWorkout && isWorkoutValid;
                
                if (!rank) {
                    html += `<td style="opacity: 0.4; ${columnBorder}">DNF</td>`;
                } else {
                    let cellStyle = columnBorder;
                    let cellTitle = '';
                    
                    if (shouldHighlight) {
                        cellStyle += ' color: #008AC2; font-weight: bold;';
                        cellTitle = 'Contributes to team total (best 3 in selected workout)';
                    } else {
                        cellStyle += ' opacity: 0.5;';
                        cellTitle = 'Does not count toward team total';
                    }
                    
                    html += `<td style="${cellStyle}" title="${cellTitle}">#${rank}</td>`;
                }
            });
            
            html += `<td>${athlete.score}</td>`;
            html += `<td>${athlete.completed}/6</td>`;
            html += '</tr>';
        });
    }
    
    // Male athletes
    if (processedMales.length > 0) {
        html += '<tr><td colspan="10" style="background: #1a1a1a; font-weight: bold; padding: 8px; font-size: 13px;">MALE ATHLETES</td></tr>';
        
        processedMales.forEach(athlete => {
            const rowBorder = athlete.valid ? '' : 'border-top: 2px solid #ff6b6b; border-bottom: 2px solid #ff6b6b;';
            const rowOpacity = athlete.valid ? '' : ' opacity: 0.5;';
            const status = athlete.valid ? '✓ COUNTS' : '✗ INVALID';
            const statusStyle = athlete.valid ? '' : 'color: #ff6b6b;';
            const statusTitle = athlete.valid ? 
                'Completed 4+ workouts, counts toward team score' : 
                'Completed less than 4 workouts, does NOT count';
            
            html += `<tr style="${rowBorder}${rowOpacity}">`;
            html += `<td style="font-size: 13px;">${athlete.name}</td>`;
            html += `<td style="${statusStyle}" title="${statusTitle}">${status}</td>`;
            
            workoutNames.forEach(wod => {
                const rank = athlete.workouts[wod];
                const isWorkoutValid = workoutValidity[wod];
                const isContributor = athlete.valid && workoutContributors[wod]?.males.has(athlete.name);
                const isSelectedWorkout = best4Workouts.has(wod);
                const columnBorder = isWorkoutValid ? '' : 'border-left: 2px solid #ff6b6b; border-right: 2px solid #ff6b6b;';
                
                // Blue font + bold if this athlete contributes to a selected workout
                const shouldHighlight = isContributor && isSelectedWorkout && isWorkoutValid;
                
                if (!rank) {
                    html += `<td style="opacity: 0.4; ${columnBorder}">DNF</td>`;
                } else {
                    let cellStyle = columnBorder;
                    let cellTitle = '';
                    
                    if (shouldHighlight) {
                        cellStyle += ' color: #008AC2; font-weight: bold;';
                        cellTitle = 'Contributes to team total (best 3 in selected workout)';
                    } else {
                        cellStyle += ' opacity: 0.5;';
                        cellTitle = 'Does not count toward team total';
                    }
                    
                    html += `<td style="${cellStyle}" title="${cellTitle}">#${rank}</td>`;
                }
            });
            
            html += `<td>${athlete.score}</td>`;
            html += `<td>${athlete.completed}/6</td>`;
            html += '</tr>';
        });
    }
    
    // Workout Score Row
    html += '<tr style="background: #2a2a2a;">';
    html += '<td colspan="2" style="font-weight: bold;">Workout Score</td>';
    workoutNames.forEach(wod => {
        const score = workoutScores[wod];
        const isSelected = best4Workouts.has(wod);
        const isValid = workoutValidity[wod];
        const columnBorder = isValid ? '' : 'border-left: 2px solid #ff6b6b; border-right: 2px solid #ff6b6b;';
        const cellStyle = isSelected ? `color: #008AC2; font-weight: bold; ${columnBorder}` : columnBorder;
        const cellTitle = isSelected ? 'Selected for team total (best 4 valid workouts)' : 'Not selected';
        
        if (score !== null) {
            html += `<td style="${cellStyle}" title="${cellTitle}">${score}</td>`;
        } else {
            html += `<td style="opacity: 0.4; ${columnBorder}">-</td>`;
        }
    });
    
    // Total Score in the intersection of Workout Score row and Total column
    const totalDisplay = teamTotalScore !== null ? teamTotalScore : 'N/A';
    const totalTitle = teamTotalScore !== null 
        ? `Team Total: Sum of best 4 valid workouts (${validWorkoutScores.length} valid total)` 
        : `Need 4 valid workouts (only ${validWorkoutScores.length} valid)`;
    html += `<td colspan="2" style="text-align: center; color: #008AC2; font-weight: bold; font-size: 18px;" title="${totalTitle}">${totalDisplay}</td>`;
    html += '</tr>';
    
    // Workout Validity Row
    html += '<tr style="background: #2a2a2a;">';
    html += '<td colspan="2" style="font-weight: bold;">Workout Validity</td>';
    workoutNames.forEach(wod => {
        const isValid = workoutValidity[wod];
        const validFemalesForWod = processedFemales.filter(a => a.valid && a.workouts[wod]);
        const validMalesForWod = processedMales.filter(a => a.valid && a.workouts[wod]);
        const femaleCount = Math.min(3, validFemalesForWod.length);
        const maleCount = Math.min(3, validMalesForWod.length);
        const columnBorder = isValid ? '' : 'border-left: 2px solid #ff6b6b; border-right: 2px solid #ff6b6b; border-bottom: 2px solid #ff6b6b;';
        
        const cellStyle = isValid ? `color: #4CAF50; ${columnBorder}` : `color: #ff6b6b; ${columnBorder}`;
        const cellTitle = `${femaleCount} females, ${maleCount} males (need 3 of each)`;
        
        html += `<td style="${cellStyle}" title="${cellTitle}">${isValid ? '✓ Valid' : '✗ Invalid'}</td>`;
    });
    html += '<td colspan="2"></td>';
    html += '</tr>';
    
    html += '</tbody></table>';
    
    // Team summary
    html += '<div style="margin-top: 30px; padding: 20px; background: #1a1a1a; border-radius: 8px;">';
    html += '<h3 style="margin-top: 0;">Team Summary</h3>';
    html += `<p><strong>Valid Male Athletes:</strong> ${validMales.length}/${processedMales.length}</p>`;
    html += `<p><strong>Valid Female Athletes:</strong> ${validFemales.length}/${processedFemales.length}</p>`;
    html += `<p><strong>Valid Workouts:</strong> ${validWorkoutScores.length}/6</p>`;
    
    if (validWorkoutScores.length >= 4) {
        const best4List = validWorkoutScores.slice(0, 4).map(w => `${w.wod} (${w.score})`).join(', ');
        html += `<p><strong>Best 4 Workouts:</strong> ${best4List}</p>`;
    }
    
    html += `<p style="font-size: 18px; color: #008AC2;"><strong>TOTAL TEAM SCORE:</strong> ${teamTotalScore !== null ? teamTotalScore : 'N/A'}</p>`;
    
    if (teamTotalScore === null) {
        html += `<p style="color: #ff6b6b;"><em>⚠️ Team needs 4 valid workouts to have a total score (currently has ${validWorkoutScores.length})</em></p>`;
    }
    
    html += '<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; font-size: 12px; opacity: 0.8;">';
    html += '<p><strong>Legend:</strong></p>';
    html += '<p><span style="color: #008AC2; font-weight: bold;">#rank</span> = Contributes to team total (best 3 from each gender in best 4 workouts)</p>';
    html += '<p>Faded #rank = Does not count toward team total</p>';
    html += '<p>DNF = Did not finish / No result</p>';
    html += '<p>✓ COUNTS = Athlete completed 4+ workouts, eligible to contribute to team</p>';
    html += '<p>✗ INVALID = Athlete completed &lt;4 workouts, cannot contribute to team</p>';
    html += '<p><strong>Workout Score:</strong> Sum of best 3 female ranks + best 3 male ranks</p>';
    html += '<p><strong>Workout Validity:</strong> Needs at least 3 females AND 3 males to be valid</p>';
    html += '<p><strong>Team Total:</strong> Sum of best 4 valid workout scores</p>';
    html += '</div>';
    html += '</div>';
    
    container.innerHTML = html;
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCircle21Module);
} else {
    // DOMContentLoaded already fired
    initializeCircle21Module();
}
