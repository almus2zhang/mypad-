# MyPad++

English | [简体中文](README_zh.md)
MyPad++ is a modern, lightweight, and incredibly fast web-based code editor and text pad, designed with a focus on **tablet and mobile touch experiences**, while remaining fully capable on the desktop. It is built using Vanilla JavaScript, Vite, and CodeMirror 6, entirely without heavy frontend frameworks to ensure the lowest latency and minimal resource usage.

![MyPad++](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- **PWA & Touch Optimized:** Designed to run beautifully on Android/iPad tablets as a Progressive Web App (fullscreen immersive mode). Includes a "No Keyboard" toggle mode to comfortably scroll and read code without the virtual keyboard interrupting you.
- **Advanced Code Editing:** Powered by CodeMirror 6, featuring syntax highlighting for over 15+ languages, line numbers, code folding, auto-closing brackets, and multiple cursor selections.
- **Side-by-Side Compare (Diff):** Built-in file comparison tool to easily diff your code changes, complete with "Previous/Next Diff" navigation and synced scrolling.
- **Custom Highlights:** Select text and instantly highlight it with custom colors (Red, Green, Blue, Yellow, etc.). Great for code reviewing or studying.
- **Local File System Access:** Securely open, edit, and save files straight to your local hard drive using the modern Native File System Access API.
- **WebDAV & Remote Workspace:** Connect directly to your remote WebDAV server or a custom Node.js workspace backend to edit code directly on your servers.
- **Responsive Global Search:** A sleek bottom/side floating search panel with regex support, "Find All" history, and dynamic font scaling.
- **Multi-Tab Management:** Auto-saving sessions. Never lose your tabs or unsaved modifications when you accidentally close the browser.

## 📖 Usage & Icons

### Toolbar Actions

| Icon | Name | Description |
| :---: | :--- | :--- |
| <img src="docs/icons/newFile.svg" width="18" height="18" alt="New File"> | **New File** | Create a new blank document. |
| <img src="docs/icons/open.svg" width="18" height="18" alt="Open"> | **Open** | Open a file from your local hard drive. |
| <img src="docs/icons/save.svg" width="18" height="18" alt="Save"> | **Save** | Save the current file. |
| <img src="docs/icons/saveAs.svg" width="18" height="18" alt="Save As"> | **Save As** | Save the current file to a new location. |
| <img src="docs/icons/undo.svg" width="18" height="18" alt="Undo"> | **Undo** | Undo the last action. |
| <img src="docs/icons/redo.svg" width="18" height="18" alt="Redo"> | **Redo** | Redo the last undone action. |
| <img src="docs/icons/wordWrap.svg" width="18" height="18" alt="Word Wrap"> | **Word Wrap** | Toggle word wrapping for long lines. |
| <img src="docs/icons/statusBar.svg" width="18" height="18" alt="Status Bar"> | **Status Bar** | Show/hide the bottom status bar (encoding/cursor info). |
| <img src="docs/icons/keyboardOff.svg" width="18" height="18" alt="Virtual Keyboard"> | **Virtual Keyboard** | Disable the auto pop-up of the on-screen keyboard (useful for tablets with physical keyboards). |
| <img src="docs/icons/fullscreen.svg" width="18" height="18" alt="Fullscreen"> | **Fullscreen** | Enter immersive fullscreen mode, hiding the system status bar. |
| <img src="docs/icons/zoomIn.svg" width="18" height="18" alt="Zoom In"> / <img src="docs/icons/zoomOut.svg" width="18" height="18" alt="Zoom Out"> | **Zoom In/Out** | Increase or decrease the editor font size. |
| <img src="docs/icons/themeLight.svg" width="18" height="18" alt="Theme Light"> / <img src="docs/icons/themeDark.svg" width="18" height="18" alt="Theme Dark"> | **Theme** | Toggle between Light and Dark themes. |

### Advanced Features

| Icon | Name | Description |
| :---: | :--- | :--- |
| <img src="docs/icons/explorer.svg" width="18" height="18" alt="File Explorer"> | **File Explorer** | Slide-out sidebar to view workspace files. Right-click folders to "Pin to top". |
| <img src="docs/icons/find.svg" width="18" height="18" alt="Find"> | **Find** | Powerful local search (Ctrl+F), supports regex. Defaults to an overview side panel. |
| <img src="docs/icons/replace.svg" width="18" height="18" alt="Replace"> | **Replace** | Replace text within the current file. |
| <img src="docs/icons/nextError.svg" width="18" height="18" alt="Next Error"> | **Next Error** | Jump to the next syntax error or warning. |
| <img src="docs/icons/compare.svg" width="18" height="18" alt="Compare Mode"> | **Compare Mode** | Side-by-side view to diff files intelligently. |
| <img src="docs/icons/webdav.svg" width="18" height="18" alt="WebDAV"> | **WebDAV** | Connect to a remote WebDAV server for remote file editing. |
| <img src="docs/icons/workspace.svg" width="18" height="18" alt="Server Workspace"> | **Server Workspace** | Use a remote directory via Node.js as your local workspace. |
| <img src="docs/icons/highlights.svg" width="18" height="18" alt="Highlights"> | **Highlights** | Manage custom highlights. Select text and use the context menu to instantly colorize words. |

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

You need to have **Node.js** (v16+ recommended) and **npm** installed on your system.
You can download it from [nodejs.org](https://nodejs.org/).

### Installation & Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/almus2zhang/mypad-.git
   cd mypad-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The terminal will output a local URL (e.g., `http://localhost:5173`). Open this URL in your web browser to use MyPad++.

### Building for Production

To build the app for production (generating static HTML/CSS/JS files):

```bash
npm run build
```

This will create a `dist/` folder containing the compiled, minified, and optimized static assets.

### Preview the Production Build

You can preview the built production app locally using:

```bash
npm run preview
```

### Running as a Background Service (Debian/Ubuntu Auto-Start)

The project includes a built-in Node.js server (`server.js`) that serves the production frontend (`dist/`) and provides backend workspace APIs.

To run the server continuously and start automatically on boot under a Debian/Ubuntu environment, you can use **PM2**:

1. **Install PM2 globally:**
   ```bash
   sudo npm install -g pm2
   ```

2. **Start the server with PM2:**
   Replace the workspace path and password with your desired values.
   ```bash
   # Run from the project root:
   pm2 start server.js --name "mypad" -- --workspace "/path/to/your/workspace" --password "your_password" --admin-port 3001
   ```
   > **Note:** The Admin Portal runs on port `3001` by default. You can change it using `--admin-port <port>`.

3. **Set PM2 to start on boot:**
   ```bash
   pm2 startup
   ```
   *Run the command outputted by the terminal to complete the setup.*

4. **Save the current process list:**
   ```bash
   pm2 save
   ```

Alternatively, you can manage it using **systemd**. Create a service file `/etc/systemd/system/mypad.service`:
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
Then enable and start it: `sudo systemctl daemon-reload && sudo systemctl enable --now mypad`

## 🛠️ Tech Stack

- **Core:** Vanilla JavaScript (ES Modules), HTML5, CSS3 (CSS Variables/Custom Properties)
- **Editor:** [CodeMirror 6](https://codemirror.net/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Encoding:** `jschardet`, `iconv-lite`

## 📦 PWA Support

MyPad++ is fully equipped to be installed as a PWA. When accessing the site on a supported browser (like Chrome on Android or Safari on iOS), you can select **"Add to Home Screen"** to install it as a standalone app.

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License.
