#!/usr/bin/env bash
# Daily backup of the database and uploaded files. Run from anywhere:  ./deploy/backup.sh
# Cron (every night 2am):  0 2 * * * /opt/academic-club/deploy/backup.sh >> /opt/academic-club/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
STAMP=$(date +%F-%H%M); mkdir -p backups
docker compose exec -T mongo sh -c 'mongodump --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db academic_club' > "backups/db-$STAMP.archive.gz"
docker run --rm -v academic-club_storage:/data -v "$PWD/backups":/backup alpine tar czf "/backup/storage-$STAMP.tar.gz" -C /data .
find backups -type f -mtime +14 -delete
echo "Backup $STAMP done. Copy the backups folder off the server too (another machine or cloud storage)."
