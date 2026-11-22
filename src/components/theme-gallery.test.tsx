import { globSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { routeTree } from '../routeTree.gen'

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('dark', 'light')
  window.localStorage.clear()
  vi.restoreAllMocks()
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
