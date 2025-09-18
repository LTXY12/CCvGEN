#!/bin/bash

# RISU AI Character Generator - Stop Script
# This script stops the proxy server and development server

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🛑 Stopping RISU AI Character Generator...${NC}"
echo "=============================================="

# Configuration
DEV_PORT=3050
PROJECT_DIR="/Users/isumin/LLM/claude_code/CCvGEN"

# Change to project directory
cd "$PROJECT_DIR"

# Function to kill process by PID
kill_pid() {
    local pid=$1
    local name=$2
    
    if [ ! -z "$pid" ] && kill -0 $pid 2>/dev/null; then
        echo -e "${YELLOW}🔄 Stopping $name (PID: $pid)...${NC}"
        kill $pid 2>/dev/null || true
        
        # Wait for process to stop
        for i in {1..10}; do
            if ! kill -0 $pid 2>/dev/null; then
                echo -e "${GREEN}✅ $name stopped successfully${NC}"
                return 0
            fi
            sleep 1
        done
        
        # Force kill if still running
        echo -e "${YELLOW}🔨 Force stopping $name...${NC}"
        kill -9 $pid 2>/dev/null || true
        echo -e "${GREEN}✅ $name force stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  $name was not running${NC}"
    fi
}

# Function to kill processes by port
kill_port() {
    local port=$1
    local name=$2
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}🔄 Stopping processes on port $port for $name...${NC}"
        for pid in $pids; do
            kill $pid 2>/dev/null || true
        done
        
        # Wait a moment
        sleep 2
        
        # Check if any processes are still running
        local remaining_pids=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$remaining_pids" ]; then
            echo -e "${YELLOW}🔨 Force stopping remaining processes on port $port...${NC}"
            for pid in $remaining_pids; do
                kill -9 $pid 2>/dev/null || true
            done
        fi
        
        echo -e "${GREEN}✅ All processes on port $port stopped${NC}"
    else
        echo -e "${YELLOW}⚠️  No processes running on port $port${NC}"
    fi
}

# Stop service using saved PID
if [ -f ".dev.pid" ]; then
    DEV_PID=$(cat .dev.pid)
    kill_pid "$DEV_PID" "Development Server"
    rm -f .dev.pid
fi

# Also kill any remaining processes on the port
kill_port $DEV_PORT "Development Server"

# Kill any remaining npm/node dev processes
REMAINING_DEV=$(pgrep -f "npm.*dev\|vite" 2>/dev/null)
if [ ! -z "$REMAINING_DEV" ]; then
    echo -e "${YELLOW}🔄 Stopping remaining development server processes...${NC}"
    pkill -f "npm.*dev\|vite" 2>/dev/null || true
    echo -e "${GREEN}✅ Remaining development processes stopped${NC}"
fi

# Clean up log files (optional)
if [ -f "dev.log" ]; then
    echo -e "${BLUE}📄 Development log file: ./dev.log${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Development server stopped successfully!${NC}"
echo "=============================================="
echo -e "${BLUE}📊 Port Status:${NC}"

# Check final port status
if lsof -Pi :$DEV_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "  Port $DEV_PORT: ${RED}Still in use${NC}"
else
    echo -e "  Port $DEV_PORT: ${GREEN}Free${NC}"
fi

echo ""
echo -e "${GREEN}✅ Ready to restart with ./start.sh${NC}"