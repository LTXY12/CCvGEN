#!/bin/bash

# RISU AI Character Generator - Auto Start Script
# This script automatically starts the proxy server and development server

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEV_PORT=5173
PROJECT_DIR="/Users/isumin/LLM/claude_code/CCvGEN"

echo -e "${BLUE}🚀 Starting RISU AI Character Generator...${NC}"
echo "=============================================="

# Change to project directory
cd "$PROJECT_DIR"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}🔄 Killing existing processes on port $port...${NC}"
        kill $pids 2>/dev/null || true
        sleep 2
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=60
    local attempt=1
    
    echo -e "${YELLOW}⏳ Waiting for $name to start...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        # More robust check - look for any response
        if curl -s --max-time 2 "$url" >/dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✅ $name is ready!${NC}"
            return 0
        fi
        
        # Also check if the process is listening on the port
        if lsof -Pi :$DEV_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
            echo ""
            echo -e "${GREEN}✅ $name is listening on port $DEV_PORT!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 1
        attempt=$((attempt + 1))
    done
    
    echo ""
    echo -e "${RED}❌ $name failed to start within 60 seconds${NC}"
    return 1
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi


# Kill existing processes on dev port
kill_port $DEV_PORT

echo ""
echo -e "${BLUE}🎯 Starting Development Server...${NC}"
echo "Port: $DEV_PORT"
echo "URL: http://localhost:$DEV_PORT"

# Start development server in background
npm run dev > dev.log 2>&1 &
DEV_PID=$!

# Wait for development server to be ready
if wait_for_service "http://localhost:$DEV_PORT" "Development Server"; then
    echo -e "${GREEN}✅ Development Server started successfully (PID: $DEV_PID)${NC}"
else
    echo -e "${RED}❌ Failed to start Development Server${NC}"
    kill $DEV_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Development server started successfully!${NC}"
echo "=============================================="
echo -e "${BLUE}📋 Service Information:${NC}"
echo "  🌐 Application:       http://localhost:$DEV_PORT"
echo ""
echo -e "${BLUE}📝 Process ID:${NC}"
echo "  Development PID:      $DEV_PID"
echo ""
echo -e "${BLUE}📄 Log File:${NC}"
echo "  Development logs:     ./dev.log"
echo ""
echo -e "${YELLOW}💡 Supported AI APIs:${NC}"
echo "  • Google Gemini"
echo "  • Anthropic Claude"  
echo "  • OpenAI ChatGPT"
echo "  • Custom OpenAI Compatible APIs"
echo "  • Ollama (Local)"
echo "  • LM Studio (Local)"
echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo "  • Application:         http://localhost:$DEV_PORT"
echo "  • API Setup:           http://localhost:$DEV_PORT (Go to API Setup)"
echo "  • Five Stage Workflow: http://localhost:$DEV_PORT (Go to Workflow)"
echo ""
echo -e "${GREEN}🚀 Ready to use! Open http://localhost:$DEV_PORT in your browser${NC}"
echo ""
echo -e "${YELLOW}💻 To stop server:${NC}"
echo "  kill $DEV_PID"
echo "  or use: ./stop.sh"
echo ""

# Save PID for stop script
echo "$DEV_PID" > .dev.pid

# Keep script running
echo -e "${BLUE}⏳ Development server is running. Press Ctrl+C to stop...${NC}"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping development server...${NC}"
    kill $DEV_PID 2>/dev/null || true
    rm -f .dev.pid
    echo -e "${GREEN}✅ Development server stopped.${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Wait indefinitely
while true; do
    sleep 1
done