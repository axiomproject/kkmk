# Fixing "Must be able to SET ROLE" Errors in PostgreSQL Migration

## Understanding the Error

The error "must be able to SET ROLE postgres" occurs when:
1. Your backup file contains `ALTER ROLE` or `SET ROLE` commands referencing the postgres role
2. The user restoring the backup (kkmk_db) doesn't have permissions to set itself as the postgres role
3. This happens because Render's hosted PostgreSQL doesn't give your database user superuser privileges

## Solution Approaches

### 1. Create Clean Backups

When creating your backup with pg_dump, use these flags:
```bash
pg_dump --no-owner --no-acl -h localhost -U postgres -d kkmk -F p -f kkmk_backup.sql
```

The flags:
- `--no-owner`: Skips commands to set ownership of objects
- `--no-acl`: Skips dumping access privileges (GRANT/REVOKE)

### 2. Manually Edit the Backup File

If you've already created a backup without these flags:

1. Open the backup file in a text editor
2. Remove any lines containing:
   - `SET ROLE postgres`
   - `ALTER ROLE postgres`
   - `OWNER TO postgres`
3. Save the file and then use it for restore

### 3. Fix Sequences After Restore

After restoring your database, you may need to fix sequences:

```sql
DO $$
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
    END LOOP;
END$$;
```

## Prevention Tips

1. Always use `--no-owner` and `--no-acl` when creating backups for migration
2. If possible, create an identical role structure in the target database first
3. For automated migrations, consider using tools like pgdump's `-C` option to include database creation commands
