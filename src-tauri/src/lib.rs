pub mod database;
pub mod schema;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_user_count() -> Result<i64, String> {
    database::get_user_count().map_err(|e| e.to_string())
}

#[tauri::command]
fn add_test_user(email: String) -> Result<(), String> {
    database::add_user(&email).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, get_user_count, add_test_user])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
