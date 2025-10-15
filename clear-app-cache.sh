#!/bin/bash

# Clear All App Caches Script
# Clears all development and system caches for the Loud Mouth app

echo "🧹 Clearing all app caches for Loud Mouth..."

# Clear Cargo build cache
echo "→ Clearing Cargo build cache..."
cd "$(dirname "$0")/src-tauri" && cargo clean
cd "$(dirname "$0")"

# Clear Xcode DerivedData
echo "→ Clearing Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/LoudMouth-*

# Clear user icon caches
echo "→ Clearing icon caches..."
rm -rf ~/Library/Caches/com.apple.iconservices
rm -rf ~/Library/Caches/com.apple.dock.iconcache
find ~/Library/Caches -name "*icon*" -type d 2>/dev/null | xargs rm -rf 2>/dev/null

# Clear node_modules cache
echo "→ Clearing node_modules cache..."
rm -rf node_modules/.vite

# Clear dist folder
echo "→ Clearing dist folder..."
rm -rf dist

# Restart Dock
echo "→ Restarting Dock..."
killall Dock 2>/dev/null

# Restart Finder
echo "→ Restarting Finder..."
killall Finder 2>/dev/null

echo ""
echo "✅ All caches cleared successfully!"
echo ""
echo "📝 Note: For system-level icon cache, run manually:"
echo "   sudo rm -rf /Library/Caches/com.apple.iconservices.store"
echo ""
