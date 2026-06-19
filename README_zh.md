# MyPad++

[English](README.md) | 简体中文

MyPad++ 是一款现代、轻量且极速的网页版代码编辑器和记事本，专为**平板和移动端触控体验**设计，同时在桌面端也同样功能完备。它使用原生 JavaScript (Vanilla JS)、Vite 和 CodeMirror 6 构建，完全没有使用繁重的现代前端框架，以确保极低的延迟和最小的资源占用。

![MyPad++](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## 🌐 在线体验 (Live Demo)

你现在可以直接在浏览器中体验 MyPad++：
**👉 [https://mypad.almuszhang.workers.dev/](https://mypad.almuszhang.workers.dev/)**

*(注：在线静态版本完全支持本地文件编辑和 WebDAV 远程连接。但“服务器工作区”功能需要你在本地环境运行 Node.js 才能体验。)*

<p align="center">
  <img src="docs/screenshot.png" alt="MyPad++ Screenshot" width="800">
</p>

## ✨ 功能特性

- **PWA & 触控优化：** 专为 Android / iPad 平板设计，支持作为渐进式 Web 应用 (PWA) 安装（全屏沉浸模式）。提供“无键盘”切换模式，让你在舒服地滚动阅读代码时，不会被虚拟键盘打断。
- **高级代码编辑：** 由 CodeMirror 6 提供支持，拥有超过 15 种编程语言的语法高亮、行号显示、代码折叠、括号自动补全以及多光标选择功能。
- **双栏代码对比 (Diff)：** 内置文件差异对比工具，轻松查看代码变更，配备“上一处/下一处”快捷导航，支持两侧同步滚动。
- **自定义文本高亮：** 选中文本即可使用多种颜色（红、绿、蓝、黄等）即时高亮。非常适合代码审查或学习。
- **本地文件系统访问：** 使用现代的 Native File System Access API，直接且安全地打开、编辑、并保存文件到你的本地硬盘。
- **WebDAV & 远程工作区：** 支持直接连接到你的远程 WebDAV 服务器，或连接内置的 Node.js 工作区后端，直接编辑服务器上的代码。
- **响应式全局搜索：** 优雅的底部/侧边浮动搜索面板，支持正则表达式、历史记录“全部查找”，以及动态匹配字体缩放。
- **多标签页管理：** 自动保存会话状态。即使你不小心关掉了浏览器，也不会丢失标签页和未保存的修改。

## 📖 使用说明与图标

### 工具栏功能

| 图标 | 名称 | 说明 |
| :---: | :--- | :--- |
| <img src="docs/icons/newFile.svg" width="18" height="18" alt="New File"> | **新建** | 创建一个空白文档。 |
| <img src="docs/icons/open.svg" width="18" height="18" alt="Open"> | **打开** | 从本地硬盘打开文件。 |
| <img src="docs/icons/save.svg" width="18" height="18" alt="Save"> | **保存** | 保存当前文件 (Ctrl+S)。 |
| <img src="docs/icons/saveAs.svg" width="18" height="18" alt="Save As"> | **另存为** | 将当前文件另存为新文件。 |
| <img src="docs/icons/undo.svg" width="18" height="18" alt="Undo"> | **撤销** | 撤销上一步操作。 |
| <img src="docs/icons/redo.svg" width="18" height="18" alt="Redo"> | **重做** | 恢复上一步撤销的操作。 |
| <img src="docs/icons/wordWrap.svg" width="18" height="18" alt="Word Wrap"> | **自动换行** | 切换长文本自动换行模式。 |
| <img src="docs/icons/statusBar.svg" width="18" height="18" alt="Status Bar"> | **底部状态栏** | 显示或隐藏底部的编码和光标信息状态栏。 |
| <img src="docs/icons/keyboardOff.svg" width="18" height="18" alt="Virtual Keyboard"> | **虚拟键盘** | 禁止软键盘自动弹出（非常适合在 Pad 上外接键盘时使用）。 |
| <img src="docs/icons/fullscreen.svg" width="18" height="18" alt="Fullscreen"> | **全屏** | 沉浸式全屏模式，隐藏系统状态栏。 |
| <img src="docs/icons/zoomIn.svg" width="18" height="18" alt="Zoom In"> / <img src="docs/icons/zoomOut.svg" width="18" height="18" alt="Zoom Out"> | **放大/缩小** | 放大或缩小编辑器字体大小。 |
| <img src="docs/icons/themeLight.svg" width="18" height="18" alt="Theme Light"> / <img src="docs/icons/themeDark.svg" width="18" height="18" alt="Theme Dark"> | **主题切换** | 在深色与浅色主题间切换。 |

### 高级功能

| 图标 | 名称 | 说明 |
| :---: | :--- | :--- |
| <img src="docs/icons/explorer.svg" width="18" height="18" alt="File Explorer"> | **树状目录** | 左侧滑出的文件浏览器，可查看当前工作区的所有文件。右键点击目录可将其**“钉在顶部”**。 |
| <img src="docs/icons/find.svg" width="18" height="18" alt="Find"> | **查找** | 强大的本地搜索（快捷键 Ctrl+F），支持正则表达式。默认以侧边栏展示概览。 |
| <img src="docs/icons/replace.svg" width="18" height="18" alt="Replace"> | **替换** | 在当前文件内进行文本替换。 |
| <img src="docs/icons/nextError.svg" width="18" height="18" alt="Next Error"> | **查找错误** | 跳转到代码中的语法错误或警告位置。 |
| <img src="docs/icons/compare.svg" width="18" height="18" alt="Compare Mode"> | **对比模式** | 双排对比模式，智能对齐不同版本文件的差异。 |
| <img src="docs/icons/webdav.svg" width="18" height="18" alt="WebDAV"> | **WebDAV** | 连接到远程 WebDAV 服务器读写文件。 |
| <img src="docs/icons/workspace.svg" width="18" height="18" alt="Server Workspace"> | **服务器工作区** | 将内置 Node 服务端的远程目录作为本地工作区使用。 |
| <img src="docs/icons/highlights.svg" width="18" height="18" alt="Highlights"> | **高亮设置** | 管理自定义文本高亮。选中文本后使用右键菜单可快速为其上色。 |

## 🚀 快速开始

按照以下步骤在你的本地环境运行本项目，用于开发和测试。

### 环境依赖

你需要在系统上安装 **Node.js**（推荐 v16+ 版本）和 **npm**。
可前往 [nodejs.org](https://nodejs.org/) 下载。

### 本地安装与运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/almus2zhang/mypad-.git
   cd mypad-
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   终端会输出一个本地运行地址（例如 `http://localhost:5173`）。在浏览器中打开该地址即可开始使用 MyPad++。

### 生产环境构建

如果你需要构建用于生产环境的静态资产（HTML/CSS/JS）：

```bash
npm run build
```

这会在根目录生成一个 `dist/` 文件夹，里面包含了编译、压缩及优化后的静态文件。

### 本地预览生产构建

你可以在本地预览刚刚构建出的生产版本：

```bash
npm run preview
```

### 作为后台服务运行并开机自启 (Debian / Ubuntu)

本项目包含了一个内置的 Node.js 服务器 (`server.js`)，不仅能提供前端 `dist/` 文件的静态托管，还能提供后端的“工作区 (Workspace)” API 服务。

如果想要在 Debian/Ubuntu 等 Linux 环境下让其在后台长久运行，并实现开机自启，推荐使用 **PM2**：

1. **全局安装 PM2：**
   ```bash
   sudo npm install -g pm2
   ```

2. **使用 PM2 启动服务：**
   （请将下方的工作区路径和密码替换为你自己的）
   ```bash
   # 请在项目根目录下执行：
   pm2 start server.js --name "mypad" -- --workspace "/path/to/your/workspace" --password "your_password" --admin-port 3001
   ```
   > **注意:** 管理后台 (Admin Portal) 默认运行在 `3001` 端口。如果需要修改，请使用 `--admin-port <端口号>` 参数。

3. **设置 PM2 开机自启：**
   ```bash
   pm2 startup
   ```
   *根据终端输出的提示，复制执行相应的命令以完成设置。*

4. **保存当前的进程列表：**
   ```bash
   pm2 save
   ```

或者，你也可以使用 Linux 原生的 **systemd** 来管理。
在 `/etc/systemd/system/` 目录下创建一个名为 `mypad.service` 的文件：
```ini
[Unit]
Description=MyPad++ Server
After=network.target

[Service]
ExecStart=/usr/bin/node /absolute/path/to/mypad-/server.js --workspace "/path/to/workspace" --password "your_password" --admin-port 3001
Restart=always
User=your_username
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```
然后启用并启动该服务：`sudo systemctl daemon-reload && sudo systemctl enable --now mypad`

## ☁️ WebDAV 配置指南

当使用 MyPad++ 连接远程 WebDAV 服务器（例如通过 **Lucky** 或 Nginx 等反向代理工具）时，你必须正确配置 **CORS (跨源资源共享)**，因为浏览器默认会拦截跨域请求。

### 1. 开启 WebDAV 的 CORS 支持
在你的反向代理或 WebDAV 服务端配置中，请确保响应头包含以下字段：

- `Access-Control-Allow-Origin`: `*` (或者你的 MyPad++ 实例所在的具体域名)
- `Access-Control-Allow-Methods`: `OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, COPY, MOVE, MKCOL, PROPFIND, PROPPATCH, LOCK, UNLOCK`
- `Access-Control-Allow-Headers`: `Authorization, Content-Type, Depth, Destination, Overwrite, x-requested-with, If-Match, If-None-Match, Cache-Control`
- `Access-Control-Expose-Headers`: `DAV, content-length, Allow`

**非常重要：** WebDAV 强依赖 `PROPFIND` 方法来列出目录结构。如果你在浏览器控制台看到 `Method PROPFIND is not allowed by Access-Control-Allow-Methods` 类似的报错，请务必检查你的反向代理是否放行了 `PROPFIND` 方法。

### 2. 搜索索引 (Search Index) 配置
MyPad++ 支持极速的“连续多词模糊匹配”搜索（例如输入 `abc pdf` 可以瞬间找到 `*abc*pdf*` 的文件）。由于 WebDAV 的根目录可能极其庞大，MyPad++ 采用了静态 JSON 索引文件的方式，避免了缓慢的整树遍历。

- 索引文件应该是一个包含了相对文件路径的 JSON 数组。
- 你可以在连接 WebDAV 的设置弹窗中输入**自定义搜索索引 URL (Custom Search Index URL)**。这意味着你可以将索引文件托管在任何地方，而不必强制放在 WebDAV 的根目录。

#### 自动化生成 WebDAV 索引
我们已经在项目代码中提供了一个开箱即用的 Python 后台脚本，位于项目的 `scripts` 目录中。
此脚本能够通过 watchdog 监听本地文件系统变动，一旦文件有修改，自动在极短时间内为你重新生成 WebDAV 用的 `webdav_index.json` 文件！

**配置与使用步骤：**

1. 进入 `scripts` 目录：
   ```bash
   cd scripts
   ```

2. 安装所需依赖：
   ```bash
   pip install watchdog
   ```

3. 复制配置示例并进行修改：
   ```bash
   cp config.json.example config.json
   ```
   **`config.json` 详解：**
   - `"output_file"`: 最终生成的 json 文件的保存路径（请保存在能通过 HTTP/HTTPS 被直接访问到的静态目录下）。
   - `"mappings"`: 配置你想要建立索引的本地绝对路径 (`local_dir`)，以及它们对应在客户端 MyPad++ 里的相对 WebDAV 路径 (`webdav_prefix`)。支持多个映射。
   - `"excludes"`: （可选）不需要被索引的垃圾目录或文件后缀（例如 `.git`、`node_modules`），过滤它们可以极大提升搜索速度。

4. 运行后台守护进程：
   ```bash
   python webdav_indexer_daemon.py config.json
   ```
   *提示：推荐使用 `nohup`, `screen`, 或者 `systemd` 将其挂在后台常驻运行。只要对应的文件夹里有新的变动，它就会自动为你生成全新的索引供 MyPad++ 使用！*

## 🛠️ 技术栈

- **核心：** 原生 JavaScript (ES Modules)、HTML5、CSS3 (CSS 变量)
- **编辑器组件：** [CodeMirror 6](https://codemirror.net/)
- **构建工具：** [Vite](https://vitejs.dev/)
- **字符编码：** `jschardet`, `iconv-lite`

## 📦 PWA 支持

MyPad++ 完整支持 PWA（Progressive Web App）。当你在受支持的浏览器（如安卓 Chrome 或 iOS Safari）上访问它时，可以选择 **“添加到主屏幕”** 把它当作独立的原生 App 一样安装使用。

## 🤝 贡献代码

欢迎提交 Pull Request。如果有重大的变更，请先开启一个 Issue 进行讨论。

## 📄 开源协议

本项目基于 MIT 协议开源。
