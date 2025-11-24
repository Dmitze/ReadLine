#!/bin/bash

# Warrior's Library Database Backup Script
# Automatic daily backup of SQLite database

set -e

echo "📦 Warrior's Library Database Backup"
echo "==========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Configuration
DB_PATH="${DB_PATH:-./database/library.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="library_${TIMESTAMP}.db"
KEEP_DAYS="${KEEP_DAYS:-30}"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    print_error "Database not found: $DB_PATH"
    exit 1
fi

print_info "Database: $DB_PATH"
print_info "Backup directory: $BACKUP_DIR"
print_info "Keep backups for: $KEEP_DAYS days"
echo ""

# Get database size
DB_SIZE=$(du -h "$DB_PATH" | cut -f1)
print_info "Database size: $DB_SIZE"

# Create backup using SQLite .backup command (safer than cp)
print_info "Creating backup..."
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_NAME'"

if [ $? -eq 0 ]; then
    print_success "Backup created: $BACKUP_DIR/$BACKUP_NAME"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    print_info "Backup size: $BACKUP_SIZE"
else
    print_error "Backup failed!"
    exit 1
fi

# Compress backup (optional)
if command -v gzip &> /dev/null; then
    print_info "Compressing backup..."
    gzip "$BACKUP_DIR/$BACKUP_NAME"
    
    if [ $? -eq 0 ]; then
        print_success "Backup compressed: $BACKUP_DIR/$BACKUP_NAME.gz"
        COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.gz" | cut -f1)
        print_info "Compressed size: $COMPRESSED_SIZE"
    else
        print_warning "Compression failed, keeping uncompressed backup"
    fi
fi

# Clean old backups
print_info "Cleaning old backups (older than $KEEP_DAYS days)..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "library_*.db*" -type f -mtime +$KEEP_DAYS -delete -print | wc -l)

if [ "$DELETED_COUNT" -gt 0 ]; then
    print_success "Deleted $DELETED_COUNT old backup(s)"
else
    print_info "No old backups to delete"
fi

# List current backups
echo ""
print_info "Current backups:"
ls -lh "$BACKUP_DIR"/library_*.db* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

# Count total backups
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/library_*.db* 2>/dev/null | wc -l)
print_info "Total backups: $TOTAL_BACKUPS"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
print_info "Total backup size: $TOTAL_SIZE"

echo ""
print_success "Backup completed successfully!"

# Optional: Upload to cloud storage
# Uncomment and configure for your cloud provider

# AWS S3
# if command -v aws &> /dev/null; then
#     print_info "Uploading to AWS S3..."
#     aws s3 cp "$BACKUP_DIR/$BACKUP_NAME.gz" s3://your-bucket/readline-backups/
#     print_success "Uploaded to S3"
# fi

# Google Cloud Storage
# if command -v gsutil &> /dev/null; then
#     print_info "Uploading to Google Cloud Storage..."
#     gsutil cp "$BACKUP_DIR/$BACKUP_NAME.gz" gs://your-bucket/readline-backups/
#     print_success "Uploaded to GCS"
# fi

# Dropbox
# if command -v dropbox &> /dev/null; then
#     print_info "Uploading to Dropbox..."
#     cp "$BACKUP_DIR/$BACKUP_NAME.gz" ~/Dropbox/readline-backups/
#     print_success "Uploaded to Dropbox"
# fi

exit 0
