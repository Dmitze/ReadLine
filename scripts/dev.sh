#!/bin/bash

# ReadLine Development Script
# Runs the bot in watch mode with auto-linting and testing

set -e

echo "🚀 ReadLine Development Mode"
echo "============================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found!"
    print_info "Run 'npm run init' or copy .env.example to .env"
    exit 1
fi

# Check if Redis is running
print_info "Checking Redis..."
if ! redis-cli ping &> /dev/null; then
    print_warning "Redis is not running. Starting Redis..."
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping &> /dev/null; then
        print_success "Redis started"
    else
        print_warning "Failed to start Redis. Continue anyway..."
    fi
else
    print_success "Redis is running"
fi

echo ""

# Run pre-checks
if [ "$1" != "--skip-checks" ]; then
    print_info "Running pre-flight checks..."
    
    # Lint
    print_info "Running ESLint..."
    npm run lint || {
        print_warning "Linting failed. Fix errors or run with --skip-checks"
        exit 1
    }
    print_success "Linting passed"
    
    # Type check
    print_info "Running TypeScript type check..."
    npm run typecheck || {
        print_warning "Type checking failed. Fix errors or run with --skip-checks"
        exit 1
    }
    print_success "Type check passed"
    
    # Quick tests
    print_info "Running quick tests..."
    npm test -- --bail --maxWorkers=4 || {
        print_warning "Tests failed. Fix errors or run with --skip-checks"
        exit 1
    }
    print_success "Tests passed"
    
    echo ""
fi

# Start development server
print_success "Starting development server with watch mode..."
print_info "Press Ctrl+C to stop"
echo ""

# Export environment
export NODE_ENV=development

# Start nodemon
npm run dev:watch
