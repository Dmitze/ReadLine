#!/bin/bash

# ReadLine Initialization Script
# This script checks requirements, installs dependencies, and initializes the project

set -e  # Exit on error

echo "🚀 ReadLine Initialization Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Step 1: Check Node.js
echo "📦 Step 1: Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js is installed: $NODE_VERSION"
    
    # Check if version is >= 18
    NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js version must be >= 18.x. Current: $NODE_VERSION"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
echo ""

# Step 2: Check npm
echo "📦 Step 2: Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm is installed: v$NPM_VERSION"
else
    print_error "npm is not installed"
    exit 1
fi
echo ""

# Step 3: Check Redis
echo "🔴 Step 3: Checking Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        print_success "Redis is running"
    else
        print_warning "Redis is installed but not running"
        print_info "Starting Redis..."
        
        # Try to start Redis
        if command -v redis-server &> /dev/null; then
            redis-server --daemonize yes
            sleep 2
            if redis-cli ping &> /dev/null; then
                print_success "Redis started successfully"
            else
                print_error "Failed to start Redis"
                exit 1
            fi
        fi
    fi
else
    print_warning "Redis is not installed"
    print_info "Install Redis: https://redis.io/download"
    print_info "On Ubuntu/Debian: sudo apt-get install redis-server"
    print_info "On macOS: brew install redis"
    print_info "On Windows: Use Docker or WSL"
fi
echo ""

# Step 4: Check SQLite
echo "💾 Step 4: Checking SQLite..."
if command -v sqlite3 &> /dev/null; then
    SQLITE_VERSION=$(sqlite3 --version | awk '{print $1}')
    print_success "SQLite is installed: v$SQLITE_VERSION"
else
    print_warning "SQLite is not installed (not critical, using bundled version)"
fi
echo ""

# Step 5: Install dependencies
echo "📦 Step 5: Installing npm dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Dependencies installed successfully"
else
    print_error "package.json not found"
    exit 1
fi
echo ""

# Step 6: Setup .env file
echo "⚙️  Step 6: Setting up .env file..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from .env.example"
        print_warning "Please edit .env file with your configuration"
    else
        print_warning ".env.example not found, creating basic .env"
        cat > .env << EOF
# ReadLine Configuration
BOT_TOKEN=your_bot_token_here
ADMIN_ID=your_telegram_user_id
DB_PATH=./database/library.db

# Optional: AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=info
NODE_ENV=development
EOF
        print_success "Basic .env file created"
        print_warning "Please edit .env file with your configuration"
    fi
else
    print_info ".env file already exists"
fi
echo ""

# Step 7: Create directories
echo "📁 Step 7: Creating necessary directories..."
mkdir -p database
mkdir -p uploads
mkdir -p logs
mkdir -p coverage
mkdir -p dist
print_success "Directories created"
echo ""

# Step 8: Initialize database
echo "💾 Step 8: Initializing database..."
if [ -f "dist/index.js" ]; then
    print_info "Database will be initialized on first run"
else
    print_info "Building project first..."
    npm run build
    print_success "Project built successfully"
fi
echo ""

# Step 9: Initialize admin user (optional)
echo "👤 Step 9: Initialize admin user..."
if [ ! -z "$1" ] && [ "$1" == "--skip-admin" ]; then
    print_info "Skipping admin initialization (--skip-admin flag)"
else
    if [ -f ".env" ]; then
        print_info "To initialize admin user, run: npm run init-admin"
    else
        print_warning "Configure .env first, then run: npm run init-admin"
    fi
fi
echo ""

# Step 10: Run tests
echo "🧪 Step 10: Running tests..."
if [ ! -z "$1" ] && [ "$1" == "--skip-tests" ]; then
    print_info "Skipping tests (--skip-tests flag)"
else
    npm test
    print_success "All tests passed!"
fi
echo ""

# Summary
echo "=================================="
echo "✅ Initialization complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Run 'npm run init-admin' to create admin user"
echo "3. Run 'npm run dev' to start development server"
echo "4. Run 'npm start' to start production server"
echo ""
print_success "ReadLine is ready! 🚀"
