// FBL - Wuid Internal Ranking - Scoring System
// Shared JavaScript for both user and admin pages

// Data structure to store all athlete scores
const STORAGE_KEY = 'fbl_wuid_scores';
const CONFIG_KEY = 'fbl_wuid_workout_config';

// Default workout configuration
const DEFAULT_CONFIG = [
    { name: 'Workout 1', type: 'time', visible: true },
    { name: 'Workout 2', type: 'time', visible: true },
    { name: 'Workout 3', type: 'amrap', visible: true },
    { name: 'Workout 4', type: 'time', visible: true },
    { 
        name: 'Workout 5', 
        type: 'time', 
        visible: true,
        tiebreakers: [
            { reps: 15, label: '15 reps' },
            { reps: 63, label: '63 reps' },
            { reps: 107, label: '107 reps' }
        ]
    },
    { name: 'Workout 6', type: 'time', visible: false }
];

// Get only visible workouts (filters out workouts with visible: false)
function getVisibleWorkouts() {
    const config = getWorkoutConfig();
    return config.map((wod, index) => ({ ...wod, originalIndex: index })).filter(wod => wod.visible !== false);
}

// Load config into form on page load
function loadConfigIntoForm() {
    const config = getWorkoutConfig();
    config.forEach((wod, index) => {
        const wodNum = index + 1;
        const nameElem = document.getElementById(`config-wod${wodNum}-name`);
        const typeElem = document.getElementById(`config-wod${wodNum}-type`);
        const visibleElem = document.getElementById(`config-wod${wodNum}-visible`);
        const tbElem = document.getElementById(`config-wod${wodNum}-tiebreakers`);
        
        if (nameElem) nameElem.value = wod.name;
        if (typeElem) typeElem.value = wod.type;
        if (visibleElem) visibleElem.checked = wod.visible !== false;
        
        // Load tiebreakers if present
        if (tbElem && wod.tiebreakers) {
            tbElem.value = wod.tiebreakers.map(tb => tb.reps).join(',');
        }
        
        // Show/hide tiebreaker field based on type
        toggleTiebreakerField(wodNum);
    });
}

// Toggle tiebreaker field visibility based on workout type
function toggleTiebreakerField(wodNum) {
    const typeElem = document.getElementById(`config-wod${wodNum}-type`);
    const tbRow = document.getElementById(`config-wod${wodNum}-tb-row`);
    
    if (typeElem && tbRow) {
        // Only show for "time" workouts
        tbRow.style.display = typeElem.value === 'time' ? 'block' : 'none';
    }
}

// Save workout configuration from form
function saveWorkoutConfig() {
    const config = [];
    for (let i = 1; i <= 6; i++) {
        const wodConfig = {
            name: document.getElementById(`config-wod${i}-name`).value || `Workout ${i}`,
            type: document.getElementById(`config-wod${i}-type`).value,
            visible: document.getElementById(`config-wod${i}-visible`).checked
        };
        
        // Parse tiebreakers if present (only for time workouts)
        const tbElem = document.getElementById(`config-wod${i}-tiebreakers`);
        if (tbElem && wodConfig.type === 'time' && tbElem.value.trim()) {
            const reps = tbElem.value.split(',').map(r => r.trim()).filter(r => r);
            if (reps.length > 0) {
                wodConfig.tiebreakers = reps.map(r => ({
                    reps: parseInt(r),
                    label: `${r} reps`
                })).filter(tb => !isNaN(tb.reps)).sort((a, b) => a.reps - b.reps);
            }
        }
        
        config.push(wodConfig);
    }
    saveWorkoutConfigData(config);
    updateInputForms();
    updateWorkoutSelector();
    showStatus('Workout configuration saved! ✅');
}

// Load default configuration
function loadDefaultConfig() {
    if (confirm('Reset to default configuration? This will not affect saved scores.')) {
        DEFAULT_CONFIG.forEach((wod, index) => {
            const wodNum = index + 1;
            document.getElementById(`config-wod${wodNum}-name`).value = wod.name;
            document.getElementById(`config-wod${wodNum}-type`).value = wod.type;
            document.getElementById(`config-wod${wodNum}-visible`).checked = wod.visible !== false;
            
            // Load default tiebreakers
            const tbElem = document.getElementById(`config-wod${wodNum}-tiebreakers`);
            if (tbElem) {
                if (wod.tiebreakers) {
                    tbElem.value = wod.tiebreakers.map(tb => tb.reps).join(',');
                } else {
                    tbElem.value = '';
                }
            }
            
            // Update tiebreaker field visibility
            toggleTiebreakerField(wodNum);
        });
        showStatus('Default configuration loaded! Click "Save Configuration" to apply.');
    }
}

// Update input forms based on configuration
function updateInputForms() {
    const visibleWorkouts = getVisibleWorkouts();
    const formGrid = document.getElementById('workout-forms');
    
    if (!formGrid) return; // Not on a page with input forms
    
    let html = '';
    visibleWorkouts.forEach((wod, index) => {
        const wodNum = wod.originalIndex + 1;
        const isFirstWorkout = index === 0;
        
        html += `<div class="workout-section${isFirstWorkout ? '' : ' collapsed'}" id="workout-section-${wodNum}">
            <div class="workout-header" onclick="toggleWorkoutSection(${wodNum})">
                <h4>${wod.name}</h4>
                <span class="workout-toggle">▼</span>
            </div>
            <div class="workout-content">
            <p style="font-size: 12px; color: #999; margin-bottom: 15px;">${getTypeDescription(wod.type)}</p>
            <div class="input-row">`;
        
        if (wod.type === 'time') {
            // For Time workouts: time input or reps if not finished
            html += `
                <label>
                    <input type="checkbox" id="wod${wodNum}-tc-not-finished" onchange="toggleTimeCap(${wodNum})" style="margin-right: 5px;">
                    Did not finish in time cap
                </label>
                <div id="wod${wodNum}-time-container" style="margin-top: 10px;">
                    <label>Time:</label>
                    <input type="text" id="wod${wodNum}-score" placeholder="MM:SS">
                </div>
                <div id="wod${wodNum}-reps-container" style="margin-top: 10px; display: none;">
                    <label>Reps Completed:</label>
                    <input type="number" id="wod${wodNum}-reps" placeholder="Total reps">`;
            
            // Add tiebreaker inputs if configured
            if (wod.tiebreakers && wod.tiebreakers.length > 0) {
                html += `<div style="margin-top: 15px; padding: 10px; background: #1a1a1a; border-radius: 4px; border: 1px solid #555;">
                    <div style="font-size: 12px; color: #999; margin-bottom: 10px; font-weight: 500;">⏱️ Optional Tiebreakers (record time at these rep counts):</div>`;
                
                wod.tiebreakers.forEach(tb => {
                    html += `
                    <div style="margin-bottom: 8px;">
                        <label style="font-size: 13px;">${tb.label}:</label>
                        <input type="text" id="wod${wodNum}-tb-${tb.reps}" placeholder="MM:SS" style="width: 80px;">
                    </div>`;
                });
                
                html += `</div>`;
            }
            
            html += `</div>`;
        } else if (wod.type === 'amrap') {
            html += `
                <label>Reps:</label>
                <input type="number" id="wod${wodNum}-score" placeholder="Total reps">`;
        } else if (wod.type === 'weight') {
            html += `
                <label>Weight:</label>
                <input type="number" id="wod${wodNum}-score" placeholder="Weight (kg/lbs)" step="0.5">`;
        } else if (wod.type === 'reps') {
            html += `
                <label>Reps:</label>
                <input type="number" id="wod${wodNum}-score" placeholder="Total reps">`;
        }
        
        html += `</div></div></div>`;
    });
    
    formGrid.innerHTML = html;
}

// Toggle workout section collapse/expand
function toggleWorkoutSection(wodNum) {
    const section = document.getElementById(`workout-section-${wodNum}`);
    if (section) {
        section.classList.toggle('collapsed');
    }
}

// Toggle between time and reps input for time cap workouts
function toggleTimeCap(wodNum) {
    const checkbox = document.getElementById(`wod${wodNum}-tc-not-finished`);
    const timeContainer = document.getElementById(`wod${wodNum}-time-container`);
    const repsContainer = document.getElementById(`wod${wodNum}-reps-container`);
    
    if (checkbox.checked) {
        timeContainer.style.display = 'none';
        repsContainer.style.display = 'block';
    } else {
        timeContainer.style.display = 'block';
        repsContainer.style.display = 'none';
    }
}

// Get score label based on type
function getScoreLabel(type) {
    const labels = {
        'time': 'Time',
        'amrap': 'Reps',
        'weight': 'Weight',
        'reps': 'Reps'
    };
    return labels[type] || 'Score';
}

// Get type description
function getTypeDescription(type) {
    const descriptions = {
        'time': 'For Time - Enter completion time or reps if not finished',
        'amrap': 'AMRAP - Total Reps Completed',
        'weight': 'Max Weight',
        'reps': 'Total Reps Completed'
    };
    return descriptions[type] || '';
}

// Get score placeholder
function getScorePlaceholder(type) {
    const placeholders = {
        'time': 'MM:SS or reps',
        'amrap': 'Total reps',
        'weight': 'Weight in kg/lbs',
        'reps': 'Total reps'
    };
    return placeholders[type] || 'Score';
}

// Firebase-enabled storage with localStorage fallback
let scoresCache = [];
let configCache = null;
let firebaseReady = false;

// Initialize Firebase listeners
function initFirebase() {
    const indicator = document.getElementById('connection-indicator');
    
    if (typeof firebase === 'undefined' || !window.database) {
        console.log('Firebase not available, using localStorage only');
        if (indicator) {
            indicator.innerHTML = '💾 Offline mode (localStorage only) - <a href="FIREBASE_SETUP.md" target="_blank">Setup Firebase</a>';
            indicator.style.color = '#e74c3c';
        }
        return;
    }
    
    firebaseReady = true;
    
    if (indicator) {
        indicator.innerHTML = '🟢 Connected - Real-time sync enabled';
        indicator.style.color = '#27ae60';
    }
    
    // Listen for scores changes
    window.database.ref('scores').on('value', (snapshot) => {
        const data = snapshot.val();
        scoresCache = data || [];
        
        // Update displays if on the page
        if (typeof displayWorkoutRankings === 'function') {
            displayWorkoutRankings();
        }
        if (typeof displayOverallStandings === 'function') {
            displayOverallStandings();
        }
        if (typeof displayAthleteList === 'function') {
            displayAthleteList();
        }
    });
    
    // Listen for config changes
    window.database.ref('config').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            configCache = data;
            // Update admin config form if on admin page
            if (typeof loadConfigIntoForm === 'function') {
                loadConfigIntoForm();
            }
            if (typeof updateInputForms === 'function') {
                updateInputForms();
            }
            if (typeof updateWorkoutSelector === 'function') {
                updateWorkoutSelector();
            }
        }
    });
    
    // Monitor connection status
    window.database.ref('.info/connected').on('value', (snapshot) => {
        if (indicator) {
            if (snapshot.val() === true) {
                indicator.innerHTML = '🟢 Connected - Real-time sync enabled';
                indicator.style.color = '#27ae60';
            } else {
                indicator.innerHTML = '🟡 Reconnecting...';
                indicator.style.color = '#f39c12';
            }
        }
    });
}

// Get all scores (from cache or localStorage)
function getAllScores() {
    if (firebaseReady) {
        return scoresCache;
    }
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Save all scores (to Firebase and localStorage)
function saveAllScores(scores) {
    scoresCache = scores;
    
    // Save to localStorage as backup
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    
    // Save to Firebase
    if (firebaseReady) {
        window.database.ref('scores').set(scores).catch(err => {
            console.error('Firebase save error:', err);
            showStatus('Saved locally, but sync failed. Check connection.', true);
        });
    }
}

// Get workout configuration
function getWorkoutConfig() {
    if (firebaseReady && configCache) {
        return configCache;
    }
    const data = localStorage.getItem(CONFIG_KEY);
    return data ? JSON.parse(data) : DEFAULT_CONFIG;
}

// Save workout configuration
function saveWorkoutConfigData(config) {
    configCache = config;
    
    // Save to localStorage as backup
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    
    // Save to Firebase
    if (firebaseReady) {
        window.database.ref('config').set(config).catch(err => {
            console.error('Firebase save error:', err);
        });
    }
}

// Show status message
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + (isError ? 'status-error' : 'status-success');
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Tab switching
function showTab(tabName) {
    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Hide all tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });

    // Show selected tab
    const tabMapping = {
        'config': 'config-tab',
        'input': 'input-tab',
        'workout': 'workout-tab',
        'overall': 'overall-tab',
        'manage': 'manage-tab',
        'export': 'export-tab'
    };

    const tabId = tabMapping[tabName];
    const tabElement = document.getElementById(tabId);
    if (tabElement) {
        tabElement.style.display = 'block';
    }

    // Load data for the tab
    if (tabName === 'workout') {
        displayWorkoutRankings();
    } else if (tabName === 'overall') {
        displayOverallStandings();
    }
}

// Convert time string to seconds for comparison
function timeToSeconds(timeStr) {
    if (!timeStr || timeStr.trim() === '') return Infinity;
    const parts = String(timeStr).split(':');
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeStr) || Infinity;
}

// Save athlete scores
function saveScores() {
    const name = document.getElementById('athleteName').value.trim();
    const gender = document.getElementById('athleteGender').value;
    const team = document.getElementById('athleteTeam').value;

    if (!name) {
        showStatus('Please enter athlete name', true);
        return;
    }

    const config = getWorkoutConfig();
    const workouts = {};
    
    for (let i = 1; i <= 6; i++) {
        const wodType = config[i-1].type;
        let scoreValue = '';
        let tcNotFinished = false;
        let tiebreakers = null;
        
        if (wodType === 'time') {
            // Check if time cap not finished
            const tcCheckbox = document.getElementById(`wod${i}-tc-not-finished`);
            const scoreInput = document.getElementById(`wod${i}-score`);
            const repsInput = document.getElementById(`wod${i}-reps`);
            
            if (tcCheckbox && tcCheckbox.checked) {
                // Not finished: save reps
                scoreValue = repsInput ? repsInput.value.trim() : '';
                tcNotFinished = true;
                
                // Collect tiebreaker times if configured
                if (config[i-1].tiebreakers && config[i-1].tiebreakers.length > 0) {
                    tiebreakers = {};
                    config[i-1].tiebreakers.forEach(tb => {
                        const tbInput = document.getElementById(`wod${i}-tb-${tb.reps}`);
                        if (tbInput && tbInput.value.trim()) {
                            tiebreakers[tb.reps] = tbInput.value.trim();
                        }
                    });
                    // Only save tiebreakers object if at least one was entered
                    if (Object.keys(tiebreakers).length === 0) {
                        tiebreakers = null;
                    }
                }
            } else {
                // Finished: save time
                scoreValue = scoreInput ? scoreInput.value.trim() : '';
                tcNotFinished = false;
            }
        } else {
            // For amrap, weight, reps - just get the score
            const scoreInput = document.getElementById(`wod${i}-score`);
            scoreValue = scoreInput ? scoreInput.value.trim() : '';
        }
        
        workouts[`wod${i}`] = {
            score: scoreValue,
            type: wodType,
            tcNotFinished: tcNotFinished
        };
        
        // Add tiebreakers if present
        if (tiebreakers) {
            workouts[`wod${i}`].tiebreakers = tiebreakers;
        }
    }

    const scores = {
        name: name,
        gender: gender,
        team: team,
        workouts: workouts,
        timestamp: new Date().toISOString()
    };

    // Get existing scores
    let allScores = getAllScores();
    
    // Check if we're editing an existing athlete (original identity tracked in index.html)
    let existingIndex = -1;
    if (typeof editingOriginalIdentity !== 'undefined' && editingOriginalIdentity) {
        // Find by original identity (handles name/team/gender changes)
        existingIndex = allScores.findIndex(s => 
            s.name.toLowerCase() === editingOriginalIdentity.name.toLowerCase() && 
            s.gender === editingOriginalIdentity.gender && 
            s.team === editingOriginalIdentity.team
        );
    } else {
        // Check if athlete already exists by current values
        existingIndex = allScores.findIndex(s => 
            s.name.toLowerCase() === name.toLowerCase() && 
            s.gender === gender && 
            s.team === team
        );
    }

    if (existingIndex >= 0) {
        allScores[existingIndex] = scores;
        showStatus('Scores updated successfully! ✅');
    } else {
        allScores.push(scores);
        showStatus('Scores saved successfully! ✅');
    }
    
    // Update editing state with new values (so continued edits work correctly)
    if (typeof editingOriginalIdentity !== 'undefined') {
        editingOriginalIdentity = {
            name: name,
            gender: gender,
            team: team
        };
    }

    saveAllScores(allScores);
    
    // Hide edit mode banner if showing
    const editBanner = document.getElementById('edit-mode-banner');
    if (editBanner) {
        editBanner.style.display = 'none';
    }
}

// Clear form
function clearForm() {
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
        if (input.id !== 'athleteName' && input.id !== 'athleteGender' && input.id !== 'athleteTeam') {
            input.value = '';
        }
    });
    
    // Uncheck all time cap checkboxes and show time inputs
    for (let i = 1; i <= 6; i++) {
        const checkbox = document.getElementById(`wod${i}-tc-not-finished`);
        if (checkbox) {
            checkbox.checked = false;
            toggleTimeCap(i);
        }
        
        // Clear tiebreaker inputs
        const config = getWorkoutConfig();
        if (config[i-1].tiebreakers) {
            config[i-1].tiebreakers.forEach(tb => {
                const tbInput = document.getElementById(`wod${i}-tb-${tb.reps}`);
                if (tbInput) tbInput.value = '';
            });
        }
    }
    
    // Hide edit mode banner
    const editBanner = document.getElementById('edit-mode-banner');
    if (editBanner) {
        editBanner.style.display = 'none';
    }
    
    const editBtn = document.getElementById('edit-mode-btn');
    if (editBtn) {
        editBtn.style.display = 'none';
    }
    
    // Clear editing state
    if (typeof editingOriginalIdentity !== 'undefined') {
        editingOriginalIdentity = null;
    }
}

// Calculate rankings for a specific workout within a filtered group
function calculateWorkoutRankings(wodNumber, genderFilter, teamFilter) {
    let allScores = getAllScores();
    const config = getWorkoutConfig();
    const wodConfig = config[wodNumber - 1];
    
    // Filter by gender and team
    if (genderFilter !== 'all') {
        allScores = allScores.filter(s => s.gender === genderFilter);
    }
    if (teamFilter !== 'all') {
        allScores = allScores.filter(s => s.team === teamFilter);
    }

    const wodKey = `wod${wodNumber}`;
    const athletes = allScores.map(athlete => {
        const wod = athlete.workouts[wodKey];
        return {
            name: athlete.name,
            gender: athlete.gender,
            team: athlete.team,
            score: wod.score,
            type: wod.type,
            tcNotFinished: wod.tcNotFinished || false,
            tiebreakers: wod.tiebreakers || null
        };
    }).filter(a => a.score); // Only include athletes who have a score

    // Sort based on workout type
    athletes.sort((a, b) => {
        if (a.type === 'time') {
            // For time workouts:
            // Compare finished vs not finished (finished is better)
            if (a.tcNotFinished && !b.tcNotFinished) return 1;  // b is better
            if (!a.tcNotFinished && b.tcNotFinished) return -1; // a is better
            
            // Both finished or both not finished
            if (!a.tcNotFinished && !b.tcNotFinished) {
                // Both finished: lower time is better
                return timeToSeconds(a.score) - timeToSeconds(b.score);
            } else {
                // Both not finished: higher reps is better
                const repsA = parseFloat(a.score);
                const repsB = parseFloat(b.score);
                
                if (repsA !== repsB) {
                    return repsB - repsA;
                }
                
                // Same reps - check tiebreakers if configured
                if (wodConfig.tiebreakers && wodConfig.tiebreakers.length > 0) {
                    // Find the highest threshold that's at or below the rep count
                    const repCount = repsA;
                    const applicableThresholds = wodConfig.tiebreakers
                        .filter(tb => tb.reps <= repCount)
                        .sort((x, y) => y.reps - x.reps); // Highest first
                    
                    // Compare tiebreakers from highest to lowest threshold
                    for (const threshold of applicableThresholds) {
                        const tbA = a.tiebreakers && a.tiebreakers[threshold.reps];
                        const tbB = b.tiebreakers && b.tiebreakers[threshold.reps];
                        
                        // If one has tiebreaker and other doesn't, prefer the one with data
                        if (tbA && !tbB) return -1; // a is better
                        if (!tbA && tbB) return 1;  // b is better
                        
                        // If both have tiebreaker, compare times (lower is better)
                        if (tbA && tbB) {
                            const diff = timeToSeconds(tbA) - timeToSeconds(tbB);
                            if (diff !== 0) return diff;
                        }
                    }
                }
                
                return 0; // Completely tied
            }
        } else {
            // For reps/amrap/weight: higher is better
            const scoreA = parseFloat(a.score) || 0;
            const scoreB = parseFloat(b.score) || 0;
            return scoreB - scoreA;
        }
    });

    // Assign positions
    athletes.forEach((athlete, index) => {
        athlete.position = index + 1;
    });

    return athletes;
}

// Display workout rankings
function displayWorkoutRankings() {
    const wodSelector = document.getElementById('workoutSelector');
    if (!wodSelector) return;
    
    const wodNumber = wodSelector.value;
    const genderFilter = document.getElementById('workoutGenderFilter').value;
    const teamFilter = document.getElementById('workoutTeamFilter').value;

    const config = getWorkoutConfig();
    const wodConfig = config[wodNumber - 1];
    const rankings = calculateWorkoutRankings(wodNumber, genderFilter, teamFilter);
    
    // Check if this workout has tiebreakers
    const hasTiebreakers = wodConfig.tiebreakers && wodConfig.tiebreakers.length > 0;
    
    // Determine which columns to show based on filters
    const showGender = genderFilter === 'all';
    const showTeam = teamFilter === 'all';

    let html = '<div class="table-container"><table>';
    html += '<thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Athlete</th>';
    if (showGender) html += '<th>Gender</th>';
    if (showTeam) html += '<th>Team</th>';
    html += `<th>${getScoreLabel(wodConfig.type)}</th>`;
    
    // Add tiebreaker column if configured
    if (hasTiebreakers) {
        html += '<th>Tiebreaker</th>';
    }
    
    html += '</tr></thead><tbody>';

    rankings.forEach(athlete => {
        const rowClass = athlete.position <= 3 ? `rank-${athlete.position}` : '';
        html += `<tr class="${rowClass}">`;
        html += `<td>${athlete.position}</td>`;
        html += `<td><strong>${athlete.name}</strong></td>`;
        if (showGender) html += `<td>${athlete.gender}</td>`;
        if (showTeam) html += `<td>${athlete.team}</td>`;
        
        // Format score based on type
        let scoreDisplay = athlete.score;
        if (athlete.type === 'time' && athlete.tcNotFinished) {
            scoreDisplay = `${athlete.score} reps (DNF)`;
        } else if (athlete.type === 'weight') {
            scoreDisplay = `${athlete.score} kg/lbs`;
        }
        html += `<td>${scoreDisplay}</td>`;
        
        // Add tiebreaker column if configured
        if (hasTiebreakers) {
            let tiebreakerDisplay = 'n/a';
            
            // Only show tiebreaker if athlete didn't finish (has reps)
            if (athlete.tcNotFinished && athlete.tiebreakers) {
                const reps = parseFloat(athlete.score);
                
                // Find the highest tiebreaker threshold that's at or below their rep count
                const applicableThreshold = wodConfig.tiebreakers
                    .filter(tb => tb.reps <= reps)
                    .sort((a, b) => b.reps - a.reps)[0]; // Highest first
                
                if (applicableThreshold && athlete.tiebreakers[applicableThreshold.reps]) {
                    tiebreakerDisplay = `${athlete.tiebreakers[applicableThreshold.reps]} (${applicableThreshold.label})`;
                }
            }
            
            html += `<td style="font-size: 13px; color: #999;">${tiebreakerDisplay}</td>`;
        }
        
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    if (rankings.length === 0) {
        html = '<p style="text-align: center; color: #999; padding: 40px;">No scores recorded yet for this workout.</p>';
    }

    const displayDiv = document.getElementById('workout-rankings-display');
    if (displayDiv) {
        displayDiv.innerHTML = html;
    }
}

// Update workout selector with configured names
function updateWorkoutSelector() {
    const visibleWorkouts = getVisibleWorkouts();
    const selector = document.getElementById('workoutSelector');
    if (!selector) return;
    
    selector.innerHTML = '';
    visibleWorkouts.forEach((wod) => {
        const option = document.createElement('option');
        option.value = wod.originalIndex + 1;
        option.textContent = wod.name;
        selector.appendChild(option);
    });
}

// Calculate overall standings (best 4 out of 6 workouts)
function calculateOverallStandings(genderFilter, teamFilter) {
    let allScores = getAllScores();
    const config = getWorkoutConfig();
    const visibleWorkouts = getVisibleWorkouts();
    
    // Filter by gender and team
    if (genderFilter !== 'all') {
        allScores = allScores.filter(s => s.gender === genderFilter);
    }
    if (teamFilter !== 'all') {
        allScores = allScores.filter(s => s.team === teamFilter);
    }

    // Calculate positions for only visible workouts
    const workoutPositions = [];
    for (let i = 1; i <= 6; i++) {
        const rankings = calculateWorkoutRankings(i, genderFilter, teamFilter);
        workoutPositions.push(rankings);
    }

    // For each athlete, get their positions in each workout
    const athleteStandings = allScores.map(athlete => {
        const workoutData = []; // Store position or null for each workout (all 6)
        const positions = [];
        
        // Check all 6 workouts but only count visible ones in positions
        for (let i = 0; i < 6; i++) {
            const isVisible = config[i].visible !== false;
            const ranking = workoutPositions[i].find(r => 
                r.name === athlete.name && 
                r.gender === athlete.gender && 
                r.team === athlete.team
            );
            
            if (ranking) {
                workoutData.push(ranking.position);
                if (isVisible) {
                    // Only count visible workouts in overall standings
                    positions.push(ranking.position);
                }
            } else {
                workoutData.push(null); // Workout not completed
            }
        }

        // Calculate score based on number of workouts completed
        let totalScore;
        let best4 = [];
        
        if (positions.length >= 4) {
            // 4 or more workouts: take best 4
            const sortedPositions = positions.sort((a, b) => a - b);
            best4 = sortedPositions.slice(0, 4);
            totalScore = best4.reduce((sum, pos) => sum + pos, 0);
        } else {
            // Less than 4 workouts: sum all positions
            totalScore = positions.reduce((sum, pos) => sum + pos, 0);
            best4 = positions.sort((a, b) => a - b);
        }

        return {
            name: athlete.name,
            gender: athlete.gender,
            team: athlete.team,
            workoutData: workoutData, // Array with positions or null
            positions: positions,
            best4: best4,
            totalScore: totalScore,
            workoutsCompleted: positions.length
        };
    });

    // Sort by:
    // 1. Number of workouts completed (more is better)
    // 2. Total score (lower is better)
    athleteStandings.sort((a, b) => {
        if (a.workoutsCompleted !== b.workoutsCompleted) {
            return b.workoutsCompleted - a.workoutsCompleted; // More workouts completed is better
        }
        return a.totalScore - b.totalScore; // Lower score is better
    });

    // Assign overall positions
    athleteStandings.forEach((athlete, index) => {
        athlete.overallPosition = index + 1;
    });

    return athleteStandings;
}

// Display overall standings
function displayOverallStandings() {
    const genderFilter = document.getElementById('overallGenderFilter').value;
    const teamFilter = document.getElementById('overallTeamFilter').value;

    const standings = calculateOverallStandings(genderFilter, teamFilter);
    const config = getWorkoutConfig();
    const visibleWorkouts = getVisibleWorkouts();
    
    // Determine which columns to show based on filters
    const showGender = genderFilter === 'all';
    const showTeam = teamFilter === 'all';

    let html = '<div class="table-container"><table>';
    html += '<thead><tr>';
    html += '<th>Rank</th>';
    html += '<th>Athlete</th>';
    if (showGender) html += '<th>Gender</th>';
    if (showTeam) html += '<th>Team</th>';
    
    // Add column for each visible workout
    visibleWorkouts.forEach(workout => {
        html += `<th>${workout.name}</th>`;
    });
    
    html += '<th>Completed</th>';
    html += '<th>Total Score</th>';
    html += '</tr></thead><tbody>';

    standings.forEach(athlete => {
        const rowClass = athlete.overallPosition <= 3 ? `rank-${athlete.overallPosition}` : '';
        html += `<tr class="${rowClass}">`;
        html += `<td>${athlete.overallPosition}</td>`;
        html += `<td><strong>${athlete.name}</strong></td>`;
        if (showGender) html += `<td>${athlete.gender}</td>`;
        if (showTeam) html += `<td>${athlete.team}</td>`;
        
        // Show each visible workout position or X
        visibleWorkouts.forEach(workout => {
            const pos = athlete.workoutData[workout.originalIndex];
            if (pos === null) {
                html += '<td style="text-align: center; color: #ccc; font-weight: bold;">✗</td>';
            } else {
                // Highlight if it's in best 4 for athletes with 4+ workouts
                const isBest4 = athlete.workoutsCompleted >= 4 && athlete.best4.includes(pos);
                const style = isBest4 ? 'background: #3a3a3a; font-weight: bold; color: #8e44ad;' : '';
                html += `<td style="text-align: center; ${style}">${pos}</td>`;
            }
        });
        
        html += `<td style="text-align: center;"><strong>${athlete.workoutsCompleted}</strong> / ${visibleWorkouts.length}</td>`;
        
        // Show total score with indication of how many workouts counted
        const scoreNote = athlete.workoutsCompleted >= 4 ? ' (best 4)' : ' (all)';
        html += `<td style="text-align: center;"><strong>${athlete.totalScore}</strong><br><span style="font-size: 11px; color: #999;">${scoreNote}</span></td>`;
        
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    if (standings.length === 0) {
        html = '<p style="text-align: center; color: #999; padding: 40px;">No scores recorded yet.</p>';
    }

    const displayDiv = document.getElementById('overall-standings-display');
    if (displayDiv) {
        displayDiv.innerHTML = html;
    }
}

// Export data as JSON
function exportData() {
    const data = getAllScores();
    const config = getWorkoutConfig();
    const exportData = {
        scores: data,
        config: config,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fbl-wuid-ranking-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showStatus('Data exported successfully! 📥');
}

// Import data from JSON
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Check if it's new format (with config) or old format (just scores)
                if (data.scores && Array.isArray(data.scores)) {
                    saveAllScores(data.scores);
                    if (data.config) {
                        saveWorkoutConfigData(data.config);
                        loadConfigIntoForm();
                        updateInputForms();
                        updateWorkoutSelector();
                    }
                } else if (Array.isArray(data)) {
                    // Old format - just scores
                    saveAllScores(data);
                }
                
                showStatus('Data imported successfully! 📤');
            } catch (error) {
                showStatus('Error importing data. Please check the file format.', true);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to delete all stored data? This cannot be undone!')) {
        if (confirm('Really sure? This will delete all athlete scores!')) {
            localStorage.removeItem(STORAGE_KEY);
            showStatus('All data cleared! 🗑️');
            clearForm();
            
            // Refresh athlete list if on manage page
            const athleteListDisplay = document.getElementById('athlete-list-display');
            if (athleteListDisplay) {
                athleteListDisplay.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No athletes found.</p>';
            }
        }
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', function() {
    loadConfigIntoForm();
    updateInputForms();
    updateWorkoutSelector();
});
