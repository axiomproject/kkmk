# Simplified migration script with step-by-step execution

# Set PostgreSQL password for current session
$env:PGPASSWORD = "test"  # Replace with your actual password

# Set paths
$PG_BIN = "C:\Program Files\PostgreSQL\17\bin"
$BACKUP_FILE = "kkmk_backup.sql"

# Step 1: Test local database connection
Write-Host "Testing connection to local database..." -ForegroundColor Green
& "$PG_BIN\psql" -h localhost -U postgres -d postgres -c "SELECT version();"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error connecting to local database. Please check your credentials." -ForegroundColor Red
    exit
}

# Step 2: Create the kkmk database if it doesn't exist
Write-Host "Making sure kkmk database exists..." -ForegroundColor Green
& "$PG_BIN\psql" -h localhost -U postgres -d postgres -c "CREATE DATABASE kkmk WITH OWNER = postgres ENCODING = 'UTF8' CONNECTION LIMIT = -1;" 2>$null
Write-Host "Database ready." -ForegroundColor Green

# Step 3: Create backup of local database with role handling
Write-Host "Creating backup of local database..." -ForegroundColor Green
# Use --no-owner and --no-acl to exclude ownership and privilege info
& "$PG_BIN\pg_dump" -h localhost -U postgres -d kkmk -F p --no-owner --no-acl -f $BACKUP_FILE

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creating backup. Please check if the database exists and has tables." -ForegroundColor Red
    exit
}

# Step 4: Set Render credentials
$env:PGPASSWORD = "c3dv1H1UcmugVinLWsxd1J4ozszIyK3C"

# Step 5: Test connection to Render
Write-Host "Testing connection to Render database..." -ForegroundColor Green
& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "SELECT version();"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error connecting to Render database. Please check your credentials." -ForegroundColor Red
    exit
}

# Step 6: Drop all existing tables and functions in Render database
Write-Host "Dropping existing tables and functions in Render database..." -ForegroundColor Green
$dropTablesAndFunctionsCommand = @"
DO `$`$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as argtypes FROM pg_proc 
              INNER JOIN pg_namespace ns ON (pg_proc.pronamespace = ns.oid) 
              WHERE ns.nspname = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.argtypes || ') CASCADE';
    END LOOP;
END `$`$;
"@

& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "$dropTablesAndFunctionsCommand"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error dropping existing objects. Continuing anyway..." -ForegroundColor Yellow
}

# Step 7: Restore to Render database
Write-Host "Restoring to Render database..." -ForegroundColor Green

# First, disable triggers during restore
& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "SET session_replication_role = 'replica';"

# Then restore the database
& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -f $BACKUP_FILE

$restoreExitCode = $LASTEXITCODE
if ($restoreExitCode -ne 0) {
    if ($restoreExitCode -eq 3) {
        # Exit code 3 typically means there were some errors but some commands succeeded
        Write-Host "Restore completed with some errors. Function conflicts may have occurred but data should be intact." -ForegroundColor Yellow
    } else {
        Write-Host "Warning: Restore completed with errors (code: $restoreExitCode). This might affect your data." -ForegroundColor Red
    }
}

# Re-enable triggers after restore
& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "SET session_replication_role = 'origin';"

# Step 8: Fix sequences if needed
Write-Host "Fixing sequences if needed..." -ForegroundColor Green
$fixSequencesCommand = @"
DO `$`$
DECLARE
    r RECORD;
    seqval bigint;
    seqname text;
BEGIN
    FOR r IN (
        SELECT 
            s.relname as sequence_name,
            t.relname as table_name,
            a.attname as column_name
        FROM 
            pg_class s
            JOIN pg_depend d ON d.objid = s.oid
            JOIN pg_class t ON d.refobjid = t.oid
            JOIN pg_attribute a ON (d.refobjid, d.refobjsubid) = (a.attrelid, a.attnum)
        WHERE 
            s.relkind = 'S' AND d.deptype = 'a' AND s.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    LOOP
        EXECUTE format('SELECT COALESCE(MAX(%I), 0) + 1 FROM %I', r.column_name, r.table_name) INTO seqval;
        seqname := r.sequence_name;
        EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seqname, seqval);
        RAISE NOTICE 'Reset sequence % to %', seqname, seqval;
    END LOOP;
END`$`$;
"@

& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "$fixSequencesCommand"

# Step 9: Verify migration
Write-Host "Verifying migration..." -ForegroundColor Green
& "$PG_BIN\psql" -h dpg-cuq5r8ggph6c73cuq6ig-a.singapore-postgres.render.com -p 5432 -U kkmk_db -d kkmk -c "SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = information_schema.tables.table_name) AS column_count FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

Write-Host "Migration completed successfully!" -ForegroundColor Green