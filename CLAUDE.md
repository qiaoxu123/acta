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

## 模块/迁移进度（截至 2026-06-24）
- 迁移已到 **v11**：v9 notes、v10 reports、v11 notes.folder。**新表要启动一次 app 才会建好**。
- 功能模块：venues/reviews/papers/patents/projects/ideas/sparks/**notes**/**reports**；仪表盘=按模块总览卡(可置顶/调大小/拖拽)；首启身份选择 + 模块开关(`acta.modules`)。
- **笔记已重做成 Obsidian/wolai 式工作区**（2026-06-24）：左探索栏(文件夹树 path 字符串 + 标签筛选 + 笔记列表) + 右 **Milkdown Crepe** 真 WYSIWYG 编辑器(Typora 式所见即所得，存标准 markdown)。`MilkdownEditor` 组件 + `milkdown.css`(把 `--crepe-color-*` 映射到 app 主题变量，跟随明暗)，**lazy import** 避免 ~1.5MB 进主包(主包 513KB)。自动保存(防抖 600ms)。路由改 `/notes` + `/notes/:id`(items:false)，已删旧 NoteForm/NoteItemPage。
- 自动化接口层 actions 也覆盖全模块(含 list_notes/upsert_note、list_reports/upsert_report)。
