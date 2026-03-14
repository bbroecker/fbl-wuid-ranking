// ====================================
// Circle21 Competition Tracking - ISOLATED MODULE
// ====================================
// This module is completely separate from the main athlete scoring system
// Uses its own Firebase path (/circle21) and localStorage key

// Circle21-specific storage key (different from main STORAGE_KEY)
const CIRCLE21_STORAGE_KEY = 'fbl-circle21-athletes-v2';

// Circle21 local cache
let circle21AthleteCache = [];
let circle21DataLoaded = false;

// Circle21 data structure: { name, gender, overall, workouts: {LQ1, LQ2, LQ3, LQ4, LQ5, LQ6}, timestamp }

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
        const circle21Ref = window.database.ref('circle21');
        circle21Ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data && Array.isArray(data)) {
                circle21AthleteCache = data;
                circle21DataLoaded = true;
                
                // Save to localStorage as backup
                localStorage.setItem(CIRCLE21_STORAGE_KEY, JSON.stringify(data));
                
                // Update displays
                if (typeof displayCircle21AthletesList === 'function') {
                    displayCircle21AthletesList();
                }
                if (typeof displayCircle21Leaderboard === 'function') {
                    displayCircle21Leaderboard();
                }
                
                console.log(`Circle21: Loaded ${data.length} athletes from Firebase`);
            } else {
                circle21AthleteCache = [];
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
    circle21AthleteCache = stored ? JSON.parse(stored) : [];
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
    
    // Save to Firebase (separate path: /circle21)
    if (window.database) {
        try {
            const circle21Ref = window.database.ref('circle21');
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
            const workoutsCompleted = Object.values(athlete.workouts).filter(v => v !== null).length;
            html += `
                <div style="background: #1a2a3a; padding: 15px; border-radius: 8px; border-left: 4px solid #2196F3;">
                    <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">${athlete.name}</div>
                    <div style="color: #999; font-size: 13px; margin-bottom: 10px;">
                        <div>Overall: <strong style="color: #64b5f6;">#${athlete.overall}</strong></div>
                        <div>Workouts: ${workoutsCompleted}/6 completed</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 12px;">
                        ${['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'].map(wod => 
                            `<div style="background: #0d1820; padding: 5px; border-radius: 4px; text-align: center;">
                                <div style="color: #666;">${wod}</div>
                                <div style="color: ${athlete.workouts[wod] ? '#4CAF50' : '#666'}; font-weight: 600;">
                                    ${athlete.workouts[wod] ? '#' + athlete.workouts[wod] : '-'}
                                </div>
                            </div>`
                        ).join('')}
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
            const workoutsCompleted = Object.values(athlete.workouts).filter(v => v !== null).length;
            html += `
                <div style="background: #1a2a3a; padding: 15px; border-radius: 8px; border-left: 4px solid #E91E63;">
                    <div style="font-size: 16px; font-weight: 600; color: #fff; margin-bottom: 8px;">${athlete.name}</div>
                    <div style="color: #999; font-size: 13px; margin-bottom: 10px;">
                        <div>Overall: <strong style="color: #F48FB1;">#${athlete.overall}</strong></div>
                        <div>Workouts: ${workoutsCompleted}/6 completed</div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 12px;">
                        ${['LQ1', 'LQ2', 'LQ3', 'LQ4', 'LQ5', 'LQ6'].map(wod => 
                            `<div style="background: #0d1820; padding: 5px; border-radius: 4px; text-align: center;">
                                <div style="color: #666;">${wod}</div>
                                <div style="color: ${athlete.workouts[wod] ? '#4CAF50' : '#666'}; font-weight: 600;">
                                    ${athlete.workouts[wod] ? '#' + athlete.workouts[wod] : '-'}
                                </div>
                            </div>`
                        ).join('')}
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
   const container =document.getElementById('circle21-leaderboard-display');
    if (!container) return;
    
    const genderFilterEl = document.getElementById('circle21GenderFilter');
    const genderFilter = genderFilterEl ? genderFilterEl.value : 'M';
    
    let athletes = getAllCircle21Athletes().filter(a => a.gender === genderFilter);
    
    if (athletes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 80px 40px;">No athletes added yet.<br><small>Admin can add athletes by running the <code>circle21_sync.py</code> script.</small></p>';
        return;
    }
    
    // Sort by current column
    sortCircle21Athletes(athletes, circle21SortColumn, circle21SortAscending);
    
    // Build table
    let html = '<div class="table-container"><table>';
    html += '<thead><tr>';
    html += `<th onclick="sortCircle21('overall')" style="cursor: pointer;">Overall ${circle21SortColumn === 'overall' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('name')" style="cursor: pointer;">Name ${circle21SortColumn === 'name' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ1')" style="cursor: pointer;">LQ1 ${circle21SortColumn === 'LQ1' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ2')" style="cursor: pointer;">LQ2 ${circle21SortColumn === 'LQ2' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ3')" style="cursor: pointer;">LQ3 ${circle21SortColumn === 'LQ3' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ4')" style="cursor: pointer;">LQ4 ${circle21SortColumn === 'LQ4' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ5')" style="cursor: pointer;">LQ5 ${circle21SortColumn === 'LQ5' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += `<th onclick="sortCircle21('LQ6')" style="cursor: pointer;">LQ6 ${circle21SortColumn === 'LQ6' ? (circle21SortAscending ? '▲' : '▼') : ''}</th>`;
    html += '</tr></thead><tbody>';
    
    athletes.forEach((athlete, index) => {
        const rankClass = index < 3 ? `rank-${index + 1}` : '';
        html += `<tr class="${rankClass}">`;
        html += `<td><strong>#${athlete.overall}</strong></td>`;
        html += `<td><strong>${athlete.name}</strong></td>`;
        html += `<td>${athlete.workouts.LQ1 ? '#' + athlete.workouts.LQ1 : '-'}</td>`;
        html += `<td>${athlete.workouts.LQ2 ? '#' + athlete.workouts.LQ2 : '-'}</td>`;
        html += `<td>${athlete.workouts.LQ3 ? '#' + athlete.workouts.LQ3 : '-'}</td>`;
        html += `<td>${athlete.workouts.LQ4 ? '#' + athlete.workouts.LQ4 : '-'}</td>`;
        html += `<td>${athlete.workouts.LQ5 ? '#' + athlete.workouts.LQ5 : '-'}</td>`;
        html += `<td>${athlete.workouts.LQ6 ? '#' + athlete.workouts.LQ6 : '-'}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Sort Circle21 athletes array
function sortCircle21Athletes(athletes, column, ascending) {
    athletes.sort((a, b) => {
        let valA, valB;
        
        if (column === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
            return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (column === 'overall') {
            valA = a.overall;
            valB = b.overall;
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
    
    // Initial display
    if (document.getElementById('circle21-athletes-list')) {
        displayCircle21AthletesList();
    }
    if (document.getElementById('circle21-leaderboard-display')) {
        displayCircle21Leaderboard();
    }
    
    console.log('Circle21: Module initialized');
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCircle21Module);
} else {
    // DOMContentLoaded already fired
    initializeCircle21Module();
}
