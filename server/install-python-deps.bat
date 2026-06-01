@echo off
REM Install Python dependencies for Remnawave integration (Windows)

echo.
echo ============================================
echo Installing Python Dependencies
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

echo Python version:
python --version
echo.

REM Install/upgrade pip
echo Installing/upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo ERROR: Failed to upgrade pip
    pause
    exit /b 1
)

echo.
echo Installing required packages...

REM Install requests
python -m pip install requests
if errorlevel 1 (
    echo ERROR: Failed to install requests
    pause
    exit /b 1
)

REM Install python-dotenv
python -m pip install python-dotenv
if errorlevel 1 (
    echo ERROR: Failed to install python-dotenv
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS: Python dependencies installed!
echo ============================================
echo.
echo Next steps:
echo   1. Make sure .env file has REMNAWAVE_* variables set
echo   2. Run: npm start (to start the Node.js server)
echo   3. When you create a purchase, VPN key will be created automatically
echo.
echo For testing the Python integration:
echo   python remnawave_integration.py create test@example.com 123456789 30
echo.
echo For more information, see REMNAWAVE_PYTHON_INTEGRATION.md
echo.
pause
