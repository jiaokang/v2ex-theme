import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

function fixture(name: string) {
  const html = readFileSync(`scripts/fixtures/${name}.html`, 'utf8')
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('V2EX 真实快照（首页 / 帖子详情 / 设置页）', () => {
  test('首页保留 50 条帖子、节点图与侧栏', () => {
    const home = fixture('v2ex-home')
    expect(home.querySelectorAll('#Main .cell.item')).toHaveLength(50)
    expect(home.querySelectorAll('[nodeavatar]').length).toBeGreaterThanOrEqual(8)
    expect(home.querySelector('#Top .site-nav')).not.toBeNull()
    expect(home.querySelector('#Logo')).not.toBeNull()
    expect(home.querySelector('#Rightbar > .box')).not.toBeNull()
  })

  test('帖子详情保留主题内容与 100 条回复', () => {
    const topic = fixture('v2ex-topic')
    expect(topic.querySelector('.topic_content')).not.toBeNull()
    expect(topic.querySelectorAll('.reply_content').length).toBeGreaterThanOrEqual(100)
  })

  test('设置页保留选项结构', () => {
    const settings = fixture('v2ex-settings')
    expect(settings.querySelectorAll('.onoffswitch').length).toBeGreaterThanOrEqual(6)
    expect(settings.querySelector('form')).not.toBeNull()
  })

  test.each(['v2ex-home', 'v2ex-topic', 'v2ex-settings'])('%s 不携带可执行内容、外部资源或账号字段', name => {
    const doc = fixture(name)
    expect(doc.querySelector('script, iframe, object, embed, link, base, [srcset], [nonce], input[type="password"]')).toBeNull()
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ?? ''
    expect(csp).toContain("default-src 'none'")
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

describe('V2EX 离线样本（个人主页）', () => {
  test('不携带可执行内容、外部资源或账号字段', () => {
    const doc = fixture('v2ex-profile')
    expect(doc.querySelector('script, iframe, object, embed, link, base, [srcset], [nonce], input[type="hidden"], input[type="password"]')).toBeNull()
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content')).toContain("form-action 'none'")
    for (const el of doc.querySelectorAll('*')) {
      expect(el.getAttributeNames().filter(name => /^on|csrf|token|session/i.test(name))).toEqual([])
      if (el.hasAttribute('src')) {
        expect(el.matches('img.avatar')).toBe(true)
        expect(el.getAttribute('src')).toBe('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')
      }
      if (el.hasAttribute('href')) {
        const href = el.getAttribute('href')!
        expect(href).toMatch(/^(?:#[\w-]*|\/(?:notifications|settings(?:\/[\w-]+)?))$/)
        if (href.startsWith('/')) expect(el.hasAttribute('inert')).toBe(true)
      }
    }
  })
})
