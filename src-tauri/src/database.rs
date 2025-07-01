use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::error::Error;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn establish_connection() -> Result<SqliteConnection, Box<dyn Error>> {
    let database_url = "database.sqlite";
    let mut connection = SqliteConnection::establish(database_url)?;
    
    connection.run_pending_migrations(MIGRATIONS)
        .map_err(|e| format!("Error running migrations: {}", e))?;
    
    Ok(connection)
}

pub fn get_user_count() -> Result<i64, Box<dyn Error>> {
    use crate::schema::users::dsl::*;
    
    let mut connection = establish_connection()?;
    let count = users.count().get_result(&mut connection)?;
    Ok(count)
}

pub fn add_user(email: &str) -> Result<(), Box<dyn Error>> {
    use crate::schema::users;
    
    let mut connection = establish_connection()?;
    diesel::insert_into(users::table)
        .values(users::email.eq(email))
        .execute(&mut connection)?;
    Ok(())
}