import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'

const require = createRequire(join(process.cwd(), 'package.json'))
const { JSDOM, VirtualConsole } = require('jsdom')
const sharp = require('sharp')
const curl = promisify(execFile)

const output = new URL('./fixtures/', import.meta.url)

const SCENES = {
  home: {
    dir: join(homedir(), 'Desktop/v2ex-home-snap'),
    html: 'V2EX.html',
    files: 'V2EX_files',
    output: 'v2ex-home.html',
    title: 'V2EX · 首页样本',
  },
  topic: {
    dir: join(process.cwd(), 'v2ex-topic-detail-snap'),
    html: '帖子详情.html',
    files: '帖子详情_files',
    output: 'v2ex-topic.html',
    title: 'V2EX · 帖子详情样本',
  },
  settings: {
    dir: join(process.cwd(), 'v2ex-setting-snap'),
    html: 'V2EX › 设置.html',
    files: 'V2EX › 设置_files',
    output: 'v2ex-settings.html',
    title: 'V2EX · 设置样本',
  },
}

const assetPath = value => decodeURIComponent(basename(value.split(/[?#]/)[0]))
const cssUrl = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi
const palette = { warm: '#e5bf9f', blue: '#a5c6dc', green: '#c4d6ab', violet: '#cfc0db' }
const tones = Object.keys(palette)
const svgPlaceholder = (width, height, fill = 'none') =>
  'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${fill}"/></svg>`).toString('base64')
const isNodeAvatar = value => /^https:\/\/cdn\.v2ex\.com\/navatar\//.test(value)
const roots = root => [root, ...[...root.querySelectorAll('template')].flatMap(el => roots(el.content))]
const isPublicAsset = value => /^(?:\/static\/(?:img|fonts)\/|https:\/\/www\.v2ex\.com\/static\/(?:img|fonts)\/|https:\/\/fonts\.gstatic\.com\/s\/)/.test(value)
const documentCsp = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data: https://fonts.gstatic.com; base-uri 'none'; form-action 'none'; object-src 'none'"
const toCss = text => text.replace(/<(?=\/style)/gi, '\\3c ')

const USER_POOL = [
  'alex', 'momo', 'kyle', 'linus', 'sara', 'devon', 'nina', 'owen',
  'iris', 'hugo', 'vera', 'leo', 'maya', 'zane', 'claire', 'noah',
  'tina', 'eric', 'luna', 'reed', 'yuna', 'finn', 'cora', 'milo',
  'jade', 'ryan', 'ada', 'chen', 'kai', 'zoe', 'paul', 'hana',
  'eli', 'ren', 'max', 'ivy', 'sam', 'ben', 'qin', 'wu',
]

const SAMPLE_TITLES = [
  '周末写了一个极简的 macOS 菜单栏番茄钟工具，开源分享给大家',
  '大家平时都是怎么管理多台设备之间的 dotfiles 和终端配置的？',
  '把个人博客从 SSR 迁回纯静态构建之后，首屏加载直接进了 100ms',
  '关于 CSS Cascade Layers 的一点实践总结，样式覆盖终于不打架了',
  '2026 年了，写代码的主力外接显示器选 27 寸 4K 还是 5K 更舒服？',
  '做了一套低对比度暖纸色社区样式，长时间阅读眼睛轻松不少',
  '想请教一下：小团队做全栈项目，SQLite 上生产现在靠谱吗？',
  '分享一个纯前端离线运行的 JSON / YAML 对比与格式化小工具',
  '换了静音机械轴之后，办公室码字的幸福感提升太明显了',
  'Vitest + Playwright 做端到端视觉回归测试的一些踩坑记录',
  '大家在浏览器里收藏的那些小众但每天必用的效率网站有哪些？',
  '从零手写一个无依赖的快捷键管理器，顺便聊聊焦点陷阱的细节',
  '最近在整理书桌走线，求推荐好用的理线槽和桌面充电站',
  'TypeScript 6.0 升级体验：项目类型检查速度肉眼可见快了一截',
  '有没有轻量级的自托管 RSS 阅读器推荐？希望移动端体验也好',
  '记录一次排查浏览器内存泄漏的过程：原来是未清理的观察者',
  '咖啡新手入坑手冲两周，聊聊买过的器具里哪些最值、哪些吃灰',
  '在老款轻薄本上装了个轻量 Linux 发行版，当写作机意外好用',
  '设计系统里「1px 分割线」和「1.5px 控件边框」区分开后舒服太多',
  '独立开发半年小结：做好文档和默认体验比堆功能更重要',
  '求推荐一款支持离线搜索、启动快的跨平台本地笔记软件',
  '折腾了一晚上的家庭局域网 DNS 分流，终于稳定不掉线了',
  '聊一聊大家写代码时最喜欢用的等宽字体和行高配置',
  '用 Cloudflare Workers 搭了个个人图床和短链服务，基本零成本',
  '周末去公园散步拍了几张胶片风格照片，顺手写了个色调预设',
]

const SAMPLE_TOPIC_PARAGRAPHS = [
  '最近一直在整理日常使用的社区自定义样式，希望在不破坏原有信息密度的前提下，把阅读舒适度、对比度和字号层级再打磨得更顺眼一些。',
  '实际调整下来发现，最重要的其实是克制：保留清晰的主次层级和边界，让视线自然停留在帖子标题与回复正文上，而不是被各种花哨的阴影和装饰分散注意力。',
  '目前已经在首页、帖子详情和设置页几个高频页面上跑了一轮对照测试，欢迎大家体验后反馈在暗色模式、高分屏或者不同字号下的显示效果。',
]

const SAMPLE_REPLIES = [
  '这个思路很清爽，尤其是边框和留白的比例看着很舒服。',
  '感谢分享！刚在本地试了一下，长文阅读体验确实提升明显。',
  '赞同，与其加一堆装饰效果，不如先把基础排版和对比度做扎实。',
  '请问在 13 寸小屏笔记本上显示效果怎么样？侧栏会不会显得有点挤？',
  '已经收藏了，周末准备照着这个方案把自己的配置文件也整理一遍。',
  '等宽字体和正文字体的基线对齐这个细节很加分，强迫症表示极度舒适。',
  '之前也踩过类似的坑，后来统一用 CSS 变量管理语义色后好维护多了。',
  '支持一下，这种专注打磨细节的小工具和主题现在真的挺难得的。',
  '刚好最近在找类似方案，没想到这么巧就刷到了，晚上回去试试。',
  '提个小建议：代码块横向滚动的时候可以加一点内边距，避免文字贴边。',
  '实测 Safari 和 Chrome 下表现一致，滚动起来也非常跟手。',
  '用下来最喜欢的一点是整体很克制，看久了不会觉得刺眼。',
  '同款痛点！特别是切换不同页面时视觉一致性保持得很好。',
  '谢谢整理，顺便问一下图标库和字体的加载体积大概有多大？',
  '太实用了，先点赞收藏，等有空把旧样式替换掉。',
]

const themes = new Map(await Promise.all(['claude', 'geist', 'platinum'].map(async slug => [slug, await readFile(`public/themes/${slug}/theme.css`, 'utf8')])))
const cssAssets = new Map()
const idMap = new Map()
const idFor = value => {
  if (!idMap.has(value)) idMap.set(value, String(idMap.size + 100001))
  return idMap.get(value)
}

const userMap = new Map()
const userFor = raw => {
  const key = raw.trim().toLowerCase()
  if (!key) return USER_POOL[0]
  if (!userMap.has(key)) {
    const idx = userMap.size
    const base = USER_POOL[idx % USER_POOL.length]
    const suffix = idx >= USER_POOL.length ? String(Math.floor(idx / USER_POOL.length) + 1) : ''
    userMap.set(key, `${base}${suffix}`)
  }
  return userMap.get(key)
}

const memberFromHref = href => {
  const match = href?.match(/(?:^|\/\/(?:www\.)?v2ex\.com)\/member\/([^#/?]+)/i)
  return match ? decodeURIComponent(match[1]) : null
}

async function curlPublicAssets(names) {
  for (let i = 0; i < names.length; i += 10) {
    await Promise.all(names.slice(i, i + 10).map(async path => {
      if (cssAssets.has(path)) return
      const url = new URL(path, 'https://www.v2ex.com')
      url.hash = ''
      try {
        const { stdout } = await curl('curl', ['-fsS', '--max-time', '8', '--max-filesize', '2097152', url.href], { encoding: 'buffer', maxBuffer: 2_097_152 })
        const mime = ({ png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', eot: 'application/vnd.ms-fontobject' })[url.pathname.split('.').at(-1)]
        if (mime && stdout.length) cssAssets.set(path, `data:${mime};base64,${stdout.toString('base64')}`)
      } catch {}
    }))
  }
}

const rewriteCss = text => text.replace(cssUrl, (original, a, b, c) => {
  const value = (a ?? b ?? c).trim()
  if (/^(?:data:|#)/i.test(value)) return original
  if (isNodeAvatar(value)) return `url("${svgPlaceholder(24, 24, palette.green)}")`
  return cssAssets.has(value) ? `url("${cssAssets.get(value)}")` : 'url("data:,")'
})

function redactContent(doc, sceneKey) {
  for (const root of roots(doc.body)) {
    const comments = doc.createTreeWalker(root, 128)
    const nodes = []
    while (comments.nextNode()) nodes.push(comments.currentNode)
    nodes.forEach(node => node.remove())
  }

  const loggedInRaw = memberFromHref(doc.querySelector('#Top a[href*="/member/"]')?.getAttribute('href'))
  const loggedInFake = loggedInRaw ? userFor(loggedInRaw) : null

  // 1. Redact all member links & associated avatar alt/title attributes.
  for (const a of doc.querySelectorAll('a[href*="/member/"]')) {
    const rawUser = memberFromHref(a.getAttribute('href'))
    if (!rawUser) continue
    const fake = userFor(rawUser)
    if (a.textContent.trim()) a.textContent = fake
    for (const img of a.querySelectorAll('img')) {
      if (img.hasAttribute('alt')) img.setAttribute('alt', fake)
      if (img.hasAttribute('title')) img.setAttribute('title', fake)
    }
    if (a.hasAttribute('title')) a.setAttribute('title', fake)
  }

  // 2. Remove icon-only promo links in #Tabs (keep text tabs only) & redact topic titles.
  const tabs = doc.querySelector('#Tabs')
  if (tabs) {
    for (const img of tabs.querySelectorAll('img')) {
      ;(img.closest('a') ?? img).remove()
    }
    while (tabs.lastChild?.nodeType === 3 && !tabs.lastChild.nodeValue.trim()) {
      tabs.lastChild.remove()
    }
  }
  let titleIdx = 0
  for (const a of doc.querySelectorAll('.item_title a, #TopicsHot .item_hot_topic_title a')) {
    a.textContent = SAMPLE_TITLES[titleIdx++ % SAMPLE_TITLES.length]
  }

  // 3. Redact topic detail heading, body, subtles, and replies.
  if (sceneKey === 'topic') {
    const h1 = doc.querySelector('#Main .header h1')
    if (h1) h1.textContent = SAMPLE_TITLES[0]

    for (const body of doc.querySelectorAll('#Main .topic_content')) {
      body.textContent = ''
      for (const para of SAMPLE_TOPIC_PARAGRAPHS) {
        const p = doc.createElement('p')
        p.textContent = para
        body.append(p)
      }
    }

    let replyIdx = 0
    for (const reply of doc.querySelectorAll('.reply_content')) {
      const mention = reply.querySelector('a[href*="/member/"]')
      const mentionName = mention ? mention.textContent.trim() : null
      reply.textContent = ''
      if (mentionName) {
        reply.append('@')
        const link = doc.createElement('a')
        link.setAttribute('href', `/member/${mentionName}`)
        link.setAttribute('inert', '')
        link.textContent = mentionName
        reply.append(link, ' ')
      }
      reply.append(SAMPLE_REPLIES[replyIdx++ % SAMPLE_REPLIES.length])
    }
  }

  // 4. Redact personal form inputs & custom CSS textarea on settings/forms.
  for (const input of doc.querySelectorAll('input[type="hidden"]')) {
    input.remove()
  }
  for (const input of doc.querySelectorAll('input[type="text"], input[type="email"], input[type="url"]')) {
    if (input.hasAttribute('value')) input.setAttribute('value', '')
  }
  for (const textarea of doc.querySelectorAll('textarea')) {
    textarea.textContent = textarea.getAttribute('name') === 'my_css'
      ? '/* 在这里粘贴自定义主题 CSS */'
      : ''
  }

  // 5. Neutralize personal balance numbers while keeping currency icons.
  for (const area of doc.querySelectorAll('.balance_area')) {
    let n = 0
    const demoNums = ['2', '18', '64']
    for (const node of [...area.childNodes]) {
      if (node.nodeType === 3 && /\d/.test(node.nodeValue)) {
        node.nodeValue = node.nodeValue.replace(/\d+/g, () => demoNums[n++ % demoNums.length])
      }
    }
  }

  // 6. Redact any plain-text PII (logged-in username, email, member ID, verification timestamp).
  const loggedInPattern = loggedInRaw
    ? new RegExp(`\\b${loggedInRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    : null
  for (const root of roots(doc.body)) {
    const walker = doc.createTreeWalker(root, 4)
    while (walker.nextNode()) {
      const node = walker.currentNode
      if (!node.nodeValue.trim() || node.parentElement?.closest('style')) continue
      let text = node.nodeValue
      if (loggedInPattern && loggedInFake) text = text.replace(loggedInPattern, loggedInFake)
      text = text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, `${loggedInFake ?? 'alex'}@example.com`)
      text = text.replace(/第\s*\d+\s*号会员/g, '第 100001 号会员')
      text = text.replace(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{2}:\d{2}/g, '2024-06-01 12:00:00 +08:00')
      if (text !== node.nodeValue) node.nodeValue = text
    }
  }

  // 7. Sanitize all image alt/title attributes so no username leaks outside member links.
  for (const img of doc.querySelectorAll('img')) {
    if (img.hasAttribute('alt')) img.setAttribute('alt', 'avatar')
    if (img.hasAttribute('title')) img.removeAttribute('title')
  }
}

async function prepare(sceneKey, scene) {
  const assets = join(scene.dir, scene.files)
  const files = new Set(await readdir(assets))
  const raw = await readFile(join(scene.dir, scene.html), 'utf8')
  const parse = () => new JSDOM(raw, { virtualConsole: new VirtualConsole() }).window.document
  const d = parse()

  const css = await Promise.all([...d.querySelectorAll('link[rel=stylesheet]')]
    .map(e => [assetPath(e.getAttribute('href')), e.media])
    .filter(([f], i, all) => files.has(f) && all.findIndex(([other]) => other === f) === i)
    .map(async ([f, media]) => [await readFile(join(assets, f), 'utf8'), media]))
  assert.ok(css.length > 0)

  const templateAssets = roots(d).flatMap(root => [...root.querySelectorAll('[src], [style], [nodeavatar], style')].flatMap(el => [
    el.getAttribute('src'), el.getAttribute('nodeavatar'),
    ...[...(el.getAttribute('style') ?? (el.tagName === 'STYLE' ? el.textContent : '')).matchAll(cssUrl)].map(([, a, b, c]) => (a ?? b ?? c).trim()),
  ]).filter(Boolean))
  const names = [...new Set([...templateAssets, ...[...css.map(([text]) => text), ...themes.values()].flatMap(text => [...text.matchAll(cssUrl)]
    .map(([, a, b, c]) => (a ?? b ?? c).trim())
  )].filter(isPublicAsset))]
  await curlPublicAssets(names)
  assert.ok(cssAssets.has('/static/img/v2ex@2x.png'), `${scene.output}: 站标资源未取到`)

  const image = async value => {
    const file = assetPath(value)
    assert.ok(files.has(file), `${scene.output}: 图片文件缺失 ${file}`)
    const bytes = await readFile(join(assets, file))
    const { width, height } = bytes.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))
      ? { width: bytes[6] || 256, height: bytes[7] || 256 }
      : await sharp(bytes).metadata()
    assert.ok(width && height, `${scene.output}: 无法读取图片尺寸 ${file}`)
    return svgPlaceholder(width, height)
  }

  const images = new Map()
  for (const el of d.images) {
    const src = el.getAttribute('src')
    if (!images.has(src)) images.set(src, { src: await image(src), tone: tones[images.size % tones.length] })
  }

  const polish = doc => {
    for (const root of roots(doc)) {
      for (const el of root.querySelectorAll('script,link,iframe,object,embed,base,meta:not([charset]):not([name="viewport"]),foreignObject')) el.remove()
    }
    redactContent(doc, sceneKey)

    for (const el of roots(doc).flatMap(root => [...root.querySelectorAll('*')])) {
      for (const a of el.getAttributeNames()) {
        if (/^on|^(?:data-uid|nonce|ping|srcset|action|formaction|srcdoc|target|download|autofocus|contenteditable)$/i.test(a)) el.removeAttribute(a)
      }
      if (el.hasAttribute('src')) {
        const src = el.getAttribute('src')
        const sample = images.get(src)
        const img = sample?.src ?? cssAssets.get(src)
        if (el.tagName === 'IMG' && img) el.setAttribute('src', img)
        else el.removeAttribute('src')
        if (el.tagName === 'IMG' && sample) el.classList.add('sample-avatar', `avatar-${sample.tone}`)
      }
      if (el.hasAttribute('nodeavatar')) el.setAttribute('nodeavatar', svgPlaceholder(24, 24, palette.green))
      if (el.matches('style')) el.textContent = toCss(rewriteCss(el.textContent))
      if (el.matches('a,area')) {
        if (el.hasAttribute('href')) {
          const href = el.getAttribute('href')
          const member = memberFromHref(href)
          const match = href.match(/(?:^|\/\/(?:www\.)?v2ex\.com)(\/(?:t|go)\/)([^#/?]+)/i)
          if (member) {
            el.setAttribute('href', `/member/${userFor(member)}`)
          } else if (match) {
            el.setAttribute('href', `${match[1]}${idFor(match[2])}`)
          } else {
            el.setAttribute('href', /^\/(?:settings|notifications|new|pro|signin|signup|notes|planet)$/.test(href) ? href : '#')
          }
        }
        el.removeAttribute('xlink:href')
        el.setAttribute('inert', '')
      } else {
        for (const a of ['href', 'xlink:href']) if (el.hasAttribute(a) && !/^#[\w-]+$/.test(el.getAttribute(a))) el.removeAttribute(a)
      }
      if (el.hasAttribute('style')) el.setAttribute('style', rewriteCss(el.getAttribute('style')))
      if (el.hasAttribute('class')) el.setAttribute('class', el.getAttribute('class').replace(/\b(from_|hot_t_)(\d+)/g, (_, prefix, val) => prefix + idFor(val)))
      if (el.matches('input,button,select,textarea')) el.setAttribute('inert', '')
    }

    const csp = doc.createElement('meta')
    csp.httpEquiv = 'Content-Security-Policy'
    csp.content = documentCsp
    doc.head.prepend(csp)
    for (const [text, media] of css) {
      const style = doc.createElement('style')
      if (media) style.media = media
      style.textContent = toCss(rewriteCss(text))
      doc.head.append(style)
    }
    doc.title = scene.title
    return doc
  }

  const result = polish(d)
  assert.ok(d.images.length > 0, `${scene.output}: 没有图片`)
  assert.ok([...d.images].every(e => e.matches('img.sample-avatar') && e.src.startsWith('data:image/svg+xml;base64,')), `${scene.output}: 存在未占位的图片`)
  assert.equal(d.querySelectorAll('a[href]:not([inert]),script,[data-uid]').length, 0, `${scene.output}: 存在未脱敏的链接/脚本/账号字段`)

  const placeholders = Object.entries(palette).map(([tone, color]) => `img.sample-avatar.avatar-${tone}{background-color:${color}}`).join('\n')
  const html = '<!doctype html>\n' + result.documentElement.outerHTML.replace('</head>', () => `<style>${placeholders}</style></head>`)
  await writeFile(new URL(scene.output, output), html, { mode: 0o600 })
  const missing = names.filter(p => !cssAssets.has(p))
  console.log(`${scene.output}: CSS ${css.length} 份, 图片 ${d.images.length} 张, 公共资源 ${names.length - missing.length}/${names.length}${missing.length ? `, 未取到 ${missing.join(', ')}` : ''}`)
}

const targets = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES)
for (const name of targets) {
  if (!SCENES[name]) {
    console.error(`未知场景：${name}（可选：${Object.keys(SCENES).join(', ')}）`)
    process.exit(1)
  }
}
for (const name of targets) {
  await prepare(name, SCENES[name])
}
