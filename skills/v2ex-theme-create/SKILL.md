---
name: v2ex-theme-create
description: 根据指定设计风格生成 V2EX 自定义纯 CSS 主题，自动完成离线多场景视觉自检并打开交互预览页。
disable-model-invocation: true
---

根据用户提出的设计风格编写独立的纯 CSS V2EX 主题，使用内置离线样本（`home`、`topic`、`settings`）自动完成视觉自检，并打开交互式预览页供用户最终验收。

面向用户的所有提问、说明与汇报**默认使用中文**（除非用户明确使用其他语言沟通）。

编写 CSS 前先阅读 [`references/v2ex-selectors.md`](references/v2ex-selectors.md)：里面记录了 V2EX 真实的 DOM 选择器、原生 CSS 变量映射、深浅色钩子及优先级避坑点。

## 工作流

只要用户已经给出风格方向，就一次性连贯走完第 1–5 步；仅在用户完全没有提供任何风格方向时，在开始前用中文提一个简短问题确认风格。

### 1. 提炼设计变量（Design Tokens）

接受任意形式的风格输入：文字描述、设计系统/品牌名、参考链接、截图或设计文档。动笔写 CSS 前先提炼精简的 token 集合：

- **色板**：画布底色、卡片表面、次级填充、悬停态、弱分割线、控件边框、主文字、弱化文字、强调色、强调色浅底、主按钮底色与前景色。
- **字体排印**：界面无衬线字体、正文阅读字体（如需区分）、等宽字体、字号与行高阶梯。
- **几何与密度**：卡片圆角、控件圆角、间距节奏、边框粗细、阴影/立体层次处理。
- **深浅色模式**：默认同时适配 `light` 与 `dark`（跟随 V2EX 的 `:root[data-site-theme]`、`#Wrapper.Night` 与 `prefers-color-scheme`）；仅当目标风格天然单模式（例如纯深色终端风）时锁定单一模式。

### 2. 确定输出路径

根据当前工作目录自适应决定输出位置：

- **在 `v2ex-theme` 仓库内**（当前目录存在 `public/themes/`）或用户明确表示要向 `v2ex-theme` 提 PR：
  - 写入 `public/themes/<slug>/theme.css`
  - 写入 `public/themes/<slug>/theme.json`，包含 `{"name", "author", "description"}`（不要生成 `.webp` 样张）。
- **在仓库外**（独立安装的默认场景）：
  - 写入当前目录的 `<slug>/theme.css`（或用户指定的确切路径）。

### 3. 编写 `theme.css`

基于 [`references/v2ex-selectors.md`](references/v2ex-selectors.md) 编写完整、单文件的纯 CSS 主题：

- 纯 CSS，零 JavaScript。
- 允许可选的公网 `https://` `@font-face` 字体声明，但必须配齐拉丁文 + 中文系统字体回退并设置 `font-display: swap`；禁止外链图片、`@import` 与外部样式表依赖。
- 将 V2EX 原生 `--box-*`、`--button-*`、`--link-*`、`--color-*`、`--theme-switch-*` 变量映射到主题 token。
- 完整覆盖全部三个验收场景（`home`、`topic`、`settings`），包括顶栏/搜索框、分类标签、帖子列表行、回复数徽章、侧栏、节点导航、帖子正文排印/代码块/引用块、楼中楼连线与父回复引用条、设置页开关/Select2/输入框/按钮、焦点环、减弱动态效果及窄屏断点（`840px` 与 `520px`）。

### 4. 自动视觉自检并打开交互预览页

执行本 skill 目录自带的零依赖校验脚本（按本 `SKILL.md` 所在目录解析脚本路径）：

```bash
node <skill-dir>/scripts/verify-theme.mjs --css <path/to/theme.css> --name "<主题名称>" --mode <both|light|dark>
```

双色主题传 `--mode both`，明确单色主题传 `--mode light` 或 `--mode dark`。脚本会把临时文件写到系统临时目录（不污染当前目录），通过 Playwright 或本机无头 Chromium 截图，并在浏览器打开 `preview.html`。

**视觉自检验收标准：**

- 当 `screenshotEngine` 为 `playwright` 或 `chrome-headless` 时，使用看图工具检查**每一张**生成的 PNG（启用颜色模式下的 `home`、`topic`、`settings` `1280×800` 截图，以及 `390×844` 的 `home-mobile.png`）。
- 逐张检查以下四项：
  1. 浅色与深色模式下，正文、链接与弱化元信息的对比度是否清晰。
  2. 是否存在未覆盖的刺眼白底、`#Logo` 或搜索图标看不见、深色模式下节点导航内联色错乱等问题。
  3. `#Top`、`#Tabs`、`#Main`/`#Rightbar`、`.cell.item`、`.topic_content`/`pre` 代码块、楼中楼（`.reply-threads-d` 缩进、连线与头像对齐、`.reply-strip` / `.reply-parent` 可读性）及 `.onoffswitch`/Select2/`.super.button` 控件是否对齐自然。
  4. `home-mobile.png` 是否无横向溢出、顶栏与头像列是否无裁切。
- 发现任何视觉缺陷都要修改 `theme.css` 并重新运行 `verify-theme.mjs`（中间轮次加 `--no-open`，全部通过后再打开），直到全部截图过关。
- 若 `screenshotEngine` 为 `none`，在中文回复中明确告知用户：由于未检测到 Playwright 或本机 Chrome/Chromium，已跳过自动截图，请直接通过已打开的 `preview.html` 目测验收。

### 5. 交付与迭代

用中文向用户汇报：
- 写入的文件路径与选定的核心设计变量。
- 自动视觉自检通过了哪些项目（或说明已降级为手动预览）。
- 已在浏览器打开的 `preview.html` 路径，并提示支持切换「首页 / 帖子详情 / 设置页」、「浅色 / 深色」、视口宽度以及「查看原版」对照（快捷键：`1/2/3`、`L/D`、`B`）。

当用户在预览页查看后提出细节调整时，修改 `theme.css`，运行 `verify-theme.mjs --no-open`（刷新截图并原地覆盖同一个 `preview.html`），检查受影响的截图后提示用户刷新浏览器标签页即可查看更新。

用户对主题效果满意并希望投稿到 `yuyinws/v2ex-theme` 主题图册时，提示用户可以直接运行 `/v2ex-theme-submit`，无需手动 fork 或克隆仓库即可发起 PR。
