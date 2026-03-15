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
                    displayCircle21Leaderboard();
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
                .map(wod => ({ wod, rank: workouts[wod] }))
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
            const rank = workouts[wod];
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
            valA = a.workouts[column] || 999999;
            valB = b.workouts[column] || 999999;
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
            displayCircle21Leaderboard();
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

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCircle21Module);
} else {
    // DOMContentLoaded already fired
    initializeCircle21Module();
}
