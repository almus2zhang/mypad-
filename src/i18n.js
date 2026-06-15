const EN_DICTIONARY = {
  'HELP_CONTENT_HTML': `
    <style>
      .help-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; vertical-align: middle; color: var(--text-primary); background: var(--bg-secondary); border-radius: 4px; margin: 0 4px; }
      .help-icon svg { width: 16px; height: 16px; }
      .help-ul li { margin-bottom: 8px; display: flex; align-items: center; }
    </style>
    <h3 style="margin-top: 0;">Toolbar Icons</h3>
    <ul class="help-ul" style="padding-left: 20px; color: var(--text-secondary);">
      <li><span class="help-icon">{newFile}</span><span class="help-icon">{open}</span><span class="help-icon">{save}</span><span class="help-icon">{saveAs}</span> : New / Open / Save / Save As</li>
      <li><span class="help-icon">{undo}</span><span class="help-icon">{redo}</span> : Undo / Redo</li>
      <li><span class="help-icon">{wordWrap}</span> : Toggle Word Wrap</li>
      <li><span class="help-icon">{statusBar}</span> : Toggle Status Bar</li>
      <li><span class="help-icon">{keyboardOff}</span> : Prevent virtual keyboard popup (useful with external keyboards)</li>
      <li><span class="help-icon">{fullscreen}</span> : Immersive Fullscreen Mode</li>
      <li><span class="help-icon">{zoomIn}</span><span class="help-icon">{zoomOut}</span> : Zoom In / Out</li>
      <li><span class="help-icon">{themeDark}</span> / <span class="help-icon">{themeLight}</span> : Toggle Dark / Light Theme</li>
    </ul>

    <h3 style="margin-top: 20px;">Advanced Features</h3>
    <ul class="help-ul" style="padding-left: 20px; color: var(--text-secondary);">
      <li><span class="help-icon">{explorer}</span> <b>Explorer</b> : Left sidebar file tree. Right-click folders to <b>Pin to Top</b>.</li>
      <li><span class="help-icon">{find}</span> <b>Find</b> : Local search (Ctrl+F) with Regex support.</li>
      <li><span class="help-icon">{replace}</span> <b>Replace</b> : Replace text in current file.</li>
      <li><span class="help-icon">{nextError}</span> <b>Next Error</b> : Jump to next syntax error/warning.</li>
      <li><span class="help-icon">{compare}</span> <b>Compare</b> : Split-pane diff view.</li>
      <li><span class="help-icon">{webdav}</span> <b>WebDAV</b> : Connect to remote WebDAV servers.</li>
      <li><span class="help-icon">{workspace}</span> <b>Workspace</b> : Server-side workspace explorer.</li>
      <li><span class="help-icon">{highlights}</span> <b>Highlights</b> : Custom regex/keyword highlighting.</li>
    </ul>

    <p style="margin-top: 20px; color: var(--text-tertiary); font-size: 0.9em;">
      Tip: Standard shortcuts are supported (e.g. Ctrl+S, Ctrl+F). An external keyboard is recommended for best experience.
    </p>
  `,
};

const ZH_DICTIONARY = {
  // Toolbar Tooltips
  'New File': '新建',
  'Open': '打开',
  'Save': '保存',
  'Save As': '另存为',
  'Undo': '撤销',
  'Redo': '重做',
  'Toggle Word Wrap': '自动换行',
  'Toggle Zoom In': '放大',
  'Toggle Zoom Out': '缩小',
  'Toggle Light Theme': '切换至浅色主题',
  'Toggle Dark Theme': '切换至深色主题',
  'Find': '查找',
  'Replace': '替换',
  'WebDAV': 'WebDAV 远程空间',
  'File Explorer': '文件资源管理器',
  'Toggle Status Bar': '切换状态栏',
  'Toggle Virtual Keyboard Block': '切换虚拟键盘阻挡',
  'Toggle Fullscreen': '全屏',
  'Toggle Highlight Mode': '切换高亮模式',
  'Workspace Browser': '工作区浏览器',
  'Next Error / Warning': '下一个错误 / 警告',
  'Compare with...': '与其他文件对比...',
  'Switch Language': '切换语言 / Switch Language',

  // Statusbar
  'Line': '行',
  'Col': '列',
  'Selected': '已选',
  'lines': '行',
  'File Path': '文件路径',
  'Cursor Position': '光标位置',
  'Selection': '选取内容',
  'File Size': '文件大小',
  'Spaces': '空格',
  'Tabs': '制表符',

  // Dialogs
  'Close': '关闭',
  'Select Encoding': '选择编码',
  'Search encodings...': '搜索编码...',
  'Current:': '当前:',
  'Go to Line': '跳转到行',
  'Line number (1 - {max}):': '行号 (1 - {max}):',
  'Go': '跳转',
  'Cancel': '取消',
  'Save Changes': '保存更改',
  'Do you want to save changes to': '是否保存对以下文件的更改',
  'Don\'t Save': '不保存',
  'Connect to WebDAV': '连接到 WebDAV',
  'Server URL': '服务器地址 (URL)',
  'Username': '用户名',
  'Password': '密码',
  'Remember me': '记住我',
  'Connect': '连接',
  'Settings': '设置',
  'Tab Size': 'Tab 宽度',
  'Font Size': '字体大小',
  'Word Wrap': '自动换行',
  'Show Invisibles': '显示不可见字符',
  'Auto Save': '自动保存',
  'Connect to Server Workspace': '连接到服务器工作区',
  'Server Password': '服务器密码',
  'Select tab to compare': '选择要对比的标签页',
  'No other tabs open to compare with.': '没有打开其他可以对比的标签页。',
  'Cancel Comparison': '取消对比',

  // Search Panel
  'Find:': '查找:',
  'Replace with:': '替换为:',
  'Previous (Shift+Enter)': '上一个 (Shift+Enter)',
  'Next (Enter)': '下一个 (Enter)',
  'Close (Escape)': '关闭 (Escape)',
  'Match Case': '区分大小写',
  'Whole Word': '全字匹配',
  'Regular Expression': '正则表达式',
  'Replace current match': '替换当前',
  'Replace all matches': '替换全部',
  'All': '全部',
  'Find All': '查找全部',
  'No results': '无结果',
  'Searching...': '搜索中...',
  'No results found.': '未找到匹配项。',
  'Found {count}': '找到 {count} 个',
  '{current} of {total}': '第 {current} 个，共 {total} 个',
  'Layout: Side': '布局: 侧边',
  'Layout: Bottom': '布局: 底部',

  // Sidebar / File Explorer
  'EXPLORER': '资源管理器',
  'Open Files': '已打开文件',
  'Recent Files': '最近打开',
  'No recent files': '没有最近打开的文件',
  'Unsaved changes': '有未保存的修改',
  'Close Sidebar': '关闭侧边栏',
  'Pin to top': '钉在顶部',
  'Unpin from top': '取消置顶',
  'No files open': '没有打开的文件',

  // Workspace Browser & WebDAV Browser
  'Search Extension: {ext}': '搜索扩展名: {ext}',
  'Search: "{q}"': '搜索: "{q}"',
  '← Back to root': '← 返回根目录',
  'Server Workspace': '服务器工作区',
  '🔄 Rebuild Index': '🔄 重建索引',
  'Rebuilding...': '重建中...',
  'Empty directory': '空目录',
  'New Folder': '新建文件夹',
  'Save Here': '保存到这里',
  'Filename:': '文件名:',
  'Enter new folder name:': '请输入新建文件夹名称:',
  'File already exists. Overwrite?': '文件已存在，是否覆盖？',

  // Context Menu
  'Cut': '剪切',
  'Copy': '复制',
  'Paste': '粘贴',
  'Select All': '全选',
  'Indent': '增加缩进',
  'Outdent': '减少缩进',
  'Toggle Comment': '切换注释',
  'Find in Workspace': '在工作区查找',
  'Highlight Selection': '高亮选中文本',
  'Remove Highlight': '取消高亮',
  'Reload from Disk': '从磁盘重新加载',
  'Close Other Tabs': '关闭其他标签页',
  'Close Tabs to the Right': '关闭右侧标签页',

  // Tab Bar
  'New Tab (Ctrl+N)': '新建标签页 (Ctrl+N)',
  'Untitled': '未命名',

  // Messages / Alerts
  'Failed to load languages': '无法加载语言列表',
  'Error saving file:': '保存文件时出错:',
  'File saved:': '文件已保存:',
  'File opened:': '文件已打开:',
  'Workspace connected': '工作区已连接',
  'Workspace error:': '工作区错误:',
  'Please connect to WebDAV first.': '请先连接到 WebDAV。',
  'Disconnected': '已断开连接',
  'WebDAV disconnected': 'WebDAV 已断开连接',
  'Workspace disconnected': '工作区已断开连接',
  'Nothing to redo': '没有可以重做的操作',
  'Nothing to undo': '没有可以撤销的操作',

  // Highlight UI
  'Manage Highlights': '管理高亮',
  'Target (Text or Regex)': '目标文本 (或正则)',
  'Background Color': '背景色',
  'Text Color': '文本色',
  'Regex?': '使用正则?',
  'Add Highlight': '添加高亮',
  '+ Add Rule': '+ 添加规则',

  // Miscellaneous
  'bytes': '字节',
  'Theme toggle': '切换主题',
  'Select Language Mode': '选择语言模式',
  'Language Mode': '语言模式',
  'Search languages…': '搜索语言…',
  'Select File Encoding': '选择文件编码',
  'File Encoding': '文件编码',
  'Search encodings...': '搜索编码...',
  'No other tabs open to compare with.': '没有其他打开的标签页可供对比。',
  'Line number (1 - {max}):': '请输入行号 (1 - {max}):',
  'Server URL': '服务器 URL',
  'Help': '帮助',
  'MyPad++ Help': 'MyPad++ 使用说明',
  'Loading workspaces...': '正在加载工作区...',
  'Loading...': '加载中...',
  'empty': '空',
  'Error loading workspace:': '加载工作区出错:',
  'Error': '错误',
  'Search... (Regex supported)': '搜索... (支持正则表达式)',
  'Case Sensitive': '区分大小写',
  'Toggle Results Layout': '切换结果布局 (底部/侧边)',
  'Previous': '上一个',
  'Next': '下一个',
  'Incorrect password!': '密码错误！',
  'Cannot connect to Server Workspace.': '无法连接到服务器工作区。',
  'Failed to open recent workspace file:': '无法打开最近的工作区文件:',
  'Opening WebDAV file directly is not supported yet.': '目前不支持直接打开 WebDAV 文件。',
  'Local files cannot be reopened automatically due to browser security.': '由于浏览器安全限制，无法自动重新打开本地文件。',
  'Failed to open file:': '打开文件失败:',
  'File saved:': '文件已保存:',
  'Error saving file:': '保存文件时出错:',
  'File opened:': '文件已打开:',
  'Failed to open workspace file:': '打开工作区文件失败:',
  'Workspace error:': '工作区错误:',
  'Open a file first to compare': '请先打开一个文件以进行对比',
  'Error enabling fullscreen:': '启用全屏失败:',
  'Encoding changed to': '编码已更改为',
  'Language mode set to': '语言模式已设置为',
  'Cannot read clipboard. Please allow permission or use Ctrl+V': '无法读取剪贴板，请允许剪贴板权限或使用 Ctrl+V',
  'Replace with...': '替换为...',
  'Replace current match': '替换当前匹配项',
  'Replace all matches': '替换所有匹配项',
  'WebDAV Browser': 'WebDAV 浏览器',
  '— Select saved connection —': '— 选择已保存的连接 —',
  'Connecting...': '连接中...',
  'Disconnect': '断开连接',
  'Go Back': '返回跳转前位置',
  'Context Menu': '操作菜单 / 右键菜单',
  'Switched system language to {lang}': '已切换系统语言为 {lang}',
  'Switch Language': '切换系统语言',
  'Are you sure you want to switch language to {lang}? This will reload the page.': '确定要将系统语言切换为 {lang} 吗？这将会刷新整个页面。',
  'Cancel': '取消',
  'Confirm': '确定',
  'HELP_CONTENT_HTML': `
    <style>
      .help-icon { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; vertical-align: middle; color: var(--text-primary); background: var(--bg-secondary); border-radius: 4px; margin: 0 4px; }
      .help-icon svg { width: 16px; height: 16px; }
      .help-ul li { margin-bottom: 8px; display: flex; align-items: center; }
    </style>
    <h3 style="margin-top: 0;">工具栏图标说明</h3>
    <ul class="help-ul" style="padding-left: 20px; color: var(--text-secondary);">
      <li><span class="help-icon">{newFile}</span><span class="help-icon">{open}</span><span class="help-icon">{save}</span><span class="help-icon">{saveAs}</span> : 新建 / 打开 / 保存 / 另存为</li>
      <li><span class="help-icon">{undo}</span><span class="help-icon">{redo}</span> : 撤销 / 重做</li>
      <li><span class="help-icon">{wordWrap}</span> : 切换长文本自动换行</li>
      <li><span class="help-icon">{statusBar}</span> : 显示 / 隐藏底部的编码和光标信息状态栏</li>
      <li><span class="help-icon">{keyboardOff}</span> : 禁止软键盘自动弹出 (适合外接键盘时使用)</li>
      <li><span class="help-icon">{fullscreen}</span> : 沉浸式全屏模式，隐藏系统状态栏</li>
      <li><span class="help-icon">{zoomIn}</span><span class="help-icon">{zoomOut}</span> : 放大 / 缩小字体</li>
      <li><span class="help-icon">{themeDark}</span> / <span class="help-icon">{themeLight}</span> : 切换深色 / 浅色主题</li>
    </ul>

    <h3 style="margin-top: 20px;">高级功能说明</h3>
    <ul class="help-ul" style="padding-left: 20px; color: var(--text-secondary);">
      <li><span class="help-icon">{explorer}</span> <b>树状目录</b> : 左侧滑出的文件浏览器，可查看当前工作区的所有文件。右键点击目录可将其<b>“钉在顶部”</b>，方便快速访问深层文件夹。</li>
      <li><span class="help-icon">{find}</span> <b>查找</b> : 强大的本地搜索（快捷键 Ctrl+F），支持正则表达式。</li>
      <li><span class="help-icon">{replace}</span> <b>替换</b> : 在当前文件内进行文本替换。</li>
      <li><span class="help-icon">{nextError}</span> <b>查找错误</b> : 跳转到代码中的语法错误或警告位置。</li>
      <li><span class="help-icon">{compare}</span> <b>对比模式</b> : 双排对比模式，智能对齐不同版本文件的差异。</li>
      <li><span class="help-icon">{webdav}</span> <b>WebDAV</b> : 连接到远程 WebDAV 服务器读写文件。</li>
      <li><span class="help-icon">{workspace}</span> <b>服务器工作区</b> : 将远程目录作为本地工作区使用，支持跨端同步。</li>
      <li><span class="help-icon">{highlights}</span> <b>高亮设置</b> : 支持自定义关键词的颜色高亮，划选词语后打开此菜单即可自动创建高亮。</li>
    </ul>

    <p style="margin-top: 20px; color: var(--text-tertiary); font-size: 0.9em;">
      提示: 很多操作都支持标准快捷键（如 Ctrl+S 保存，Ctrl+F 查找），建议搭配外接键盘使用获得最佳体验。
    </p>
  `,
};

class I18n {
  constructor() {
    const savedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('mypad_lang') : null;
    this.lang = savedLang || 'en';
  }

  setLang(lang) {
    this.lang = lang;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mypad_lang', lang);
    }
  }

  toggle() {
    this.lang = this.lang === 'en' ? 'zh' : 'en';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mypad_lang', this.lang);
    }
    return this.lang;
  }

  t(str, params = {}) {
    if (this.lang === 'en') {
      let out = EN_DICTIONARY[str] !== undefined ? EN_DICTIONARY[str] : str;
      for (const [k, v] of Object.entries(params)) {
        out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
      return out;
    }

    // Chinese
    let translated = ZH_DICTIONARY[str];
    if (translated === undefined) {
      // Fallback to original string
      translated = str;
    }
    
    for (const [k, v] of Object.entries(params)) {
      translated = translated.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return translated;
  }
}

export const i18n = new I18n();
export const t = i18n.t.bind(i18n);

// Attach to window for global access if needed
if (typeof window !== 'undefined') {
  window.i18n = i18n;
  window.t = t;
}
