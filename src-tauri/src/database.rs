use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use crate::error::{AppError, Result};

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn establish_connection() -> Result<SqliteConnection> {
    let database_url = if let Ok(app_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        // During development, use the manifest directory
        std::path::Path::new(&app_dir).join("database.sqlite")
    } else {
        // In production, use current directory
        std::env::current_dir()
            .unwrap_or_else(|_| std::path::PathBuf::from("."))
            .join("database.sqlite")
    };
    
    let database_url = database_url.to_string_lossy().to_string();
    let mut connection = SqliteConnection::establish(&database_url)
        .map_err(|e| AppError::new("CONNECTION_ERROR", "Failed to establish database connection")
            .with_details(e.to_string()))?;
    
    connection.run_pending_migrations(MIGRATIONS)
        .map_err(|e| AppError::new("MIGRATION_ERROR", "Failed to run database migrations")
            .with_details(e.to_string()))?;
    
    Ok(connection)
}

pub fn get_user_count() -> Result<i64> {
    use crate::schema::users::dsl::*;
    
    let mut connection = establish_connection()?;
    let count = users.count().get_result(&mut connection)?;
    Ok(count)
}

pub fn add_user(email: &str) -> Result<()> {
    use crate::schema::users;
    
    let mut connection = establish_connection()?;
    diesel::insert_into(users::table)
        .values(users::email.eq(email))
        .execute(&mut connection)?;
    Ok(())
}