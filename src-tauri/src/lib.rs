use tauri_plugin_sql::{Migration, MigrationKind};

/// Database migrations are registered Rust-side so the SQLite schema is created
/// and versioned by the `tauri-plugin-sql` runtime before the webview loads.
/// The canonical SQL lives in `migrations/` and is embedded at compile time.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial schema: venues, editions, reviews, papers, tasks",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:acta.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Acta");
}
