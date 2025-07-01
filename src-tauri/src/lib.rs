pub mod database;
pub mod error;
pub mod schema;

#[cfg(test)]
mod error_tests;

use error::AppError;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_user_count() -> Result<i64, AppError> {
    database::get_user_count()
}

#[tauri::command]
fn add_test_user(email: String) -> Result<(), AppError> {
    database::add_user(&email)
}

#[tauri::command]
fn test_error_not_found() -> Result<String, AppError> {
    Err(app_error!("NOT_FOUND", "User not found"))
}

#[tauri::command]
fn test_error_with_details() -> Result<String, AppError> {
    Err(app_error!("VALIDATION_ERROR", "Invalid input provided", "Email must be a valid format"))
}

#[tauri::command]
fn test_database_error() -> Result<i64, AppError> {
    use crate::schema::users::dsl::*;
    use diesel::prelude::*;
    
    let mut conn = database::establish_connection()?;
    users.filter(id.eq(999999))
        .select((id, email))
        .first::<(i32, String)>(&mut conn)
        .map(|_| 0i64)
        .map_err(|e| e.into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_user_count, 
            add_test_user,
            test_error_not_found,
            test_error_with_details,
            test_database_error
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
