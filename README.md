# FBL - Wuid Internal Ranking System

Official scoring system for the FBL Wuid internal ranking competition.

## � Real-Time Sync with Firebase

**NEW!** The app now supports real-time cloud synchronization across all devices!

- ✅ **Multi-device sync** - Athletes enter scores on their own phones
- ✅ **Live updates** - See everyone's scores instantly
- ✅ **Cloud storage** - Data safe in Firebase, not just browser
- ✅ **Offline fallback** - Still works with localStorage if Firebase not configured

**Setup in 5 minutes**: See **[QUICKSTART.md](QUICKSTART.md)** and **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)**

---

## �🚀 Quick Start

### For Athletes

1. **Open the app:** Double-click `index.html` or visit the hosted URL
2. **Enter your scores:**
   - Type your name (use consistently!)
   - Select your gender and team
   - Fill in your workout scores
   - Click "Save Scores"
3. **Edit your scores:**
   - Enter your name again
   - Click "Edit My Scores" button
   - Update scores and save

### For Admins

1. **Access admin panel:** Open `admin.html` or click "Admin" link
2. **Configure workouts** (before competition):
   - Set workout names
   - Choose scoring types (For Time, AMRAP, Max Weight)
   - Define tiebreakers
   - Save configuration
3. **Manage athletes:**
   - View all entries
   - Delete incorrect scores
   - Export backups regularly

## 📁 Files

- **`index.html`** - Main scoring page for athletes (user-facing)
- **`admin.html`** - Admin panel for configuration and management
- **`scoring.js`** - Shared JavaScript logic
- **`wuid_logo.webp`** - Wuid logo
- **`sample-data.json`** - Test data for demonstrations

## ⚙️ Features

### User Page (index.html)
- ✅ Score input for all 6 workouts
- ✅ Edit existing scores
- ✅ View workout rankings
- ✅ View overall standings
- ✅ Filter by gender and team
- ✅ Mobile responsive design
- ✅ Offline capable (localStorage)

### Admin Page (admin.html)
- ✅ Configure workout types
- ✅ Set custom workout names
- ✅ Define tiebreaker rules
- ✅ View all athlete entries
- ✅ Delete athlete scores
- ✅ Export/import data
- ✅ Clear all data

## 🏆 Competition Rules

1. **6 Workouts** - Athletes complete up to 6 workouts
2. **Best 4 Count** - Only the best 4 workout positions are summed
3. **Lower Score Wins** - Lower position sum = better overall rank

### Scoring Types

| Type | Description | Ranking |
|------|-------------|---------|
| **For Time** | Complete work ASAP | Faster = Better |
| **AMRAP** | Max reps in time cap | More reps = Better |
| **Max Weight** | Lift maximum weight | Heavier = Better |
| **Total Reps** | Count total reps | More reps = Better |

## 📊 How Scoring Works

### Example:
An athlete competes in all 6 workouts and places:
- Workout 1: 3rd place
- Workout 2: 1st place  
- Workout 3: 5th place
- Workout 4: 2nd place
- Workout 5: 7th place
- Workout 6: 4th place

**Best 4 positions:** 1st, 2nd, 3rd, 4th = **10 points total**

The athlete with the lowest total score wins!

## 🔧 Setup Instructions

### Local Testing

```bash
# Open in browser (simplest method)
cd fbl_wuid_internal_ranking
open index.html  # Mac
# or
xdg-open index.html  # Linux
# or just double-click the file

# Or run local server
python3 -m http.server 8000
# Then visit: http://localhost:8000/index.html
```

### Deployment

See main [DEPLOYMENT.md](../DEPLOYMENT.md) for hosting options:
- **Netlify** - Drag & drop (easiest)
- **Firebase Hosting** - Google service
- **GitHub Pages** - Free static hosting
- **Vercel** - Simple CLI or web deploy

## 👥 Workflow

### Before Competition

1. **Admin configures workouts:**
   - Open `admin.html`
   - Go to "Workout Config" tab
   - Set up all 6 workouts
   - Save configuration

2. **Test with sample data:**
   - Import `sample-data.json`
   - Verify rankings look correct
   - Delete test data

3. **Deploy:**
   - Upload all files to hosting
   - Share URL with athletes

### During Competition

1. **Athletes submit scores:**
   - After each workout, athletes visit the site
   - Enter their scores immediately
   - Verify the score was saved

2. **Admin monitors:**
   - Check for duplicate or incorrect entries
   - Export data after each workout (backup!)
   - Answer athlete questions

3. **Rankings update automatically:**
   - Rankings recalculate after each score entry
   - No manual updates needed

### After Competition

1. **Export final data:**
   - Admin exports JSON backup
   - Store safely (Google Drive, etc.)

2. **Announce results:**
   - Share standings with teams
   - Celebrate the winners! 🎉

## 💾 Data Management

### Backup Data
```
1. Admin page → "Data Management" tab
2. Click "Export Data"
3. Save JSON file to safe location
4. Store in Google Drive/Dropbox
```

### Restore Data
```
1. Admin page → "Data Management" tab
2. Click "Import Data"
3. Select backup JSON file
```

### Clear All Data
```
⚠️ WARNING: This deletes everything!
1. Admin page → "Data Management" tab
2. Click "Clear All Data"
3. Confirm twice
```

## 🔐 Security

- **No passwords** - Simple, open access
- **Local storage** - Data stored in browser
- **Admin page** - No password protection (add if needed)
- **Data privacy** - All data stays on device until exported

### Adding Password Protection

To add simple password protection to admin page, add this to top of `admin.html`:

```html
<script>
    const ADMIN_PASSWORD = "your_password_here";
    const entered = prompt("Enter admin password:");
    if (entered !== ADMIN_PASSWORD) {
        alert("Access denied!");
        window.location.href = "index.html";
    }
</script>
```

## 📱 Mobile Optimization

- Works perfectly on phones and tablets
- Touch-friendly interface
- Responsive tables
- Optimized for portrait and landscape

### Add to Home Screen

Users can save to phone home screen for app-like experience:
1. Open site in mobile browser
2. Safari: Share → Add to Home Screen
3. Chrome: Menu → Add to Home Screen

## ❓ Troubleshooting

### Scores not saving
- Check that athlete name is entered
- Verify browser allows localStorage
- Try different browser

### Rankings look wrong  
- Verify workout types are configured correctly
- Check that all athletes use same gender/team labels
- Ensure scores are in correct format

### Can't delete athlete
- Only admins can delete from admin page
- Make sure you're on `admin.html` not `index.html`

### Lost all data
- Import your last backup
- Check browser localStorage (F12 → Application → Local Storage)
- Export data regularly to prevent loss!

## 🎨 Customization

### Change Colors

Edit CSS in `index.html` or `admin.html`:
```css
/* Main color scheme */
background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
color: #e74c3c; /* Red accent */
```

### Change Team Names

Edit in both HTML files:
```html
<option value="team1">Team 1</option>
<option value="team2">Team 2</option>
```

### Add More Teams

Currently limited to 2 teams. To add more:
1. Update both HTML files team selectors
2. Update filtering logic if needed

## 📈 Analytics

To track usage statistics, add Google Analytics or similar:

```html
<!-- Add before closing </head> tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-GA-ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR-GA-ID');
</script>
```

## 🏆 Circle21 Competition Tracking

**NEW!** Track your athletes' performance in external Circle21 competitions with automatic data sync!

### Overview

The Circle21 module fetches athlete placements from Circle21 competitions (like Fitness Bundesliga Local Qualifiers) and displays them alongside your internal rankings - **completely isolated** from your main athlete data.

### Architecture (Isolation Guaranteed)

- **Separate JavaScript Module:** `circle21.js` (isolated from `scoring.js`)
- **Separate Firebase Path:** `/circle21` (completely separate from `/scores`)
- **Separate localStorage:** `fbl-circle21-athletes-v2` (no overlap)
- **🔒 Zero Cross-Contamination:** Main athletes and Circle21 athletes cannot interfere

### Quick Setup

1. **Edit the sync script:** `circle21_sync.py`
2. **Add athletes to track:**
   ```python
   ATHLETES_TO_TRACK = [
       ("Bastian Broecker", "M"),
       ("Another Athlete", "F"),
       # Add more...
   ]
   ```
3. **Run the sync:** `python3 circle21_sync.py`
4. **View on website:** Circle21 Leaderboard tab updates automatically

### How It Works

The system uses Circle21's API to fetch:
- Overall competition placement
- Individual workout placements (LQ1-LQ6)
- Real-time updates via Firebase

**Data Flow:**
```
circle21_sync.py → Circle21 API → Firebase /circle21 → Website Display
        ↑                                               ↓
  Edit athlete list                            Isolated module loads data
```

### Features

- ✅ **Fully Automatic:** Fetches from Circle21 API directly
- ✅ **Isolated Architecture:** Cannot affect main athlete data
- ✅ **Real-time Sync:** Updates via Firebase
- ✅ **Sortable Leaderboard:** Click column headers to sort
- ✅ **Gender Filtering:** Separate Male/Female divisions
- ✅ **Multi-Workout Tracking:** 6 workouts (LQ1-LQ6) tracked per athlete
- ✅ **Competition Context:** Displays total competitor count (e.g., "Tracking 3 athletes out of 987 total competitors")
- ✅ **Automated Sync:** Optional 15-minute auto-sync via cron job

### Running the Sync

**Manual sync (run once):**
```bash
python3 circle21_sync.py
```

**Auto-sync while PC is on (recommended for manual control):**

Start a loop that syncs every 20 minutes:
```bash
./run_sync_loop.sh
```

- Runs immediately, then every 20 minutes
- Shows countdown to next sync
- Press **Ctrl+C** to stop
- Logs saved to `circle21_sync.log`

**Auto-sync with cron (runs in background always):**

For automatic sync even when terminal is closed:

1. **Setup (one-time):**
   ```bash
   ./setup_auto_sync.sh
   ```

2. **Verify it's running:**
   ```bash
   crontab -l | grep circle21
   ```

3. **View sync logs:**
   ```bash
   tail -f circle21_sync.log
   ```

4. **To remove automatic sync:**
   ```bash
   crontab -e
   # Delete the line containing "circle21_sync.py"
   ```

**Alternative manual cron setup:**
```bash
# Edit crontab
crontab -e

# Add this line to sync every 15 minutes:
*/15 * * * * cd /path/to/fbl_wuid_internal_ranking && python3 circle21_sync.py >> circle21_sync.log 2>&1
```

### Data Structure

Each athlete tracked:
```json
{
  "name": "Bastian Broecker",
  "gender": "M",
  "overall": 571,
  "workouts": {
    "LQ1": 449,
    "LQ2": null,
    "LQ3": 297,
    "LQ4": null,
    "LQ5": 253,
    "LQ6": 154
  },
  "timestamp": 1773500002
}
```

### Security Notes

- Bearer token in `circle21_sync.py` expires periodically
- To update token: Copy from browser DevTools → Network tab → Circle21 API request
- Token location: Line 34 in `circle21_sync.py`

### Troubleshooting

**Sync script fails:**
- Check internet connection
- Verify Firebase API key in script
- Check Circle21 website accessibility

**Athletes not showing:**
- Verify script ran successfully (check output)
- Check Firebase Console → `/circle21` path
- Hard refresh browser (Ctrl+Shift+R)

**Need female division:**
- Update `division_female` ID in `circle21_sync.py` line 31
- Get ID from Circle21 website URL when viewing female leaderboard

---

## 🤝 Support

For issues or questions:
1. Check this README
2. Review main [README.md](../README.md)
3. Check [WORKOUT_CONFIG.md](../WORKOUT_CONFIG.md) for workout setup

## 📝 License

Free to use and modify for Wuid internal competitions.

---

**Ready to go?** 

1. Configure workouts in `admin.html`
2. Deploy to hosting service
3. Share URL with athletes!

🏋️ Good luck with your FBL competition! 💪
