# Windows PowerShell script for database migration

# Local database credentials - MODIFY THESE!
$LOCAL_DB_USER = "postgres"
$LOCAL_DB_PASSWORD = "test"
$LOCAL_DB_NAME = "kkmk"

# Render database credentials (already set correctly)
$RENDER_DB_USER = "kkmk_db"
$RENDER_DB_PASSWORD = "c3dv1H1UcmugVinLWsxd1J4ozszIyK3C"
$RENDER_DB_HOST = "dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com"
$RENDER_DB_NAME = "kkmk"

# Backup file name
$BACKUP_FILE = "kkmk_backup.sql"

# Set working directory to PostgreSQL bin folder (assuming you're already there)
$PG_PATH = (Get-Location).Path

# Step 1: Create backup of local database with no ownership info
Write-Host "Creating backup of local database..." -ForegroundColor Green
$env:PGPASSWORD = $LOCAL_DB_PASSWORD
& ".\pg_dump" -h localhost -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -F p --no-owner --no-acl -f $BACKUP_FILE

# Step 2: Restore to Render database
Write-Host "Restoring to Render database..." -ForegroundColor Green
$env:PGPASSWORD = $RENDER_DB_PASSWORD

# First drop all existing tables
& ".\psql" -h $RENDER_DB_HOST -p 5432 -U $RENDER_DB_USER -d $RENDER_DB_NAME -c "DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;"

# Then restore from backup
& ".\psql" -h $RENDER_DB_HOST -p 5432 -U $RENDER_DB_USER -d $RENDER_DB_NAME -f $BACKUP_FILE

# Fix sequences after restore
Write-Host "Fixing sequences..." -ForegroundColor Green
& ".\psql" -h $RENDER_DB_HOST -p 5432 -U $RENDER_DB_USER -d $RENDER_DB_NAME -c "DO $$ DECLARE r RECORD; seqval bigint; seqname text; BEGIN FOR r IN (SELECT s.relname as sequence_name, t.relname as table_name, a.attname as column_name FROM pg_class s JOIN pg_depend d ON d.objid = s.oid JOIN pg_class t ON d.refobjid = t.oid JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum) WHERE s.relkind = 'S' AND d.deptype = 'a' AND s.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) LOOP EXECUTE format('SELECT COALESCE(MAX(%I), 0) + 1 FROM %I', r.column_name, r.table_name) INTO seqval; seqname := r.sequence_name; EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seqname, seqval); END LOOP; END $$;"

# Step 3: Verify migration
Write-Host "Verifying migration..." -ForegroundColor Green
& ".\psql" -h $RENDER_DB_HOST -p 5432 -U $RENDER_DB_USER -d $RENDER_DB_NAME -c "SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = information_schema.tables.table_name) AS column_count FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

Write-Host "Migration completed!" -ForegroundColor Green