use tauri_plugin_sql::{Migration, MigrationKind};

/// Database migrations are registered Rust-side so the SQLite schema is created
/// and versioned by the `tauri-plugin-sql` runtime before the webview loads.
/// The canonical SQL lives in `migrations/` and is embedded at compile time.
fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "initial schema: venues, editions, reviews, papers, tasks",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "archiving: archived_at on venues, manuscripts, papers",
            sql: include_str!("../migrations/0002_archive.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "paper authorship role, patents, projects",
            sql: include_str!("../migrations/0003_patents_projects.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "review system url on reviewed_manuscripts",
            sql: include_str!("../migrations/0004_review_url.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "review object type on reviewed_manuscripts",
            sql: include_str!("../migrations/0005_review_type.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "research idea tracker: ideas + idea_logs",
            sql: include_str!("../migrations/0006_ideas.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "sparks: brainstorm / problem inbox",
            sql: include_str!("../migrations/0007_sparks.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "review invitation action links (agree/decline/unavailable)",
            sql: include_str!("../migrations/0008_review_invite_links.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 9,
            description: "notes: tagged markdown knowledge / reflections",
            sql: include_str!("../migrations/0009_notes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 10,
            description: "reports: periodic work-progress write-ups",
            sql: include_str!("../migrations/0010_reports.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 11,
            description: "notes: folder path for Obsidian-style organization",
            sql: include_str!("../migrations/0011_notes_folder.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 12,
            description: "funding: grant/contract budget tracking",
            sql: include_str!("../migrations/0012_funding.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 13,
            description: "students: advisee tracking & exam dates",
            sql: include_str!("../migrations/0013_students.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 14,
            description: "users: local account system with bcrypt passwords",
            sql: include_str!("../migrations/0014_users.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 15,
            description: "data isolation: owner_id on every main table",
            sql: include_str!("../migrations/0015_owner_id.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 16,
            description: "groups and shared_items for cross-user collaboration",
            sql: include_str!("../migrations/0016_groups.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:acta.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running Acta");
}
