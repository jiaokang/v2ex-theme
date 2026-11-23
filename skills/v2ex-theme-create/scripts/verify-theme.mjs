#!/usr/bin/env node
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'

export const SCENES = [
  { id: 'home', label: '首页' },
  { id: 'topic', label: '帖子详情' },
  { id: 'settings', label: '设置页' },
]

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = resolve(SCRIPT_DIR, '../fixtures')
const THEME_STYLE_ID = 'v2ex-theme-override'

let cachedSharedStyles = null

export function loadSharedStyles() {
  if (!cachedSharedStyles) {
    const gz = readFileSync(join(FIXTURES_DIR, 'shared-styles.json.gz'))
    cachedSharedStyles = JSON.parse(gunzipSync(gz).toString('utf8'))
  }
  return cachedSharedStyles
}

export function loadSceneSkeleton(scene) {
  const gz = readFileSync(join(FIXTURES_DIR, `v2ex-${scene}.html.gz`))
  return gunzipSync(gz).toString('utf8')
}

export function reconstructFixture(scene) {
  const shared = loadSharedStyles()
  const skeleton = loadSceneSkeleton(scene)
  return skeleton.replace(/<!--V2EX_SHARED_STYLE:(\d+)-->/g, (_, idx) => shared[Number(idx)])
}

export function escapeStyleContent(css) {
  return css.replace(/<(?=\/style)/gi, '\\3c ')
}

export function buildSceneDocument(sceneHtml, themeCss, { colorScheme = 'light', baseline = false } = {}) {
  const isDark = colorScheme === 'dark'

  let html = sceneHtml
    .replace(/(<html\b[^>]*\bdata-site-theme=")[^"]*(")/i, `$1${colorScheme}$2`)
    .replace(
      /<style\b([^>]*)\bmedia="([^"]*prefers-color-scheme:\s*dark[^"]*)"([^>]*)>/gi,
      (_, before, _media, after) => `<style${before}media="${isDark ? 'screen' : 'not all'}"${after}>`,
    )
    .replace(
      /<style\b([^>]*)\bmedia="([^"]*prefers-color-scheme:\s*light[^"]*)"([^>]*)>/gi,
      (_, before, _media, after) => `<style${before}media="${isDark ? 'not all' : 'all'}"${after}>`,
    )

  if (isDark) {
    html = html.replace(/<div\b([^>]*\bid="Wrapper"[^>]*)>/i, (tag, attrs) => {
      if (/\bclass="/i.test(attrs)) {
        return tag.replace(/\bclass="([^"]*)"/i, (_, cls) =>
          /\bNight\b/.test(cls) ? `class="${cls}"` : `class="${cls} Night"`,
        )
      }
      return `<div${attrs} class="Night">`
    })
  } else {
    html = html.replace(/<div\b([^>]*\bid="Wrapper"[^>]*)>/i, (tag) =>
      tag.replace(/\bclass="([^"]*)"/i, (_, cls) => `class="${cls.replace(/\bNight\b/g, '').trim()}"`),
    )
  }

  if (!baseline && themeCss) {
    const escaped = escapeStyleContent(themeCss)
    html = html.replace('</head>', () => `<style id="${THEME_STYLE_ID}">${escaped}</style></head>`)
  }

  return html
}

const safeJsonForScript = (value) => JSON.stringify(value).replace(/</g, '\\u003c')

export function buildPreviewShell({ name, themeCss, defaultScheme = 'light' }) {
  const sharedStyles = loadSharedStyles()
  const skeletons = Object.fromEntries(SCENES.map(({ id }) => [id, loadSceneSkeleton(id)]))

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>V2EX 主题预览 · ${name.replace(/[<>&"]/g, '')}</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f4f4f5;
      --bar: #ffffff;
      --border: #e4e4e7;
      --text: #18181b;
      --muted: #71717a;
      --active-bg: #18181b;
      --active-fg: #ffffff;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #09090b;
        --bar: #18181b;
        --border: #27272a;
        --text: #f4f4f5;
        --muted: #a1a1aa;
        --active-bg: #f4f4f5;
        --active-fg: #18181b;
      }
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: var(--bg); color: var(--text); font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif; }
    body { display: flex; flex-direction: column; }
    header {
      display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px;
      padding: 10px 16px; background: var(--bar); border-bottom: 1px solid var(--border);
    }
    .title { font-weight: 600; margin-right: auto; }
    .group { display: inline-flex; align-items: center; gap: 4px; padding: 2px; border: 1px solid var(--border); border-radius: 8px; }
    button {
      border: 0; background: transparent; color: var(--muted); padding: 5px 10px;
      border-radius: 6px; cursor: pointer; font: inherit;
    }
    button[aria-pressed="true"] { background: var(--active-bg); color: var(--active-fg); font-weight: 600; }
    label.toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; color: var(--text); }
    main { flex: 1; display: flex; justify-content: center; overflow: auto; padding: 0; }
    main.framed { padding: 16px; }
    iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    main.framed iframe { border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.12); }
    .hint { color: var(--muted); font-size: 12px; }
  </style>
</head>
<body>
  <header>
    <div class="title">V2EX 主题预览 · <span id="theme-name"></span></div>
    <div class="group" role="group" aria-label="验收场景">
      <button data-scene="home" aria-pressed="true">首页</button>
      <button data-scene="topic" aria-pressed="false">帖子详情</button>
      <button data-scene="settings" aria-pressed="false">设置页</button>
    </div>
    <div class="group" role="group" aria-label="颜色模式">
      <button data-scheme="light" aria-pressed="false">浅色</button>
      <button data-scheme="dark" aria-pressed="false">深色</button>
    </div>
    <div class="group" role="group" aria-label="视口宽度">
      <button data-width="full" aria-pressed="true">全宽</button>
      <button data-width="1280" aria-pressed="false">1280px</button>
      <button data-width="390" aria-pressed="false">390px</button>
    </div>
    <label class="toggle">
      <input type="checkbox" id="baseline-toggle">
      <span>查看原版 (Baseline)</span>
    </label>
    <span class="hint">快捷键：1/2/3 场景 · L/D 浅深色 · B 原版</span>
  </header>
  <main id="stage">
    <iframe id="preview-frame" sandbox="" title="V2EX 主题预览"></iframe>
  </main>
  <script>
    const SHARED_STYLES = ${safeJsonForScript(sharedStyles)};
    const SKELETONS = ${safeJsonForScript(skeletons)};
    const THEME_CSS = ${safeJsonForScript(themeCss)};
    const THEME_NAME = ${safeJsonForScript(name)};
    const state = { scene: 'home', scheme: ${safeJsonForScript(defaultScheme)}, width: 'full', baseline: false };

    document.getElementById('theme-name').textContent = THEME_NAME;
    const frame = document.getElementById('preview-frame');
    const stage = document.getElementById('stage');
    const baselineToggle = document.getElementById('baseline-toggle');

    function buildDoc() {
      const isDark = state.scheme === 'dark';
      let html = SKELETONS[state.scene].replace(/<!--V2EX_SHARED_STYLE:(\\d+)-->/g, (_, i) => SHARED_STYLES[Number(i)]);
      html = html
        .replace(/(<html\\b[^>]*\\bdata-site-theme=")[^"]*(")/i, '$1' + state.scheme + '$2')
        .replace(/<style\\b([^>]*)\\bmedia="([^"]*prefers-color-scheme:\\s*dark[^"]*)"([^>]*)>/gi, (_, b, _m, a) => '<style' + b + 'media="' + (isDark ? 'screen' : 'not all') + '"' + a + '>')
        .replace(/<style\\b([^>]*)\\bmedia="([^"]*prefers-color-scheme:\\s*light[^"]*)"([^>]*)>/gi, (_, b, _m, a) => '<style' + b + 'media="' + (isDark ? 'not all' : 'all') + '"' + a + '>');
      if (isDark) {
        html = html.replace(/<div\\b([^>]*\\bid="Wrapper"[^>]*)>/i, (tag, attrs) =>
          /\\bclass="/i.test(attrs)
            ? tag.replace(/\\bclass="([^"]*)"/i, (_, c) => /\\bNight\\b/.test(c) ? 'class="' + c + '"' : 'class="' + c + ' Night"')
            : '<div' + attrs + ' class="Night">',
        );
      } else {
        html = html.replace(/<div\\b([^>]*\\bid="Wrapper"[^>]*)>/i, (tag) =>
          tag.replace(/\\bclass="([^"]*)"/i, (_, c) => 'class="' + c.replace(/\\bNight\\b/g, '').trim() + '"'),
        );
      }
      if (!state.baseline && THEME_CSS) {
        const safeCss = THEME_CSS.replace(/<(?=\\/style)/gi, '\\\\3c ');
        html = html.replace('</head>', () => '<style id="${THEME_STYLE_ID}">' + safeCss + '</style></head>');
      }
      return html;
    }

    function render() {
      for (const btn of document.querySelectorAll('[data-scene]')) btn.setAttribute('aria-pressed', String(btn.dataset.scene === state.scene));
      for (const btn of document.querySelectorAll('[data-scheme]')) btn.setAttribute('aria-pressed', String(btn.dataset.scheme === state.scheme));
      for (const btn of document.querySelectorAll('[data-width]')) btn.setAttribute('aria-pressed', String(btn.dataset.width === state.width));
      baselineToggle.checked = state.baseline;
      if (state.width === 'full') {
        stage.classList.remove('framed');
        frame.style.width = '100%';
      } else {
        stage.classList.add('framed');
        frame.style.width = state.width + 'px';
      }
      frame.srcdoc = buildDoc();
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      if (btn.dataset.scene) state.scene = btn.dataset.scene;
      if (btn.dataset.scheme) state.scheme = btn.dataset.scheme;
      if (btn.dataset.width) state.width = btn.dataset.width;
      render();
    });
    baselineToggle.addEventListener('change', () => { state.baseline = baselineToggle.checked; render(); });
    document.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '1') { state.scene = 'home'; render(); }
      else if (e.key === '2') { state.scene = 'topic'; render(); }
      else if (e.key === '3') { state.scene = 'settings'; render(); }
      else if (e.key.toLowerCase() === 'l') { state.scheme = 'light'; render(); }
      else if (e.key.toLowerCase() === 'd') { state.scheme = 'dark'; render(); }
      else if (e.key.toLowerCase() === 'b') { state.baseline = !state.baseline; render(); }
    });
    render();
  </script>
</body>
</html>
`
}

function buildShotMatrix(mode) {
  const schemes = mode === 'both' ? ['light', 'dark'] : [mode]
  const shots = []
  for (const { id: scene } of SCENES) {
    for (const colorScheme of schemes) {
      shots.push({
        name: `${scene}-${colorScheme}.png`,
        scene,
        colorScheme,
        width: 1280,
        height: 800,
      })
    }
  }
  shots.push({
    name: 'home-mobile.png',
    scene: 'home',
    colorScheme: schemes[0],
    width: 390,
    height: 844,
  })
  return shots
}

async function tryLoadPlaywright() {
  const candidates = []
  const cwdPkg = join(process.cwd(), 'package.json')
  if (existsSync(cwdPkg)) candidates.push(cwdPkg)
  candidates.push(import.meta.url)

  for (const base of candidates) {
    try {
      const req = createRequire(base)
      return req('playwright')
    } catch {}
  }
  try {
    return await import('playwright')
  } catch {
    return null
  }
}

function findLocalChrome(explicitPath) {
  const candidates = [
    explicitPath,
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    ...(process.platform === 'darwin'
      ? [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        ]
      : process.platform === 'win32'
        ? [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
          ]
        : [
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
          ]),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  if (process.platform !== 'win32') {
    for (const bin of ['google-chrome', 'chromium', 'chromium-browser']) {
      try {
        const found = execFileSync('which', [bin], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
        if (found) return found
      } catch {}
    }
  }
  return null
}

async function captureWithPlaywright(playwright, shots, themeCss, outDir) {
  const browser = await playwright.chromium.launch()
  const outputs = []
  try {
    for (const shot of shots) {
      const context = await browser.newContext({
        viewport: { width: shot.width, height: shot.height },
        deviceScaleFactor: 1,
        colorScheme: shot.colorScheme,
        reducedMotion: 'reduce',
        locale: 'zh-CN',
        offline: true,
      })
      await context.route('**/*', (route) => route.abort())
      const page = await context.newPage()
      const doc = buildSceneDocument(reconstructFixture(shot.scene), themeCss, {
        colorScheme: shot.colorScheme,
      })
      await page.setContent(doc, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      const outPath = join(outDir, shot.name)
      await page.screenshot({ path: outPath, animations: 'disabled' })
      outputs.push(outPath)
      await context.close()
    }
  } finally {
    await browser.close()
  }
  return outputs
}

function captureWithChrome(chromePath, shots, themeCss, outDir) {
  const tmpHtmlDir = join(outDir, '_scenes')
  mkdirSync(tmpHtmlDir, { recursive: true })
  const outputs = []
  for (const shot of shots) {
    const doc = buildSceneDocument(reconstructFixture(shot.scene), themeCss, {
      colorScheme: shot.colorScheme,
    })
    const htmlPath = join(tmpHtmlDir, `${shot.name}.html`)
    const outPath = join(outDir, shot.name)
    writeFileSync(htmlPath, doc, 'utf8')
    execFileSync(
      chromePath,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--hide-scrollbars',
        '--disable-background-networking',
        `--window-size=${shot.width},${shot.height}`,
        `--screenshot=${outPath}`,
        pathToFileURL(htmlPath).href,
      ],
      { stdio: 'ignore', timeout: 20_000 },
    )
    outputs.push(outPath)
  }
  return outputs
}

function openInBrowser(filePath) {
  try {
    const [cmd, args] =
      process.platform === 'darwin'
        ? ['open', [filePath]]
        : process.platform === 'win32'
          ? ['cmd', ['/c', 'start', '', filePath]]
          : ['xdg-open', [filePath]]
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore' })
    child.unref()
    return true
  } catch {
    return false
  }
}

function parseArgs(argv) {
  const opts = { css: '', name: '', mode: 'both', outDir: '', chrome: '', screenshots: true, open: true }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--css') opts.css = argv[++i] ?? ''
    else if (arg === '--name') opts.name = argv[++i] ?? ''
    else if (arg === '--mode') opts.mode = argv[++i] ?? 'both'
    else if (arg === '--out-dir') opts.outDir = argv[++i] ?? ''
    else if (arg === '--chrome') opts.chrome = argv[++i] ?? ''
    else if (arg === '--no-screenshots') opts.screenshots = false
    else if (arg === '--no-open') opts.open = false
  }
  return opts
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (!opts.css) {
    console.error('用法：node verify-theme.mjs --css <theme.css 路径> [--name <主题名>] [--mode both|light|dark] [--out-dir <输出目录>] [--no-screenshots] [--no-open]')
    process.exit(1)
  }
  if (!['both', 'light', 'dark'].includes(opts.mode)) {
    console.error(`参数 --mode "${opts.mode}" 无效，仅支持：both、light 或 dark。`)
    process.exit(1)
  }

  const cssPath = resolve(opts.css)
  const themeCss = readFileSync(cssPath, 'utf8')
  const inferredName = basename(cssPath) === 'theme.css' ? basename(dirname(cssPath)) : basename(cssPath, '.css')
  const name = opts.name || inferredName || 'custom-v2ex-theme'
  const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'theme'
  const outDir = resolve(opts.outDir || join(tmpdir(), 'v2ex-theme-verify', slug))
  mkdirSync(outDir, { recursive: true })

  const previewHtml = join(outDir, 'preview.html')
  writeFileSync(
    previewHtml,
    buildPreviewShell({ name, themeCss, defaultScheme: opts.mode === 'dark' ? 'dark' : 'light' }),
    'utf8',
  )

  let screenshotEngine = 'skipped'
  let screenshots = []
  let screenshotWarning = null

  if (opts.screenshots) {
    const shots = buildShotMatrix(opts.mode)
    const playwright = await tryLoadPlaywright()
    if (playwright) {
      try {
        screenshots = await captureWithPlaywright(playwright, shots, themeCss, outDir)
        screenshotEngine = 'playwright'
      } catch (err) {
        screenshotWarning = `Playwright 截图失败（${err.message}），正在尝试本机 Chromium。`
      }
    }
    if (screenshots.length === 0) {
      const chromePath = findLocalChrome(opts.chrome)
      if (chromePath) {
        try {
          screenshots = captureWithChrome(chromePath, shots, themeCss, outDir)
          screenshotEngine = 'chrome-headless'
          screenshotWarning = null
        } catch (err) {
          screenshotEngine = 'none'
          screenshotWarning = `本机 Chromium 截图失败（${err.message}），已降级为交互预览页。`
        }
      } else {
        screenshotEngine = 'none'
        screenshotWarning = '未找到 Playwright 或本机 Chrome/Chromium，已跳过自动截图并降级为交互预览页。'
      }
    }
  }

  const opened = opts.open ? openInBrowser(previewHtml) : false

  console.log(
    JSON.stringify(
      {
        name,
        cssPath,
        outDir,
        previewHtml,
        opened,
        screenshotEngine,
        screenshots,
        ...(screenshotWarning ? { screenshotWarning } : {}),
      },
      null,
      2,
    ),
  )
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
