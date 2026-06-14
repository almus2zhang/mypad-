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
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> | **New File** | Create a new blank document. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> | **Open** | Open a file from your local hard drive. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> | **Save** | Save the current file. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/><circle cx="19" cy="5" r="4" fill="currentColor" stroke="currentColor" stroke-width="1.5"/><line x1="19" y1="3" x2="19" y2="7"/><line x1="17" y1="5" x2="21" y2="5"/></svg> | **Save As** | Save the current file to a new location. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg> | **Undo** | Undo the last action. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg> | **Redo** | Redo the last undone action. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><polyline points="16 16 14 18 16 20"/><line x1="3" y1="18" x2="10" y2="18"/></svg> | **Word Wrap** | Toggle word wrapping for long lines. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="18" x2="21" y2="18"/></svg> | **Status Bar** | Show/hide the bottom status bar (encoding/cursor info). |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"/><line x1="2" y1="5" x2="22" y2="19"/><line x1="2" y1="19" x2="22" y2="5"/></svg> | **Virtual Keyboard** | Disable the auto pop-up of the on-screen keyboard (useful for tablets with physical keyboards). |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg> | **Fullscreen** | Enter immersive fullscreen mode, hiding the system status bar. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> / <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg> | **Zoom In/Out** | Increase or decrease the editor font size. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> / <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> | **Theme** | Toggle between Light and Dark themes. |

### Advanced Features

| Icon | Name | Description |
| :---: | :--- | :--- |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg> | **File Explorer** | Slide-out sidebar to view workspace files. Right-click folders to "Pin to top". |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> | **Find** | Powerful local search (Ctrl+F), supports regex. Defaults to an overview side panel. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h6a4 4 0 0 1 0 8H8"/><path d="M8 4v16"/><path d="M13.5 12L18 20"/></svg> | **Replace** | Replace text within the current file. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> | **Next Error** | Jump to the next syntax error or warning. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg> | **Compare Mode** | Side-by-side view to diff files intelligently. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg> | **WebDAV** | Connect to a remote WebDAV server for remote file editing. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> | **Server Workspace** | Use a remote directory via Node.js as your local workspace. |
| <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> | **Highlights** | Manage custom highlights. Select text and use the context menu to instantly colorize words. |

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
   # From your project root directory:
   pm2 start server.js --name "mypad" -- --workspace "/path/to/your/workspace" --password "your_password"
   ```

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
ExecStart=/usr/bin/node /absolute/path/to/mypad-/server.js --workspace "/path/to/workspace" --password "your_password"
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
