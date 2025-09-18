#!/bin/bash

# CCvGEN Tauri Build Script
# Automatically detects OS and builds for the appropriate platform

set -e

echo "🚀 CCvGEN Build Script"
echo "======================"

# Detect operating system
OS=""
case "$(uname -s)" in
    Darwin*)
        OS="macOS"
        TARGET="aarch64-apple-darwin"
        if [[ $(uname -m) == "x86_64" ]]; then
            TARGET="x86_64-apple-darwin"
        fi
        ;;
    Linux*)
        OS="Linux"
        TARGET="x86_64-unknown-linux-gnu"
        ;;
    CYGWIN*|MINGW*|MSYS*)
        OS="Windows"
        TARGET="x86_64-pc-windows-msvc"
        ;;
    *)
        echo "❌ Unsupported operating system: $(uname -s)"
        exit 1
        ;;
esac

echo "🖥️  Detected OS: $OS"
echo "🎯 Target: $TARGET"
echo ""

# Check if required tools are installed
echo "🔍 Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust first."
    exit 1
fi

# Check if target is installed
if ! rustup target list --installed | grep -q "$TARGET"; then
    echo "📦 Installing Rust target: $TARGET"
    rustup target add "$TARGET"
fi

echo "✅ All dependencies are ready"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install
echo ""

# Build frontend
echo "🏗️  Building frontend..."
npm run build
echo ""

# Build Tauri app
echo "🔨 Building Tauri application for $OS..."
if [[ "$OS" == "Windows" ]]; then
    # Windows-specific build
    npm run tauri build -- --target "$TARGET"
    
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Output files:"
    echo "   • Executable: src-tauri/target/$TARGET/release/ccvgen.exe"
    echo "   • Installer: src-tauri/target/$TARGET/release/bundle/msi/CCvGEN_1.0.0_x64_en-US.msi"
    
elif [[ "$OS" == "macOS" ]]; then
    # macOS-specific build
    npm run tauri build -- --target "$TARGET"
    
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Output files:"
    echo "   • App Bundle: src-tauri/target/$TARGET/release/bundle/macos/CCvGEN.app"
    echo "   • DMG: src-tauri/target/$TARGET/release/bundle/dmg/CCvGEN_1.0.0_*.dmg"
    
elif [[ "$OS" == "Linux" ]]; then
    # Linux-specific build
    npm run tauri build -- --target "$TARGET"
    
    echo ""
    echo "✅ Build completed successfully!"
    echo "📁 Output files:"
    echo "   • Executable: src-tauri/target/$TARGET/release/ccvgen"
    echo "   • AppImage: src-tauri/target/$TARGET/release/bundle/appimage/ccvgen_1.0.0_amd64.AppImage"
    echo "   • DEB: src-tauri/target/$TARGET/release/bundle/deb/ccvgen_1.0.0_amd64.deb"
fi

echo ""
echo "🧹 Cleaning up build artifacts..."

# Calculate space before cleanup
BEFORE_SIZE=$(du -sh src-tauri/target 2>/dev/null | cut -f1 || echo "0B")

# Remove intermediate build files to save space
# Keep only the final release bundles and executables
if [[ -d "src-tauri/target" ]]; then
    # Remove debug builds
    rm -rf src-tauri/target/debug 2>/dev/null || true
    
    # Remove incremental compilation cache
    find src-tauri/target -name "incremental" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove build script outputs
    find src-tauri/target -name "build" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Remove dependency cache (keeps only final artifacts)
    find src-tauri/target -name "deps" -type d -exec rm -rf {} + 2>/dev/null || true
    
    # Keep only essential files in release directory
    # Remove intermediate object files but keep final executables and bundles
    find src-tauri/target/*/release -name "*.o" -delete 2>/dev/null || true
    find src-tauri/target/*/release -name "*.rlib" -delete 2>/dev/null || true
    find src-tauri/target/*/release -name "*.rmeta" -delete 2>/dev/null || true
fi

# Calculate space after cleanup
AFTER_SIZE=$(du -sh src-tauri/target 2>/dev/null | cut -f1 || echo "0B")

echo "   ✅ Cleaned up intermediate build files"
echo "   📊 Build directory size: $BEFORE_SIZE → $AFTER_SIZE"

echo ""
echo "🎉 Build process completed!"
echo ""
echo "📝 Notes:"
echo "   • Reference materials folder is excluded from packaging"
echo "   • Save data files are excluded from packaging"
echo "   • Intermediate build files have been cleaned up to save space"
echo "   • Built with Tauri v2 for optimal performance"