# 🔥 Firebase Setup - 5 Minute Guide

## Step 1: Create Firebase Project (2 min)

1. Go to https://console.firebase.google.com/
2. Click **"Add project"**
3. Name it: `fbl-wuid-ranking`
4. Disable Google Analytics (not needed)
5. Click **"Create project"**

## Step 2: Enable Realtime Database (1 min)

⚠️ **IMPORTANT: Use "Realtime Database", NOT "Firestore Database"!**

Firebase has TWO database products - make sure you pick the right one:
- ❌ Cloud Firestore (document database) - **WRONG, skip this**
- ✅ Realtime Database (JSON database) - **CORRECT, use this**

### Exact Steps:

1. **In the left sidebar**, look under the **"Build"** section
2. You'll see two database options:
   - "Firestore Database" (skip this one)
   - **"Realtime Database"** ← Click this one
3. Click **"Create Database"** button (big button in the center)
4. **Location screen appears:**
   - Choose location: **europe-west1** (or closest to your users)
   - Click **"Next"**
5. **Security rules screen appears** with 2 radio button options:
   
   ```
   ⚪ Start in locked mode
      (Denies all reads and writes from mobile and web clients)
   
   🔘 Start in test mode  ← CLICK THIS RADIO BUTTON
      (All data is public and can be read/written by anyone for 30 days)
   ```
   
6. **Click the "Start in test mode" radio button** (second option)
7. Click **"Enable"** button at the bottom
8. Wait 10-20 seconds for database to be created

**What you'll see:** After creation, you'll see an empty database with a URL like:
`https://fbl-wuid-ranking-default-rtdb.europe-west1.firebasedatabase.app`

**What "test mode" means:** Anyone with the database URL can read/write data for 30 days. Perfect for getting started and testing. We'll add proper security in Step 5.

**Don't worry about the 30-day warning!** We'll update the rules before then.

## Step 3: Get Your Config (1 min)

After the database is created, you need to get your app's configuration:

1. **Click the gear icon ⚙️** (top left, next to "Project Overview")
2. Select **"Project settings"** from the dropdown
3. **Scroll down** to the **"Your apps"** section (bottom of the page)
4. You'll see: **"There are no apps in your project"**
5. Click the **web icon** `</>` (looks like HTML brackets)
6. **Register your app:**
   - App nickname: type `fbl-wuid-app`
   - DON'T check "Firebase Hosting" (we'll do that separately if needed)
   - Click **"Register app"**
7. **Copy the firebaseConfig object** that appears
   - It will show code like below
   - Copy ONLY the config object (the part between the curly braces)
   - Click **"Continue to console"** when done

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "fbl-wuid-ranking.firebaseapp.com",
  databaseURL: "https://fbl-wuid-ranking-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "fbl-wuid-ranking",
  storageBucket: "fbl-wuid-ranking.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

## Step 4: Update Your Files (1 min)

### In `index.html`:
Find line ~465 and replace YOUR_API_KEY, YOUR_PROJECT, etc. with your actual values:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### In `admin.html`:
Do the same thing around line ~750

**OR** just paste your entire firebaseConfig object Copy from Firebase Console!

## Step 5: Secure Your Database (IMPORTANT!)

After testing, go back to Firebase Console:
1. **Realtime Database** → **Rules** tab
2. Replace with these rules:

```json
{
  "rules": {
    "scores": {
      ".read": true,
      ".write": true
    },
    "config": {
      ".read": true,
      ".write": true
    }
  }
}
```

For production, you might want to add authentication, but for an internal team competition, this works fine.

## ✅ Test It!

1. Open `index.html` in your browser
2. Enter a test score
3. Open `index.html` in another browser or device
4. **The score should appear automatically!** 🎉

## 🚀 Deploy to GitHub Pages

```bash
cd /home/bbroecker/src/playground/video_test/fbl_wuid_internal_ranking

# Initialize git
git init
git add .
git commit -m "Add Firebase real-time sync"

# Push to GitHub (create repo first on github.com)
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/fbl-wuid-ranking.git
git push -u origin main

# Enable GitHub Pages
# Go to repo Settings → Pages → Source: main branch → Save
```

Your app will be live at: `https://YOUR_USERNAME.github.io/fbl-wuid-ranking/`

## 🎯 What You Get

✅ **Real-time sync** - Everyone sees scores instantly  
✅ **Multi-device** - Athletes can enter from their own phones  
✅ **Persistent** - Data stored in cloud, not browser  
✅ **Automatic updates** - Rankings refresh automatically  
✅ **Free** - Firebase Spark (free) plan is more than enough  

## 📊 How It Works

- **Scores stored in**: `/scores` (array of athlete objects)
- **Config stored in**: `/config` (array of workout configs)
- **localStorage** is kept as backup (works offline)
- **Auto-syncs** when online

## 🔍 Debug

Check browser console (F12) for errors. Common issues:

**"Firebase not available" / Offline mode**
- Config not set correctly in HTML files
- Make sure you replaced ALL placeholder values (apiKey, projectId, databaseURL, etc.)
- Check there are no typos in the config

**"Permission denied" error**
- Database rules too restrictive
- Go back to Firebase Console → Realtime Database → Rules tab
- Make sure rules allow read/write (see Step 5)
- Click "Publish" after changing rules

**"Cannot read property 'database' of undefined"**
- Firebase scripts didn't load
- Check your internet connection
- Make sure the Firebase CDN URLs are correct in HTML

**Data not syncing between devices**
- Check databaseURL is correct (should end with .firebasedatabase.app)
- Verify both devices show 🟢 "Connected" status
- Check Firebase Console → Data tab to see if data is actually saving

**Still can't connect?**
- Try the "Test it" steps below first
- Copy the EXACT error message from browser console (F12)
- Check Firebase Console → Realtime Database is showing "Ready" status

## 💡 Tips

- **Database usage**: ~100KB per competition (way under free limit)
- **Concurrent users**: Free plan allows 100 simultaneous connections
- **Export backups**: Still export data regularly from admin page
- **Clear data**: Delete from Firebase Console → Data tab if needed

Need help? Check: https://firebase.google.com/docs/database
