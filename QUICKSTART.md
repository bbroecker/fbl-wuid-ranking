# 🚀 Quick Start Guide - Server-Side Storage

Your app now has **real-time Firebase sync**! Follow these steps to get it running in 5 minutes.

## ⚡ Super Quick Setup

### 1️⃣ Setup Firebase (2 minutes)
See **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** for detailed instructions.

**TL;DR:**
- Go to https://console.firebase.google.com/
- Create project → Enable Realtime Database → Get config
- Paste config into `index.html` and `admin.html` (line ~465)

### 2️⃣ Test Locally (1 minute)
```bash
cd /home/bbroecker/src/playground/video_test/fbl_wuid_internal_ranking
python3 -m http.server 8001
```
Open http://localhost:8001 - You should see 🟢 "Connected"

### 3️⃣ Deploy to GitHub Pages (2 minutes)
```bash
./deploy.sh
```
Follow prompts, then enable Pages in GitHub repo settings.

## ✅ What You Get

**Before (localStorage):**
- ❌ Data only on one device
- ❌ Manual data merging needed
- ❌ No real-time updates

**After (Firebase):**
- ✅ **Real-time sync** across all devices
- ✅ **Cloud storage** - data safe in Firebase
- ✅ **Auto-refresh** - see others' scores instantly
- ✅ **Multi-user** - everyone can enter simultaneously
- ✅ **Offline fallback** - localStorage backup

## 🔍 Connection Status

Look for the status at the top of the page:
- 🟢 **Connected** - Real-time sync working
- 🟡 **Reconnecting...** - Temporary connection issue
- 🔴 **Offline mode** - Using localStorage only (Firebase not configured)

## 🎯 How to Use

### For Athletes:
1. Open the app on your phone/computer
2. Enter your name, gender, team
3. Fill in workout scores
4. Click "Save Scores"
5. **Scores appear on everyone's screen instantly!** ✨

### For Admins:
1. Open admin.html
2. Configure workouts (names, types, visibility)
3. View all athlete scores
4. Export backups regularly
5. Manage visibility of workouts (hide WOD 6 until announced)

## 📊 Data Structure

Your Firebase database has two main nodes:

```
fbl-wuid-ranking/
├── scores/          # Array of athlete objects
│   ├── [0]
│   │   ├── name: "John Doe"
│   │   ├── gender: "M"
│   │   ├── team: "team1"
│   │   └── workouts: {...}
│   └── [1]...
└── config/          # Array of workout configs
    ├── [0]
    │   ├── name: "Workout 1"
    │   ├── type: "time"
    │   └── visible: true
    └── [1]...
```

## 🔒 Security Notes

**Current setup**: Anyone with the URL can read/write data  
**Good for**: Internal team competitions  
**Not good for**: Public/sensitive data  

To add security:
1. Enable Firebase Authentication
2. Update database rules to require auth
3. Add login page

For now, just don't share the URL publicly!

## 🐛 Troubleshooting

### Can't connect to Firebase
- Check browser console (F12) for errors
- Verify Firebase config is correct
- Make sure databaseURL is set
- Check Firebase Console → Realtime Database is enabled

### Data not syncing
- Look at connection status indicator
- Check your internet connection
- Verify Firebase rules allow read/write
- Try refreshing the page

### "Permission denied" error
- Firebase rules too restrictive
- Go to Database → Rules tab
- Set read/write to true for testing

### Old localStorage data interfering
- Export current data first
- Clear browser localStorage (F12 → Application → Local Storage)
- Refresh page

## 💡 Pro Tips

1. **Test first**: Try with fake data before competition
2. **Export backups**: Use admin page export before each competition day
3. **Share QR code**: Generate QR code for the URL for easy access
4. **Bookmark admin**: Save admin.html URL separately
5. **Monitor Firebase**: Keep Firebase Console open during competition
6. **Set workout visibility**: Hide WOD 6 until announcement day

## 📈 Firebase Limits (Free Tier)

- **Storage**: 1 GB (your app uses ~100 KB)
- **Download**: 10 GB/month (plenty for small team)
- **Connections**: 100 simultaneous users
- **Operations**: Unlimited for Realtime Database

You're nowhere near these limits! 🎉

## 🆘 Need Help?

1. Check [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. Check [README.md](README.md)
3. Firebase docs: https://firebase.google.com/docs/database
4. GitHub issues: Create one in your repo

---

**Ready? Follow FIREBASE_SETUP.md now! ⏰**
