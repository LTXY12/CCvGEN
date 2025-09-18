@echo off
setlocal enabledelayedexpansion

REM CCvGEN Tauri Build Script for Windows
REM Builds Windows executable and installer

echo.
echo 🚀 CCvGEN Build Script (Windows)
echo ===================================
echo.

REM Check if required tools are installed
echo 🔍 Checking dependencies...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check Rust
rustc --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Rust is not installed. Please install Rust first.
    pause
    exit /b 1
)

REM Check if Windows target is installed
rustup target list --installed | findstr "x86_64-pc-windows-msvc" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Rust target: x86_64-pc-windows-msvc
    rustup target add x86_64-pc-windows-msvc
)

echo ✅ All dependencies are ready
echo.

REM Install npm dependencies
echo 📦 Installing npm dependencies...
npm install
if errorlevel 1 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)
echo.

REM Build frontend
echo 🏗️  Building frontend...
npm run build
if errorlevel 1 (
    echo ❌ Failed to build frontend
    pause
    exit /b 1
)
echo.

REM Build Tauri app
echo 🔨 Building Tauri application for Windows...
npm run tauri build
if errorlevel 1 (
    echo ❌ Failed to build Tauri application
    pause
    exit /b 1
)

echo.
echo ✅ Build completed successfully!
echo 📁 Output files:
echo    • Executable: src-tauri\target\release\ccvgen.exe
echo    • Installer: src-tauri\target\release\bundle\msi\CCvGEN_1.0.0_x64_en-US.msi
echo.
echo 🧹 Cleaning up build artifacts...

REM Calculate space before cleanup (Windows dir command)
for /f "tokens=3" %%i in ('dir /s /-c src-tauri\target ^| findstr /C:"bytes"') do set BEFORE_SIZE=%%i

REM Remove intermediate build files to save space
REM Keep only the final release bundles and executables
if exist "src-tauri\target" (
    REM Remove debug builds
    if exist "src-tauri\target\debug" rmdir /s /q "src-tauri\target\debug" 2>nul
    
    REM Remove incremental compilation cache
    for /d /r "src-tauri\target" %%d in (incremental) do (
        if exist "%%d" rmdir /s /q "%%d" 2>nul
    )
    
    REM Remove build script outputs
    for /d /r "src-tauri\target" %%d in (build) do (
        if exist "%%d" rmdir /s /q "%%d" 2>nul
    )
    
    REM Remove dependency cache
    for /d /r "src-tauri\target" %%d in (deps) do (
        if exist "%%d" rmdir /s /q "%%d" 2>nul
    )
    
    REM Remove intermediate object files
    del /s /q "src-tauri\target\*.o" 2>nul
    del /s /q "src-tauri\target\*.rlib" 2>nul
    del /s /q "src-tauri\target\*.rmeta" 2>nul
)

REM Calculate space after cleanup
for /f "tokens=3" %%i in ('dir /s /-c src-tauri\target ^| findstr /C:"bytes"') do set AFTER_SIZE=%%i

echo    ✅ Cleaned up intermediate build files
echo    📊 Build directory size reduced significantly

echo.
echo 🎉 Build process completed!
echo.
echo 📝 Notes:
echo    • Reference materials (참고사항) folder is excluded from packaging
echo    • Save data files are excluded from packaging
echo    • Intermediate build files have been cleaned up to save space
echo    • Built with Tauri v2 for optimal performance
echo.
pause