import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

function fixture(name: string) {
  const html = readFileSync(`scripts/fixtures/${name}.html`, 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('V2EX 真实快照（首页 / 帖子详情 / 设置页）', () => {
  test('首页保留精简帖子列表、节点图与侧栏', () => {
    const home = fixture('v2ex-home')
    expect(home.querySelectorAll('#Main .cell.item')).toHaveLength(15)
    expect(home.querySelectorAll('[nodeavatar]').length).toBeGreaterThanOrEqual(4)
    expect(home.querySelector('#Top .site-nav')).not.toBeNull()
    expect(home.querySelector('#Logo')).not.toBeNull()
    expect(home.querySelector('#Rightbar > .box')).not.toBeNull()
  })

  test('帖子详情保留主题内容与精简楼中楼回复', () => {
    const topic = fixture('v2ex-topic')
    expect(topic.querySelector('.topic_content')).not.toBeNull()
    const replies = topic.querySelectorAll('.reply_content')
    expect(replies.length).toBeGreaterThanOrEqual(20)
    expect(replies.length).toBeLessThanOrEqual(30)
    expect(topic.querySelector('.reply-threads-d > .cell[data-depth="1"]')).not.toBeNull()
    expect(topic.querySelector('a.reply-strip')).not.toBeNull()
    expect(topic.querySelector('.badge.op')).not.toBeNull()
  })

  test('设置页保留选项结构与精简时区列表', () => {
    const settings = fixture('v2ex-settings')
    expect(settings.querySelectorAll('.onoffswitch').length).toBeGreaterThanOrEqual(6)
    expect(settings.querySelector('form')).not.toBeNull()
    expect(settings.querySelectorAll('select[name="timezone"] option').length).toBeLessThanOrEqual(12)
  })

  test.each(['v2ex-home', 'v2ex-topic', 'v2ex-settings'])('%s 不携带可执行内容、外部资源或账号字段', name => {
    const doc = fixture(name)
    expect(doc.querySelector('script, iframe, object, embed, link, base, [srcset], [nonce], input[type="password"]')).toBeNull()
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? ''
    expect(csp).toContain("default-src 'none'")
    expect(csp).toContain('font-src data: https://fonts.gstatic.com')
    expect(csp).toContain("form-action 'none'")
    expect(doc.querySelector('[data-uid]')).toBeNull()
    expect(doc.body.textContent ?? '').not.toMatch(/@(?!example\.com\b)[a-z0-9.-]+\.[a-z]{2,}/i)
    for (const el of doc.querySelectorAll('*')) {
      expect(el.getAttributeNames().filter(name => /^on|csrf|token|session/i.test(name))).toEqual([])
    }
  })

  test.each(['v2ex-home', 'v2ex-topic', 'v2ex-settings'])('%s 图片全为纯色占位、链接全部 inert', name => {
    const doc = fixture(name)
    const imgs = doc.querySelectorAll('img')
    expect(imgs.length).toBeGreaterThan(0)
    for (const img of imgs) {
      expect(img.matches('img.sample-avatar')).toBe(true)
      expect(img.getAttribute('src')).toMatch(/^data:image\/svg\+xml;base64,/)
    }
    expect(doc.querySelectorAll('a[href]').length).toBeGreaterThan(0)
    expect(doc.querySelectorAll('a[href]:not([inert])')).toHaveLength(0)
  })

  test('首页头像使用四色分配', () => {
    const home = fixture('v2ex-home')
    const tones = [...new Set([...home.querySelectorAll('img.sample-avatar')].map(img => img.className.match(/avatar-(\w+)/)?.[1]).filter(Boolean))].sort()
    expect(tones).toEqual(['blue', 'green', 'violet', 'warm'])
  })
})
