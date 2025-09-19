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
    echo ⚠️  Rust is not installed. Installing Rust automatically...
    echo.
    
    REM Download and run rustup installer
    echo 📥 Downloading Rust installer...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'}"
    if errorlevel 1 (
        echo ❌ Failed to download Rust installer
        pause
        exit /b 1
    )
    
    echo 📦 Installing Rust...
    "%TEMP%\rustup-init.exe" -y --default-toolchain stable --profile default
    if errorlevel 1 (
        echo ❌ Failed to install Rust
        pause
        exit /b 1
    )
    
    REM Add Rust to current session PATH
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
    
    REM Clean up installer
    del "%TEMP%\rustup-init.exe" 2>nul
    
    echo ✅ Rust installed successfully!
    echo.
    
    REM Verify installation
    rustc --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Rust installation verification failed. Please restart your terminal.
        pause
        exit /b 1
    )
)

REM Check if Windows target is installed
rustup target list --installed | findstr "x86_64-pc-windows-msvc" >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Rust target: x86_64-pc-windows-msvc
    rustup target add x86_64-pc-windows-msvc
    if errorlevel 1 (
        echo ❌ Failed to add Windows target
        pause
        exit /b 1
    )
)

REM Check for Visual Studio Build Tools
echo 🔍 Checking for Visual Studio Build Tools...

REM First check if MSVC is already available
where cl >nul 2>&1
if not errorlevel 1 (
    echo ✅ Visual Studio Build Tools already configured
    goto VS_CONFIGURED
)

REM Check if we can use Rust's MSVC detection
rustc --print cfg 2>nul | findstr "target_env=\"msvc\"" >nul 2>&1
if not errorlevel 1 (
    echo ✅ MSVC detected via Rust toolchain
    goto VS_CONFIGURED
)

echo 📝 Searching for Visual Studio installation...

REM Check various VS installation paths
set VS_FOUND=0

REM VS 2022 paths
if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat" (
    call "%ProgramFiles%\Microsoft Visual Studio\2022\Enterprise\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
    set VS_FOUND=1
) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" (
    call "%ProgramFiles%\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
    set VS_FOUND=1
) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" (
    call "%ProgramFiles%\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
    set VS_FOUND=1
) else if exist "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
    call "%ProgramFiles%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
    set VS_FOUND=1
)

REM VS 2019 paths if 2022 not found
if !VS_FOUND!==0 (
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Enterprise\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Enterprise\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
        set VS_FOUND=1
    ) else if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Professional\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
        set VS_FOUND=1
    ) else if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\Community\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
        set VS_FOUND=1
    ) else if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" (
        call "%ProgramFiles(x86)%\Microsoft Visual Studio\2019\BuildTools\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
        set VS_FOUND=1
    )
)

REM Check using vswhere tool if available
if !VS_FOUND!==0 (
    if exist "%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" (
        for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath`) do (
            if exist "%%i\VC\Auxiliary\Build\vcvars64.bat" (
                call "%%i\VC\Auxiliary\Build\vcvars64.bat" >nul 2>&1
                set VS_FOUND=1
            )
        )
    )
)

if !VS_FOUND!==0 (
    echo ⚠️  Visual Studio Build Tools not automatically detected
    echo.
    echo 📝 Rust may still work if MSVC is installed. Attempting to continue...
    echo    If build fails, please install Visual Studio Build Tools from:
    echo    https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
    echo.
) else (
    echo ✅ Visual Studio Build Tools configured
)

:VS_CONFIGURED

echo ✅ All dependencies are ready
echo.

REM Check if src-tauri directory exists
if not exist "src-tauri" (
    echo ❌ src-tauri directory not found!
    echo    Please ensure you are in the correct project directory
    pause
    exit /b 1
)

REM Install npm dependencies
echo 📦 Installing npm dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo ⚠️  Retrying npm install with --force...
    call npm install --no-audit --no-fund --force
    if errorlevel 1 (
        echo ❌ Failed to install npm dependencies
        pause
        exit /b 1
    )
)
echo:

REM Check if Tauri CLI is installed
echo 📦 Checking Tauri CLI...
call npm list @tauri-apps/cli >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing Tauri CLI...
    call npm install --save-dev @tauri-apps/cli@latest --no-audit --no-fund
    if errorlevel 1 (
        echo ⚠️  Retrying Tauri CLI installation with --force...
        call npm install --save-dev @tauri-apps/cli@latest --no-audit --no-fund --force
        if errorlevel 1 (
            echo ❌ Failed to install Tauri CLI
            pause
            exit /b 1
        )
    )
)
echo:

REM Build frontend
echo 🏗️  Building frontend...
echo    Running: npm run build
call npm run build
if errorlevel 1 (
    echo ❌ Failed to build frontend
    echo    Please check for TypeScript or build errors above
    pause
    exit /b 1
)
echo ✅ Frontend build successful
echo.

REM Ensure Rust toolchain is ready
echo 🔧 Preparing Rust toolchain...
rustup default stable
if errorlevel 1 (
    echo ❌ Failed to set Rust toolchain
    pause
    exit /b 1
)
rustup update
echo ✅ Rust toolchain ready
echo.

REM Build Tauri app
echo 🔨 Building Tauri application for Windows...
echo    This may take several minutes on first build...
echo.
echo    Running: npm run tauri build
call npm run tauri build
if errorlevel 1 (
    echo.
    echo ❌ Failed to build Tauri application
    echo.
    echo 📝 Common issues:
    echo    • Make sure Visual Studio Build Tools are installed
    echo    • Check for Rust compilation errors above
    echo    • Ensure all dependencies are correctly installed
    echo.
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