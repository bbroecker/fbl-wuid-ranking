#!/bin/bash

# Quick deployment script for GitHub Pages

echo "🚀 FBL Wuid Internal Ranking - Deployment Script"
echo "================================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if in git repo
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
    git branch -M main
fi

# Get GitHub username and repo name
echo "Enter your GitHub username:"
read GITHUB_USER

echo "Enter repository name (e.g., fbl-wuid-ranking):"
read REPO_NAME

# Add all files
echo ""
echo "📝 Adding files..."
git add .

# Commit
echo "Enter commit message (or press Enter for default):"
read COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update FBL Wuid Internal Ranking"
fi

git commit -m "$COMMIT_MSG"

# Check if remote exists
if git remote | grep -q "origin"; then
    echo "🔄 Pushing to existing remote..."
    git push
else
    echo "🔗 Adding remote and pushing..."
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    git push -u origin main
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Next steps:"
echo "1. Go to: https://github.com/$GITHUB_USER/$REPO_NAME/settings/pages"
echo "2. Under 'Source', select: Deploy from branch"
echo "3. Select branch: main"
echo "4. Click Save"
echo ""
echo "🌐 Your app will be live at:"
echo "   https://$GITHUB_USER.github.io/$REPO_NAME/"
echo ""
echo "⚠️  IMPORTANT: Don't forget to set up Firebase!"
echo "   See FIREBASE_SETUP.md for instructions"
