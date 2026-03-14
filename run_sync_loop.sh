#!/bin/bash
# Run Circle21 sync every 20 minutes
# Press Ctrl+C to stop

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/circle21_sync.log"

echo "🔄 Starting Circle21 auto-sync loop"
echo "   Interval: Every 20 minutes"
echo "   Log: $LOG_FILE"
echo "   Press Ctrl+C to stop"
echo ""

# Trap Ctrl+C and cleanup
trap 'echo ""; echo "👋 Stopping sync loop..."; exit 0' INT

# Run sync immediately on start
echo "$(date '+%Y-%m-%d %H:%M:%S') - Running initial sync..."
python3 "$SCRIPT_DIR/circle21_sync.py" 2>&1 | tee -a "$LOG_FILE"

# Loop every 20 minutes
while true; do
    echo ""
    echo "⏰ Next sync in 20 minutes (at $(date -d '+20 minutes' '+%H:%M'))..."
    echo "   Press Ctrl+C to stop"
    
    # Sleep for 20 minutes (1200 seconds)
    sleep 1200
    
    echo ""
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Running scheduled sync..."
    python3 "$SCRIPT_DIR/circle21_sync.py" 2>&1 | tee -a "$LOG_FILE"
done
