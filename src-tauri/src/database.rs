use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use diesel::r2d2::{self, ConnectionManager};
use std::sync::Mutex;
use crate::error::{AppError, Result};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub type Pool = r2d2::Pool<ConnectionManager<SqliteConnection>>;
pub type PooledConnection = r2d2::PooledConnection<ConnectionManager<SqliteConnection>>;

static POOL: Mutex<Option<Pool>> = Mutex::new(None);

fn get_database_url() -> String {
    let database_url = if let Ok(app_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        // During development, use the manifest directory
        std::path::Path::new(&app_dir).join("database.sqlite")
    } else {
        // In production, use current directory
        std::env::current_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."))
            .join("database.sqlite")
    };
    
    database_url.to_string_lossy().to_string()
}

pub fn init_pool() -> Result<()> {
    let database_url = get_database_url();
    let manager = ConnectionManager::<SqliteConnection>::new(&database_url);
    let pool = r2d2::Pool::builder()
        .max_size(5)
        .build(manager)
        .map_err(|e| AppError::new("POOL_ERROR", "Failed to create connection pool")
            .with_details(e.to_string()))?;
    
    // Run migrations on a connection from the pool
    {
        let mut conn = pool.get()
            .map_err(|e| AppError::new("CONNECTION_ERROR", "Failed to get connection from pool")
                .with_details(e.to_string()))?;
        
        // Set SQLite pragmas for better concurrency
        diesel::sql_query("PRAGMA journal_mode = WAL")
            .execute(&mut *conn)
            .map_err(|e| AppError::new("PRAGMA_ERROR", "Failed to set journal mode")
                .with_details(e.to_string()))?;
        
        diesel::sql_query("PRAGMA busy_timeout = 5000")
            .execute(&mut *conn)
            .map_err(|e| AppError::new("PRAGMA_ERROR", "Failed to set busy timeout")
                .with_details(e.to_string()))?;
        
        conn.run_pending_migrations(MIGRATIONS)
            .map_err(|e| AppError::new("MIGRATION_ERROR", "Failed to run database migrations")
                .with_details(e.to_string()))?;
    }
    
    let mut pool_guard = POOL.lock().unwrap();
    *pool_guard = Some(pool);
    
    Ok(())
}

pub fn get_connection() -> Result<PooledConnection> {
    let pool_guard = POOL.lock().unwrap();
    let pool = pool_guard.as_ref()
        .ok_or_else(|| AppError::new("POOL_NOT_INITIALIZED", "Connection pool not initialized"))?;
    
    pool.get()
        .map_err(|e| AppError::new("CONNECTION_ERROR", "Failed to get connection from pool")
            .with_details(e.to_string()))
}

// Compatibility function for existing code
pub fn establish_connection() -> Result<PooledConnection> {
    get_connection()
}

pub fn get_user_count() -> Result<i64> {
    use crate::schema::users::dsl::*;
    
    let mut connection = get_connection()?;
    let count = users.count().get_result(&mut *connection)?;
    Ok(count)
}

pub fn add_user(email: &str) -> Result<()> {
    use crate::schema::users;
    
    let mut connection = get_connection()?;
    diesel::insert_into(users::table)
        .values(users::email.eq(email))
        .execute(&mut *connection)?;
    Ok(())
}