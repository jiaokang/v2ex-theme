import { globSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createAgent } from '@ui-sdk/react/agent'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getLikeCounts, getThemeLike, setThemeLike } from '../likes'
import { routeTree } from '../routeTree.gen'

const agent = createAgent()

vi.mock('../likes', () => ({
  RATE_LIMITED: 'RATE_LIMITED',
  getLikeCounts: vi.fn(),
  getThemeLike: vi.fn(),
  setThemeLike: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getLikeCounts).mockResolvedValue({})
  vi.mocked(getThemeLike).mockResolvedValue({ count: 0, liked: false })
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark', 'light')
  window.localStorage.clear()
  vi.restoreAllMocks()
  vi.mocked(getLikeCounts).mockReset()
  vi.mocked(getThemeLike).mockReset()
  vi.mocked(setThemeLike).mockReset()
})

const themes = globSync('*/theme.json', { cwd: 'public/themes' }).sort().map(file => {
  const { name, author, description } = JSON.parse(readFileSync(`public/themes/${file}`, 'utf8'))
  return { id: dirname(file), name, author, description }
})

async function renderRoute(path: string) {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
}

test('首页以 Landing Page 呈现查看主题与创作主题入口，并展示热门 Top 3 主题', async () => {
  await renderRoute('/')
  expect(await screen.findByRole('heading', { level: 1, name: /给你的 V2EX/ })).toBeDefined()

  const hero = document.querySelector('[data-home-hero="true"]') as HTMLElement
  const browseLink = within(hero).getByRole('link', { name: '查看主题' })
  const createLink = within(hero).getByRole('link', { name: '创作主题' })
  expect(browseLink.getAttribute('href')).toBe('/themes')
  expect(createLink.getAttribute('href')).toBe('/#create-theme')

  const featuredSection = document.querySelector('#featured-themes') as HTMLElement
  expect(within(featuredSection).getByRole('link', { name: `查看全部主题（${themes.length}）` }).getAttribute('href'))
    .toBe('/themes')

  const finalCta = document.querySelector('[data-final-cta="true"]') as HTMLElement
  expect(within(finalCta).getByRole('link', { name: '查看主题' }).getAttribute('href')).toBe('/themes')
  expect(within(finalCta).getByRole('link', { name: '创作主题' }).getAttribute('href')).toBe('/#create-theme')

  const grid = document.querySelector('.theme-grid') as HTMLElement
  const featuredLinks = within(grid).getAllByRole('link')
  expect(featuredLinks.length).toBe(Math.min(3, themes.length))
  for (const { id, name, author, description } of themes.slice(0, 3)) {
    const link = within(grid).getByRole('link', { name })
    const card = within(link)
    expect(link.getAttribute('href')).toBe(`/t/${id}`)
    expect(card.getByRole('img', { name: `${name} 主题的 V2EX 首页样张` }).getAttribute('src'))
      .toBe(`/theme-previews/${id}.webp`)
    expect(card.getByText(author, { exact: true })).toBeDefined()
    expect(card.getByText(description, { exact: true })).toBeDefined()
  }
  expect(screen.queryByRole('radio')).toBeNull()
  expect(document.querySelector('iframe')).toBeNull()
})

test('全部主题页展示所有主题卡片，按点赞数排序并在 D1 不可用时降级展示', async () => {
  const [first, second, third] = themes
  vi.mocked(getLikeCounts).mockResolvedValue({ [third.id]: 9, [second.id]: 4 })
  await renderRoute('/themes')
  expect(await screen.findByRole('heading', { level: 1, name: new RegExp(`全部主题\\s*${themes.length}`) })).toBeDefined()

  const grid = document.querySelector('.theme-grid') as HTMLElement
  const order = within(grid).getAllByRole('link').map(link => link.getAttribute('href'))
  expect(order.slice(0, 3)).toEqual([`/t/${third.id}`, `/t/${second.id}`, `/t/${first.id}`])
  for (const { id, name, author, description } of themes) {
    const link = within(grid).getByRole('link', { name })
    const card = within(link)
    expect(link.getAttribute('href')).toBe(`/t/${id}`)
    expect(card.getByRole('img', { name: `${name} 主题的 V2EX 首页样张` }).getAttribute('src'))
      .toBe(`/theme-previews/${id}.webp`)
    expect(card.getByText(author, { exact: true })).toBeDefined()
    expect(card.getByText(description, { exact: true })).toBeDefined()
  }
  expect(within(grid).getByRole('link', { name: third.name }).querySelector('.theme-card-likes')?.textContent)
    .toBe('9 个赞')
  expect(screen.queryByRole('radio')).toBeNull()
  expect(document.querySelector('iframe')).toBeNull()

  cleanup()
  vi.mocked(getLikeCounts).mockRejectedValue(new Error('no db'))
  await renderRoute('/themes')
  expect(await screen.findByRole('link', { name: themes[0].name })).toBeDefined()
  expect(screen.queryByText(/个赞/)).toBeNull()
})

test('首页支持切换精选主题预览、复制创作 Skill 命令及展开常见问题', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

  await renderRoute('/')
  await screen.findByRole('heading', { level: 1, name: /给你的 V2EX/ })

  const previewTabs = within(screen.getByRole('tablist', { name: '精选主题预览' }))
  const secondTheme = themes[1]
  await user.click(previewTabs.getByRole('tab', { name: secondTheme.name }))
  expect(previewTabs.getByRole('tab', { name: secondTheme.name, selected: true })).toBeDefined()
  expect(screen.getByRole('link', { name: `查看 ${secondTheme.name} 详情` }).getAttribute('href'))
    .toBe(`/t/${secondTheme.id}`)

  await user.click(screen.getByRole('button', { name: '复制安装命令' }))
  expect(writeText).toHaveBeenCalledWith('npx skills add yuyinws/v2ex-theme')
  expect(await screen.findByText('已复制安装命令。')).toBeDefined()

  const faqTrigger = screen.getByRole('button', { name: '主题更新后，我需要重新复制代码吗？' })
  expect(faqTrigger.getAttribute('aria-expanded')).toBe('false')
  await user.click(faqTrigger)
  expect(faqTrigger.getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText(/由 Cloudflare Workers 分发/)).toBeDefined()
})

test('Agent 可以发现并操作首页的预览标签、复制命令与常见问题手风琴', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

  await renderRoute('/')
  await screen.findByRole('heading', { level: 1, name: /给你的 V2EX/ })

  const components = agent
    .snapshot()
    .filter(entry => !entry.offPage && entry.component !== 'more')
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = components.map(entry => entry.label)
  for (const label of ['深色模式', '精选主题预览', '复制安装命令', '常见问题']) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const previewEntry = components.find(entry => entry.label === '精选主题预览')
  const secondTabLabel = previewEntry?.items?.[1]?.label
  expect(secondTabLabel).toBeTruthy()

  const faqEntry = components.find(entry => entry.label === '常见问题')
  const secondFaq = faqEntry?.items?.[1]
  expect(secondFaq?.value).toBeTruthy()
  expect(secondFaq?.label).toBeTruthy()

  const result = await agent.act({
    steps: [
      { ref: '精选主题预览', action: 'setValue', args: [secondTabLabel!] },
      { ref: '复制安装命令', action: 'press' },
      { ref: '常见问题', action: 'open', args: [secondFaq!.value] },
    ],
  })
  expect(result.ok, result.error?.message).toBe(true)
  expect(writeText).toHaveBeenCalledWith('npx skills add yuyinws/v2ex-theme')
  expect(screen.getByRole('tab', { name: secondTabLabel!, selected: true })).toBeDefined()
  expect(screen.getByRole('button', { name: secondFaq!.label! }).getAttribute('aria-expanded')).toBe('true')
})

test('详情展示匹配的主题、首页离线场景和获取主题按钮', async () => {
  await renderRoute('/t/geist')
  expect(await screen.findByRole('heading', { level: 1, name: 'Geist' })).toBeDefined()
  expect(screen.getByRole('link', { name: '全部主题' }).getAttribute('href')).toBe('/themes')
  const tabs = within(screen.getByRole('tablist', { name: '预览场景' }))
  expect(tabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['首页', '帖子详情', '设置页'])
  expect(tabs.getByRole('tab', { name: '首页', selected: true })).toBeDefined()
  const iframe = screen.getByTitle('Geist · 首页预览')
  expect(iframe.getAttribute('sandbox')).toBe('allow-same-origin')
  const srcDoc = iframe.getAttribute('srcdoc')!
  expect(srcDoc).toContain("default-src 'none'")
  expect(srcDoc).toContain('id="v2ex-theme-override"')
  const preview = new DOMParser().parseFromString(srcDoc, 'text/html')
  expect(preview.querySelector('a[href]')).not.toBeNull()
  expect(preview.querySelector('a:not([inert])')).toBeNull()
  await userEvent.click(screen.getByRole('checkbox', { name: '查看原版' }))
  expect(screen.getByRole('checkbox', { name: '查看原版' }).getAttribute('aria-checked')).toBe('true')
  expect(screen.getByTitle('原样 · 首页预览').getAttribute('srcdoc')).toBe(srcDoc)

  const trigger = screen.getByRole('button', { name: '获取主题' })
  expect(trigger.hasAttribute('aria-disabled')).toBe(false)
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(screen.queryByText(/@import url\(.+\/themes\/geist\/theme\.css\)/)).toBeNull()
  expect(screen.queryByRole('button', { name: '复制 CSS' })).toBeNull()
  expect(screen.queryByRole('link', { name: '下载 CSS' })).toBeNull()
})

test('点击获取主题打开弹窗，展示 CSS 代码、复制按钮和使用介绍并正确处理焦点与关闭', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

  await renderRoute('/t/geist')
  await screen.findByRole('heading', { level: 1, name: 'Geist' })

  const trigger = screen.getByRole('button', { name: '获取主题' })
  await user.click(trigger)

  const dialog = await screen.findByRole('dialog', { name: '获取主题' })
  const inside = within(dialog)
  expect(inside.getByText(/@import url\(.+\/themes\/geist\/theme\.css\)/)).toBeDefined()
  expect(inside.getByRole('heading', { level: 3, name: '如何使用' })).toBeDefined()
  const settingsLink = inside.getByRole('link', { name: 'https://www.v2ex.com/settings' })
  expect(settingsLink.getAttribute('href')).toBe('https://www.v2ex.com/settings')
  expect(settingsLink.getAttribute('target')).toBe('_blank')
  expect(inside.getByText(/勾选「使用自定义 CSS」/)).toBeDefined()
  expect(inside.getByText(/把上方 CSS 代码复制进去/)).toBeDefined()

  const copyButton = inside.getByRole('button', { name: '复制' })
  expect(document.activeElement).toBe(copyButton)

  await user.click(copyButton)
  expect(writeText).toHaveBeenCalledTimes(1)
  expect(writeText.mock.calls[0][0]).toContain('/themes/geist/theme.css')
  expect(await inside.findByText('已复制到剪贴板。')).toBeDefined()

  await user.click(inside.getByRole('button', { name: '关闭' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(trigger)

  await user.click(trigger)
  expect(await screen.findByRole('dialog', { name: '获取主题' })).toBeDefined()
  expect(screen.queryByText('已复制到剪贴板。')).toBeNull()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})

test('剪贴板写入失败时弹窗提示手动复制', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn().mockRejectedValue(new Error('denied'))
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

  await renderRoute('/t/geist')
  await screen.findByRole('heading', { level: 1, name: 'Geist' })
  await user.click(screen.getByRole('button', { name: '获取主题' }))
  const dialog = await screen.findByRole('dialog', { name: '获取主题' })

  await user.click(within(dialog).getByRole('button', { name: '复制' }))
  expect(await within(dialog).findByText('复制失败，请手动选择复制。')).toBeDefined()
})

test('Agent 可以发现并操作详情页的获取主题弹窗与复制动作', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

  await renderRoute('/t/geist')
  await screen.findByRole('heading', { level: 1, name: 'Geist' })

  const components = agent
    .snapshot()
    .filter(entry => !entry.offPage && entry.component !== 'more')
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy()
  }
  const labels = components.map(entry => entry.label)
  for (const label of ['获取主题', '点赞', '深色模式', '预览场景', '查看原版']) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label)
  }

  const openResult = await agent.act({
    steps: [{ ref: '获取主题', action: 'open' }],
  })
  expect(openResult.ok, openResult.error?.message).toBe(true)
  expect(await screen.findByRole('dialog', { name: '获取主题' })).toBeDefined()

  const copyResult = await agent.act({
    steps: [{ ref: '复制', action: 'press' }],
  })
  expect(copyResult.ok, copyResult.error?.message).toBe(true)
  expect(writeText).toHaveBeenCalledTimes(1)
  expect(writeText.mock.calls[0][0]).toContain('/themes/geist/theme.css')

  const closeResult = await agent.act({
    steps: [{ ref: '获取主题', action: 'close' }],
  })
  expect(closeResult.ok, closeResult.error?.message).toBe(true)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('无效主题显示未找到页面', async () => {
  await renderRoute('/t/no-such-test-theme')
  expect(await screen.findByRole('heading', { name: '找不到这个主题' })).toBeDefined()
})

test('首页按点赞数排序并展示计数，卡片上不能点赞', async () => {
  const [first, second, third] = themes
  vi.mocked(getLikeCounts).mockResolvedValue({ [third.id]: 7, [second.id]: 2 })
  await renderRoute('/')
  await screen.findByRole('heading', { level: 1, name: /给你的 V2EX/ })
  const grid = document.querySelector('.theme-grid') as HTMLElement
  const order = within(grid)
    .getAllByRole('link').map(link => link.getAttribute('href'))
  expect(order.slice(0, 3)).toEqual([`/t/${third.id}`, `/t/${second.id}`, `/t/${first.id}`])
  const likesOf = (name: string) => within(grid).getByRole('link', { name }).querySelector('.theme-card-likes')?.textContent
  expect(likesOf(third.name)).toBe('7 个赞')
  expect(likesOf(first.name)).toBe('0 个赞')
  expect(screen.queryByText('按点赞数排序')).toBeNull()
  expect(screen.queryByRole('button', { name: '点赞' })).toBeNull()
})

test('点赞服务不可用时首页照常展示，不显示计数', async () => {
  vi.mocked(getLikeCounts).mockRejectedValue(new Error('no db'))
  await renderRoute('/')
  expect(await screen.findByRole('link', { name: themes[0].name })).toBeDefined()
  expect(screen.queryByText('按点赞数排序')).toBeNull()
  expect(screen.queryByText(/个赞/)).toBeNull()
})

test('详情页可以点赞和取消，计数跟随服务端结果', async () => {
  vi.mocked(getThemeLike).mockResolvedValue({ count: 4, liked: false })
  vi.mocked(setThemeLike)
    .mockResolvedValueOnce({ count: 5, liked: true })
    .mockResolvedValueOnce({ count: 4, liked: false })
  await renderRoute('/t/geist')
  const like = await screen.findByRole('button', { name: '点赞' })
  expect(vi.mocked(getThemeLike)).toHaveBeenCalledWith({ data: { slug: 'geist' } })
  expect(like.getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByText('共 4 个赞')).toBeDefined()
  await userEvent.click(like)
  expect(vi.mocked(setThemeLike)).toHaveBeenLastCalledWith({ data: { slug: 'geist', liked: true } })
  expect(like.getAttribute('aria-pressed')).toBe('true')
  expect(await screen.findByText('共 5 个赞')).toBeDefined()
  await userEvent.click(like)
  expect(vi.mocked(setThemeLike)).toHaveBeenLastCalledWith({ data: { slug: 'geist', liked: false } })
  expect(await screen.findByText('共 4 个赞')).toBeDefined()
  expect(like.getAttribute('aria-pressed')).toBe('false')
})

test('点赞被限流时回滚并提示', async () => {
  vi.mocked(getThemeLike).mockResolvedValue({ count: 1, liked: false })
  vi.mocked(setThemeLike).mockRejectedValue(new Error('RATE_LIMITED'))
  await renderRoute('/t/geist')
  const like = await screen.findByRole('button', { name: '点赞' })
  await userEvent.click(like)
  expect(await screen.findByText('操作太频繁，请稍后再试。')).toBeDefined()
  expect(like.getAttribute('aria-pressed')).toBe('false')
  expect(screen.getByText('共 1 个赞')).toBeDefined()
})

test('右上角深色模式按钮可切换站点深浅色并持久化', async () => {
  await renderRoute('/')
  const toggle = await screen.findByRole('button', { name: '深色模式' })
  expect(toggle.getAttribute('aria-pressed')).toBe('false')
  await userEvent.click(toggle)
  expect(toggle.getAttribute('aria-pressed')).toBe('true')
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(window.localStorage.getItem('v2ex-theme-hub:color-mode')).toBe('dark')
  await userEvent.click(toggle)
  expect(toggle.getAttribute('aria-pressed')).toBe('false')
  expect(document.documentElement.classList.contains('light')).toBe(true)
  expect(window.localStorage.getItem('v2ex-theme-hub:color-mode')).toBe('light')
})
