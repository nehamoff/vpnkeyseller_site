#!/bin/bash
# Install Python dependencies for Remnawave integration

echo "Installing Python dependencies for Remnawave integration..."

# Check if Python is installed
if ! command -v python &> /dev/null && ! command -v python3 &> /dev/null; then
    echo "❌ Python is not installed. Please install Python 3.8 or higher."
    exit 1
fi

# Use python3 if available, otherwise python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
else
    PYTHON_CMD="python"
fi

echo "Using Python: $PYTHON_CMD"
$PYTHON_CMD --version

# Install required packages
echo ""
echo "Installing required packages..."
$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install requests python-dotenv

echo ""
echo "✓ Python dependencies installed successfully!"
echo ""
echo "To use the Remnawave Python integration:"
echo "  1. Make sure .env file has REMNAWAVE_* variables set"
echo "  2. Run: $PYTHON_CMD remnawave_integration.py <command> [args...]"
echo ""
echo "For more information, see REMNAWAVE_PYTHON_INTEGRATION.md"
