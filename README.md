# MyPad++

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
