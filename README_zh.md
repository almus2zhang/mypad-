# MyPad++

[English](README.md) | 简体中文

MyPad++ 是一款现代、轻量且极速的网页版代码编辑器和记事本，专为**平板和移动端触控体验**设计，同时在桌面端也同样功能完备。它使用原生 JavaScript (Vanilla JS)、Vite 和 CodeMirror 6 构建，完全没有使用繁重的现代前端框架，以确保极低的延迟和最小的资源占用。

![MyPad++](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

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
   pm2 start server.js --name "mypad" -- --workspace "/path/to/your/workspace" --password "your_password"
   ```

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
ExecStart=/usr/bin/node /absolute/path/to/mypad-/server.js --workspace "/path/to/workspace" --password "your_password"
Restart=always
User=your_username
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```
然后启用并启动该服务：`sudo systemctl daemon-reload && sudo systemctl enable --now mypad`

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
