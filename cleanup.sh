#!/bin/bash

# CCvGEN Build Cleanup Script
# Removes intermediate build files to save disk space

set -e

echo "🧹 CCvGEN Build Cleanup"
echo "======================="
echo ""

# Check if target directory exists
if [[ ! -d "src-tauri/target" ]]; then
    echo "✅ No build artifacts found - nothing to clean"
    exit 0
fi

# Calculate space before cleanup
BEFORE_SIZE=$(du -sh src-tauri/target 2>/dev/null | cut -f1 || echo "0B")
echo "📊 Current build directory size: $BEFORE_SIZE"
echo ""

echo "🗑️  Removing intermediate build files..."

# Remove debug builds
if [[ -d "src-tauri/target/debug" ]]; then
    rm -rf src-tauri/target/debug
    echo "   ✅ Removed debug builds"
fi

# Remove incremental compilation cache
find src-tauri/target -name "incremental" -type d -exec rm -rf {} + 2>/dev/null || true
echo "   ✅ Removed incremental compilation cache"

# Remove build script outputs
find src-tauri/target -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
echo "   ✅ Removed build script outputs"

# Remove dependency cache
find src-tauri/target -name "deps" -type d -exec rm -rf {} + 2>/dev/null || true
echo "   ✅ Removed dependency cache"

# Remove intermediate object files
find src-tauri/target -name "*.o" -delete 2>/dev/null || true
find src-tauri/target -name "*.rlib" -delete 2>/dev/null || true
find src-tauri/target -name "*.rmeta" -delete 2>/dev/null || true
echo "   ✅ Removed intermediate object files"

# Calculate space after cleanup
AFTER_SIZE=$(du -sh src-tauri/target 2>/dev/null | cut -f1 || echo "0B")

echo ""
echo "✅ Cleanup completed!"
echo "📊 Build directory size: $BEFORE_SIZE → $AFTER_SIZE"
echo ""
echo "📝 Note: Final executables and installers are preserved"
echo "   These can be found in src-tauri/target/*/release/bundle/"