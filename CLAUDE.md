# acta — 子工程本地记忆（Workspace 总控台托管）

> 你是被总控台派发到本目录的子 agent。工作范围**严格限定在 `2-开发/acta/` 内**。本文件是本工程的本地记忆：遇到非显而易见的项目事实（决策、约定、坑）就更新这里，**不要写回全局 MEMORY.md**。完事向总控台汇报结论即可。

## 身份
学术工作流桌面 App。追踪期刊/会议截止、审稿进度、论文进度。本地优先 + 云同步预留。

## 技术栈
Tauri + React + SQLite，跨平台桌面。public 仓库 `qiaoxu123/acta`。

## 当前状态
- 详见仓库内 README / CHANGELOG。后续项目事实补在此处。

## 关键约定 / 坑
- **目录移动后必须 `cargo clean`**：本工程从 `Workspace/acta` 移到 `Workspace/2-开发/acta` 后，`src-tauri/target/` 里缓存了旧绝对路径，tauri build 会报 `failed to read plugin permissions ... /Workspace/acta/...`。解决：`cd src-tauri && cargo clean` 再重建（全量编译约 1.5 min）。
- 构建/装包：`source ~/.cargo/env`、`NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem`、cargo 拉 crate 挂代理 7897；`npm run tauri build -- --bundles app` → `cp -R src-tauri/target/release/bundle/macos/Acta.app /Applications/`。
- npm 装包：`NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` + `--registry=https://registry.npmmirror.com`。
- **迁移纪律（重要坑）**：schema 变更必须走 `src-tauri/migrations/` + lib.rs 注册，**严禁脚本里直接 `ALTER TABLE`**。曾经在脚本里手动加了 owner_id(应是 v15)与 groups 表(v16) 却没写进 `_sqlx_migrations`，导致 app 启动时 sqlx 重跑 v15 报 *duplicate column* 卡死，后续迁移(v17)全部不执行。修复办法：往 `_sqlx_migrations` 补登记 (version, description, installed_on, success=1, checksum, execution_time)，**checksum = 迁移文件 SQL 的 SHA-384 原始字节**(已用 v14 验证算法正确)。如果不得已手动改 schema，务必同步补登记对应迁移的正确 checksum，否则 app 端校验失败。

## 模块/迁移进度（截至 2026-06-25）
- 迁移已到 **v18**：v12 funding、v13 students、v14 users、v15 owner_id(数据隔离)、v16 groups、v17 students.category/grade/school、v18 student_files(附件)。**新迁移要重新 build+启动 app 才会执行**（迁移编进 Rust 二进制）。
- **学生管理已按真实角色重构**(0.15.0)：主分组维度 = `category`(准研一/在读硕士/在读博士/科研助理/保研推免/博士申请/已毕业)，`status` 改为进展(待回复/已同意/在组/已放弃/已毕业/已离组)；新增 grade(年级)、school(院校) 列；聚合条 chip 可点击筛选。当前 14 名学生数据已录入（脚本 `scripts/update_students_2026.mjs`）。
- **行内编辑 + 附件**(0.15.0)：列表/详情点状态(角色)徽章直接弹层改值（`InlinePicker`/`InlineText` 通用组件，portal 渲染不被单元格裁剪）；详情字段全部 click-to-edit。每个学生可上传简历/成绩单/邮件附件 → 物理文件复制进 AppData `attachments/students/<id>/`，元数据存 `student_files` 表(**不进 sync 快照**，文件不随快照走)，可用默认程序打开/在访达显示。用到 `@tauri-apps/plugin-opener`(JS)，capabilities 放开了 `$HOME`/`$APPDATA` 的 fs scope 和 `opener:allow-open-path`。
- **附件云同步**(0.15.0)：`student_files` **已加入 ALL_TABLES**（元数据进 JSON 快照），文件**字节**走单独的 blob 通道，不进快照（避免膨胀）。同步引擎 `runSync(snapshotTx, fileTx?)` 在快照合并后做"对账"：本地有/远端无 → 上传，远端有/本地无 → 下载；以合并后的 student_files 元数据为准，按 `rel_path` 为 key。容错：服务端没 blob 接口时安静跳过，不影响快照同步。状态栏显示 `📎↓n ↑n`。
- **附件存储后端可独立选择**(`acta.filebackend`: auto/webdav/pg，Settings→同步)：与快照后端解耦。`SyncTransport` 加了可选 `listFiles/getFile/putFile`。
  - **PG blob**：服务端 `server/pg-api/index.js` 新增 `sync_files(key,content BYTEA,...)` 表 + `GET /files`、`GET/PUT /file?key=`（二进制安全，启动自动建表）。**改服务端要重新部署**（1panel Node 应用）。
  - **WebDAV blob**（暂时方案，无需 PG 重部署）：文件存 `<davUrl>/files/` 扁平目录，文件名 = **base64url(rel_path)**（避开 WebDAV 百分号编码歧义；decode 要补 `=` padding 否则 atob 报错）。`listFiles` 用 PROPFIND Depth:1 + DOMParser 解析；**坚果云返回集合自身的 href 不带尾斜杠**(`.../files`)，靠 `seg===FILES_DIR` 跳过。已用坚果云端到端验证(MKCOL/PUT/PROPFIND 207/GET/DELETE 均通)。坚果云顶层 dav 文件夹 DELETE 返回 403（删不掉，需网页端删）。
  - student_files 现在在 ALL_TABLES 里，`insert()` 会自动盖 owner_id，repository 里仍显式传 `owner_id:'xqiao'`（pre-login 也能用，无害）。
- 功能模块：venues/reviews/papers/patents/projects/ideas/sparks/**notes**/**reports**；仪表盘=按模块总览卡(可置顶/调大小/拖拽)；首启身份选择 + 模块开关(`acta.modules`)。
- **笔记已重做成 Obsidian/wolai 式工作区**（2026-06-24）：左探索栏(文件夹树 path 字符串 + 标签筛选 + 笔记列表) + 右 **Milkdown Crepe** 真 WYSIWYG 编辑器(Typora 式所见即所得，存标准 markdown)。`MilkdownEditor` 组件 + `milkdown.css`(把 `--crepe-color-*` 映射到 app 主题变量，跟随明暗)，**lazy import** 避免 ~1.5MB 进主包(主包 513KB)。自动保存(防抖 600ms)。路由改 `/notes` + `/notes/:id`(items:false)，已删旧 NoteForm/NoteItemPage。
- 自动化接口层 actions 也覆盖全模块(含 list_notes/upsert_note、list_reports/upsert_report)。
