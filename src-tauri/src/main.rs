// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::Path;

// Test command to verify Tauri commands work
#[tauri::command]
fn test_command() -> String {
    "Tauri command works!".to_string()
}

// Simple save file command with fixed path for now
#[tauri::command]
fn save_file_simple(filename: String, content: Vec<u8>) -> Result<String, String> {
    println!("save_file_simple called with filename: {}", filename);
    
    // Try multiple locations
    let possible_paths = vec![
        std::env::current_dir()
            .map(|d| d.join(&filename))
            .map_err(|e| e.to_string())?,
        // Desktop
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map(|home| Path::new(&home).join("Desktop").join(&filename))
            .map_err(|_| "No home directory found".to_string())?,
        // Downloads
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .map(|home| Path::new(&home).join("Downloads").join(&filename))
            .map_err(|_| "No home directory found".to_string())?,
    ];
    
    for save_path in possible_paths {
        println!("Trying to save to: {}", save_path.display());
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = save_path.parent() {
            if !parent.exists() {
                if let Err(e) = fs::create_dir_all(parent) {
                    println!("Failed to create directory {}: {}", parent.display(), e);
                    continue;
                }
            }
        }
        
        match fs::write(&save_path, &content) {
            Ok(_) => {
                println!("Successfully saved to: {}", save_path.display());
                return Ok(save_path.to_string_lossy().to_string());
            }
            Err(e) => {
                println!("Failed to write to {}: {}", save_path.display(), e);
                continue;
            }
        }
    }
    
    Err("Failed to save file to any location".to_string())
}

// Save text file command
#[tauri::command]
fn save_text_file_simple(filename: String, content: String) -> Result<String, String> {
    let content_bytes = content.into_bytes();
    save_file_simple(filename, content_bytes)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![test_command, save_file_simple, save_text_file_simple])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}