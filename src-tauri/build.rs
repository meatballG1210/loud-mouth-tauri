use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    // Tell Tauri to rerun build script if it changes
    tauri_build::build();
    
    // Setup Vosk library paths
    setup_vosk_libraries();
}

fn setup_vosk_libraries() {
    let target_os = env::var("CARGO_CFG_TARGET_OS").unwrap();
    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    
    // Create libs directory if it doesn't exist
    let libs_dir = manifest_dir.join("libs");
    fs::create_dir_all(&libs_dir).unwrap();
    
    // Platform-specific library setup
    match target_os.as_str() {
        "macos" => {
            // Add library search path for macOS
            println!("cargo:rustc-link-search=native={}", libs_dir.display());
            
            // If Vosk libraries are in the libs directory
            if libs_dir.join("libvosk.dylib").exists() {
                println!("cargo:rustc-link-lib=dylib=vosk");
            } else {
                // Try system paths
                println!("cargo:rustc-link-search=native=/usr/local/lib");
                println!("cargo:rustc-link-search=native=/opt/homebrew/lib");
            }
        }
        "windows" => {
            println!("cargo:rustc-link-search=native={}", libs_dir.display());
            if libs_dir.join("vosk.dll").exists() {
                println!("cargo:rustc-link-lib=dylib=vosk");
            }
        }
        "linux" => {
            println!("cargo:rustc-link-search=native={}", libs_dir.display());
            println!("cargo:rustc-link-search=native=/usr/local/lib");
            println!("cargo:rustc-link-search=native=/usr/lib");
            if libs_dir.join("libvosk.so").exists() {
                println!("cargo:rustc-link-lib=dylib=vosk");
            }
        }
        _ => {}
    }
    
    // Download Vosk libraries if not present
    download_vosk_libraries_if_needed(&libs_dir, &target_os);
}

fn download_vosk_libraries_if_needed(libs_dir: &PathBuf, target_os: &str) {
    let lib_file = match target_os {
        "macos" => "libvosk.dylib",
        "windows" => "vosk.dll",
        "linux" => "libvosk.so",
        _ => return,
    };
    
    if !libs_dir.join(lib_file).exists() {
        println!("cargo:warning=Vosk libraries not found in {}. Please download them from https://github.com/alphacep/vosk-api/releases", libs_dir.display());
        println!("cargo:warning=For macOS, download vosk-osx-*.zip and extract libvosk.dylib to {}", libs_dir.display());
    }
}
