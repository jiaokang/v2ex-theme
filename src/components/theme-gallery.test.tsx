import { globSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { getLikeCounts, getThemeLike, setThemeLike } from '../likes'
import { routeTree } from '../routeTree.gen'

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

test('首页每张主题卡片都链接到对应详情，不再提供单选按钮', async () => {
  await renderRoute('/')
  expect(await screen.findByRole('heading', { level: 1, name: 'V2EX Theme Hub' })).toBeDefined()
  for (const { id, name, author, description } of themes) {
    const link = screen.getByRole('link', { name })
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

test('详情展示匹配的主题、首页离线场景和获取主题的导入代码', async () => {
  await renderRoute('/t/geist')
  expect(await screen.findByRole('heading', { level: 1, name: 'Geist' })).toBeDefined()
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
  expect(screen.getByRole('heading', { level: 2, name: '获取主题' })).toBeDefined()
  expect(screen.getByText(/@import url\(.+\/themes\/geist\/theme\.css\)/)).toBeDefined()
  expect(screen.getByRole('button', { name: '复制' })).toBeDefined()
  expect(screen.queryByRole('button', { name: '复制 CSS' })).toBeNull()
  expect(screen.queryByRole('link', { name: '下载 CSS' })).toBeNull()
})

test('点击复制会把 @import 语句写入剪贴板并提示', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  await renderRoute('/t/geist')
  await screen.findByRole('heading', { level: 1, name: 'Geist' })
  await userEvent.click(screen.getByRole('button', { name: '复制' }))
  expect(writeText).toHaveBeenCalledTimes(1)
  expect(writeText.mock.calls[0][0]).toContain('/themes/geist/theme.css')
  expect(await screen.findByText('已复制到剪贴板。')).toBeDefined()
})

test('无效主题显示未找到页面', async () => {
  await renderRoute('/t/no-such-test-theme')
  expect(await screen.findByRole('heading', { name: '找不到这个主题' })).toBeDefined()
})

test('首页按点赞数排序并展示计数，卡片上不能点赞', async () => {
  const [first, second, third] = themes
  vi.mocked(getLikeCounts).mockResolvedValue({ [third.id]: 7, [second.id]: 2 })
  await renderRoute('/')
  await screen.findByRole('heading', { level: 1, name: 'V2EX Theme Hub' })
  const order = within(document.querySelector('.theme-grid') as HTMLElement)
    .getAllByRole('link').map(link => link.getAttribute('href'))
  expect(order.slice(0, 3)).toEqual([`/t/${third.id}`, `/t/${second.id}`, `/t/${first.id}`])
  const likesOf = (name: string) => screen.getByRole('link', { name }).querySelector('.theme-card-likes')?.textContent
  expect(likesOf(third.name)).toBe('7 个赞')
  expect(likesOf(first.name)).toBe('0 个赞')
  expect(screen.getByText('按点赞数排序')).toBeDefined()
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
