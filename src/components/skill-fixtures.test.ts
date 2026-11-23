// @vitest-environment node
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'vitest'
import {
  buildPreviewShell,
  buildSceneDocument,
  reconstructFixture,
} from '../../skills/v2ex-theme/scripts/verify-theme.mjs'

describe('skills/v2ex-theme 分发包与同步一致性', () => {
  test.each(['home', 'topic', 'settings'])('内置去重 fixture (%s) 与 scripts/fixtures 完全一致', (scene) => {
    const expected = readFileSync(`scripts/fixtures/v2ex-${scene}.html`, 'utf8')
    const actual = reconstructFixture(scene)
    expect(actual).toBe(expected)
  })

  test('SKILL.md 包含正确 frontmatter 且引用的相对文件存在', () => {
    const skillMd = readFileSync('skills/v2ex-theme/SKILL.md', 'utf8')
    expect(skillMd).toMatch(/^---\n[\s\S]*name:\s*v2ex-theme[\s\S]*disable-model-invocation:\s*true[\s\S]*---/)
    expect(existsSync('skills/v2ex-theme/references/v2ex-selectors.md')).toBe(true)
    expect(existsSync('skills/v2ex-theme/scripts/verify-theme.mjs')).toBe(true)
  })

  test('buildSceneDocument 正确切换浅深色模式并注入主题 CSS', () => {
    const home = reconstructFixture('home')
    const darkDoc = buildSceneDocument(home, 'body { background: #111; }', { colorScheme: 'dark' })
    expect(darkDoc).toContain('data-site-theme="dark"')
    expect(darkDoc).toContain('id="v2ex-theme-override"')
    expect(darkDoc).toContain('body { background: #111; }')
    expect(darkDoc).toMatch(/<div[^>]*id="Wrapper"[^>]*class="[^"]*\bNight\b/)

    const baselineDoc = buildSceneDocument(home, 'body { background: #111; }', {
      colorScheme: 'light',
      baseline: true,
    })
    expect(baselineDoc).toContain('data-site-theme="light"')
    expect(baselineDoc).not.toContain('id="v2ex-theme-override"')
  })

  test('verify-theme.mjs CLI 在无截图无打开模式下产出可用单文件预览壳', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'v2ex-skill-test-'))
    try {
      const stdout = execFileSync(
        process.execPath,
        [
          'skills/v2ex-theme/scripts/verify-theme.mjs',
          '--css',
          'public/themes/claude/theme.css',
          '--name',
          'Claude',
          '--out-dir',
          outDir,
          '--no-screenshots',
          '--no-open',
        ],
        { encoding: 'utf8' },
      )
      const result = JSON.parse(stdout)
      expect(result.screenshotEngine).toBe('skipped')
      expect(existsSync(result.previewHtml)).toBe(true)
      const preview = readFileSync(result.previewHtml, 'utf8')
      expect(preview).toContain('data-scene="home"')
      expect(preview).toContain('data-scene="topic"')
      expect(preview).toContain('data-scene="settings"')
      expect(preview).toContain('id="baseline-toggle"')
      expect(preview).toContain('V2EX Claude')
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })

  test('buildPreviewShell 安全转义 CSS 中的闭合 style 标签', () => {
    const html = buildPreviewShell({
      name: 'Test',
      themeCss: '/* </style><script>alert(1)</script> */ body { color: red; }',
    })
    expect(html).not.toContain('</style><script>alert(1)</script>')
  })
})
