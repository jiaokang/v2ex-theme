// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  SubmitError,
  formatThemeJson,
  inferSlugFromPath,
  preflightSubmission,
  resolveGitHubToken,
  submitTheme,
  validateSubmission,
} from '../../skills/v2ex-theme-submit/scripts/submit-theme.mjs'

function createMockFetch(routes) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    const method = (init.method || 'GET').toUpperCase()
    const path = new URL(url).pathname + new URL(url).search
    const body = init.body ? JSON.parse(init.body) : undefined
    calls.push({ method, path, body })

    const key = `${method} ${path}`
    const handler = routes[key] ?? routes[`${method} ${new URL(url).pathname}`]
    if (!handler) {
      throw new Error(`Unexpected GitHub API call: ${key}`)
    }
    const res = typeof handler === 'function' ? await handler({ method, path, body, calls }) : handler
    const status = res.status ?? 200
    const payload = res.body ?? {}
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      async text() {
        return typeof payload === 'string' ? payload : JSON.stringify(payload)
      },
    }
  }
  return { fetchImpl, calls }
}

describe('skills/v2ex-theme-submit 分发包与校验逻辑', () => {
  test('SKILL.md frontmatter 与脚本文件完整', () => {
    const skillMd = readFileSync('skills/v2ex-theme-submit/SKILL.md', 'utf8')
    expect(skillMd).toMatch(
      /^---\n[\s\S]*name:\s*v2ex-theme-submit[\s\S]*disable-model-invocation:\s*true[\s\S]*---/,
    )
    expect(existsSync('skills/v2ex-theme-submit/scripts/submit-theme.mjs')).toBe(true)
  })

  test('现有仓库内所有主题均通过静态校验', () => {
    for (const slug of ['claude', 'geist', 'platinum']) {
      const css = readFileSync(`public/themes/${slug}/theme.css`, 'utf8')
      const metadata = JSON.parse(readFileSync(`public/themes/${slug}/theme.json`, 'utf8'))
      const result = validateSubmission({ slug, css, metadata })
      expect(result.valid, `${slug}: ${result.errors.join('; ')}`).toBe(true)
    }
  })

  test('静态校验阻断非法 slug、@import、外链图片与脚本标签，同时放行 @font-face https 字体', () => {
    const validWithFont = validateSubmission({
      slug: 'warm-paper',
      css: `
        /* @import url("https://ignored-in-comment.example/a.css"); */
        @font-face {
          font-family: "Custom";
          src: url("https://fonts.gstatic.com/s/test.woff2") format("woff2");
        }
        body { background: #fff; background-image: url("data:image/svg+xml,%3Csvg/%3E"); }
      `,
      metadata: { name: 'Warm Paper', author: 'alice', description: '暖色纸感主题。' },
    })
    expect(validWithFont.valid).toBe(true)

    const invalid = validateSubmission({
      slug: 'Bad_Slug!',
      css: `
        @import url("https://evil.example/a.css");
        body { background: url("https://evil.example/bg.png"); }
        /* </style><script>alert(1)</script> */
      `,
      metadata: { name: '', author: 'alice', description: '   ' },
    })
    expect(invalid.valid).toBe(false)
    expect(invalid.errors.join('\n')).toContain('格式不合法')
    expect(invalid.errors.join('\n')).toContain('@import')
    expect(invalid.errors.join('\n')).toContain('不能引用外链资源')
    expect(invalid.errors.join('\n')).toContain('</style>')
    expect(invalid.errors.join('\n')).toContain('<script>')
    expect(invalid.errors.join('\n')).toContain('metadata.name')
    expect(invalid.errors.join('\n')).toContain('metadata.description')
  })

  test('inferSlugFromPath 与 resolveGitHubToken 行为正确', () => {
    expect(inferSlugFromPath('/tmp/my-cool-theme/theme.css')).toBe('my-cool-theme')
    expect(inferSlugFromPath('/tmp/Solarized_Dark.css')).toBe('solarized-dark')

    expect(resolveGitHubToken({ env: { GITHUB_TOKEN: 'tok_env' } })).toEqual({
      token: 'tok_env',
      source: 'GITHUB_TOKEN',
    })
    expect(
      resolveGitHubToken({
        env: {},
        execSyncFn: (_cmd, args) => (args[0] === '--version' ? 'gh version 2.0' : 'tok_gh\n'),
      }),
    ).toEqual({
      token: 'tok_gh',
      source: 'gh-cli',
    })
    expect(() =>
      resolveGitHubToken({
        env: {},
        execSyncFn: () => {
          throw new Error('not found')
        },
      }),
    ).toThrow(SubmitError)
  })
})

describe('submitTheme GitHub API 提交流程', () => {
  const sampleCss = 'body { background: #faf8f5; color: #1f1f1f; }\n'
  const sampleMeta = { name: 'Warm Sand', author: 'octocat', description: '温暖沙色极简主题。' }

  test('外部贡献者无需提前 fork：自动创建并同步 fork、单 commit 写入双文件并开跨仓库 PR', async () => {
    let forkPollCount = 0
    const { fetchImpl, calls } = createMockFetch({
      'GET /user': { body: { login: 'octocat' } },
      'GET /repos/yuyinws/v2ex-theme': {
        body: { default_branch: 'main', permissions: { push: false } },
      },
      'GET /repos/yuyinws/v2ex-theme/contents/public/themes/warm-sand/theme.json?ref=main': {
        status: 404,
      },
      'GET /repos/yuyinws/v2ex-theme/contents/public/themes/warm-sand?ref=main': { status: 404 },
      'GET /repos/yuyinws/v2ex-theme/pulls?state=open&head=octocat%3Atheme%2Fwarm-sand&base=main': {
        body: [],
      },
      'POST /repos/yuyinws/v2ex-theme/forks': {
        status: 202,
        body: { owner: { login: 'octocat' }, name: 'v2ex-theme' },
      },
      'GET /repos/octocat/v2ex-theme/git/ref/heads/main': () => {
        forkPollCount += 1
        if (forkPollCount === 1) return { status: 404 }
        return { body: { object: { sha: 'sha-fork-main' } } }
      },
      'POST /repos/octocat/v2ex-theme/merge-upstream': {
        body: { message: 'Successfully fetched and fast-forwarded' },
      },
      'GET /repos/octocat/v2ex-theme/git/ref/heads/theme%2Fwarm-sand': { status: 404 },
      'GET /repos/octocat/v2ex-theme/git/commits/sha-fork-main': {
        body: { tree: { sha: 'sha-base-tree' } },
      },
      'POST /repos/octocat/v2ex-theme/git/blobs': ({ body }) => ({
        status: 201,
        body: { sha: body.content.includes('Warm Sand') ? 'sha-json-blob' : 'sha-css-blob' },
      }),
      'POST /repos/octocat/v2ex-theme/git/trees': { status: 201, body: { sha: 'sha-new-tree' } },
      'POST /repos/octocat/v2ex-theme/git/commits': { status: 201, body: { sha: 'sha-new-commit' } },
      'POST /repos/octocat/v2ex-theme/git/refs': { status: 201, body: { ref: 'refs/heads/theme/warm-sand' } },
      'POST /repos/yuyinws/v2ex-theme/pulls': {
        status: 201,
        body: { number: 42, html_url: 'https://github.com/yuyinws/v2ex-theme/pull/42' },
      },
    })

    const res = await submitTheme(
      { css: sampleCss, slug: 'warm-sand', metadata: sampleMeta, token: 'tok' },
      { fetchImpl, sleepFn: async () => {}, forkPollAttempts: 3 },
    )

    expect(res).toMatchObject({
      ok: true,
      action: 'created_pr',
      forked: true,
      targetRepo: 'octocat/v2ex-theme',
      branch: 'theme/warm-sand',
      prNumber: 42,
      prUrl: 'https://github.com/yuyinws/v2ex-theme/pull/42',
      commitSha: 'sha-new-commit',
      files: ['public/themes/warm-sand/theme.css', 'public/themes/warm-sand/theme.json'],
    })

    const treeCall = calls.find((c) => c.path === '/repos/octocat/v2ex-theme/git/trees')
    expect(treeCall.body.tree).toEqual([
      { path: 'public/themes/warm-sand/theme.css', mode: '100644', type: 'blob', sha: 'sha-css-blob' },
      { path: 'public/themes/warm-sand/theme.json', mode: '100644', type: 'blob', sha: 'sha-json-blob' },
    ])

    const prCall = calls.find((c) => c.method === 'POST' && c.path === '/repos/yuyinws/v2ex-theme/pulls')
    expect(prCall.body.head).toBe('octocat:theme/warm-sand')
    expect(prCall.body.base).toBe('main')
    expect(prCall.body.maintainer_can_modify).toBe(true)
  })

  test('上游已有同名 slug 时默认拦截并返回现有 theme.json，携带 --allow-update 才放行更新 PR', async () => {
    const existingJson = formatThemeJson({
      name: 'Claude',
      author: 'yuyinws',
      description: '暖纸色、细边框与柔和圆角。',
    })

    const { fetchImpl, calls } = createMockFetch({
      'GET /user': { body: { login: 'yuyinws' } },
      'GET /repos/yuyinws/v2ex-theme': {
        body: { default_branch: 'main', permissions: { push: true } },
      },
      'GET /repos/yuyinws/v2ex-theme/contents/public/themes/claude/theme.json?ref=main': {
        body: { content: Buffer.from(existingJson, 'utf8').toString('base64') },
      },
      'GET /repos/yuyinws/v2ex-theme/pulls?state=open&head=yuyinws%3Atheme%2Fclaude&base=main': {
        body: [],
      },
      'GET /repos/yuyinws/v2ex-theme/git/ref/heads/main': { body: { object: { sha: 'sha-main' } } },
      'GET /repos/yuyinws/v2ex-theme/git/ref/heads/theme%2Fclaude': {
        body: { object: { sha: 'sha-stale-branch' } },
      },
      'GET /repos/yuyinws/v2ex-theme/git/commits/sha-main': { body: { tree: { sha: 'sha-tree' } } },
      'POST /repos/yuyinws/v2ex-theme/git/blobs': { status: 201, body: { sha: 'sha-blob' } },
      'POST /repos/yuyinws/v2ex-theme/git/trees': { status: 201, body: { sha: 'sha-tree-2' } },
      'POST /repos/yuyinws/v2ex-theme/git/commits': { status: 201, body: { sha: 'sha-commit-2' } },
      'POST /repos/yuyinws/v2ex-theme/git/refs': { status: 201, body: {} },
      'POST /repos/yuyinws/v2ex-theme/pulls': {
        status: 201,
        body: { number: 55, html_url: 'https://github.com/yuyinws/v2ex-theme/pull/55' },
      },
    })

    const preflight = await preflightSubmission(
      { css: sampleCss, slug: 'claude', metadata: sampleMeta, token: 'tok' },
      { fetchImpl },
    )
    expect(preflight.upstreamExists).toBe(true)
    expect(preflight.upstreamTheme).toEqual({
      name: 'Claude',
      author: 'yuyinws',
      description: '暖纸色、细边框与柔和圆角。',
    })
    expect(preflight.willFork).toBe(false)

    await expect(
      submitTheme({ css: sampleCss, slug: 'claude', metadata: sampleMeta, token: 'tok' }, { fetchImpl }),
    ).rejects.toMatchObject({ code: 'SLUG_EXISTS' })

    const updated = await submitTheme(
      { css: sampleCss, slug: 'claude', metadata: sampleMeta, allowUpdate: true, token: 'tok' },
      { fetchImpl, timestampFn: () => '20261123-140000' },
    )
    expect(updated).toMatchObject({
      ok: true,
      action: 'created_pr',
      forked: false,
      targetRepo: 'yuyinws/v2ex-theme',
      branch: 'theme/claude-20261123-140000',
      prNumber: 55,
    })
    expect(calls.some((c) => c.path.endsWith('/forks'))).toBe(false)
  })

  test('同名分支已有开放中 PR 时自动追加提交更新该 PR，不新建重复 PR', async () => {
    const { fetchImpl, calls } = createMockFetch({
      'GET /user': { body: { login: 'octocat' } },
      'GET /repos/yuyinws/v2ex-theme': {
        body: { default_branch: 'main', permissions: { push: false } },
      },
      'GET /repos/yuyinws/v2ex-theme/contents/public/themes/warm-sand/theme.json?ref=main': {
        status: 404,
      },
      'GET /repos/yuyinws/v2ex-theme/contents/public/themes/warm-sand?ref=main': { status: 404 },
      'GET /repos/yuyinws/v2ex-theme/pulls?state=open&head=octocat%3Atheme%2Fwarm-sand&base=main': {
        body: [
          {
            number: 42,
            html_url: 'https://github.com/yuyinws/v2ex-theme/pull/42',
            title: 'feat(theme): add Warm Sand theme',
            head: {
              sha: 'sha-pr-head',
              ref: 'theme/warm-sand',
              repo: { owner: { login: 'octocat' }, name: 'v2ex-theme' },
            },
          },
        ],
      },
      'GET /repos/octocat/v2ex-theme/git/ref/heads/theme%2Fwarm-sand': {
        body: { object: { sha: 'sha-pr-head' } },
      },
      'GET /repos/octocat/v2ex-theme/git/commits/sha-pr-head': {
        body: { tree: { sha: 'sha-pr-tree' } },
      },
      'POST /repos/octocat/v2ex-theme/git/blobs': { status: 201, body: { sha: 'sha-blob' } },
      'POST /repos/octocat/v2ex-theme/git/trees': { status: 201, body: { sha: 'sha-pr-tree-2' } },
      'POST /repos/octocat/v2ex-theme/git/commits': { status: 201, body: { sha: 'sha-pr-head-2' } },
      'PATCH /repos/octocat/v2ex-theme/git/refs/heads/theme%2Fwarm-sand': { body: {} },
    })

    const res = await submitTheme(
      { css: sampleCss, slug: 'warm-sand', metadata: sampleMeta, token: 'tok' },
      { fetchImpl },
    )

    expect(res).toMatchObject({
      ok: true,
      action: 'updated_pr',
      prNumber: 42,
      prUrl: 'https://github.com/yuyinws/v2ex-theme/pull/42',
      commitSha: 'sha-pr-head-2',
    })
    expect(calls.some((c) => c.method === 'POST' && c.path.endsWith('/pulls'))).toBe(false)
    expect(calls.some((c) => c.method === 'PATCH' && c.path.includes('theme%2Fwarm-sand'))).toBe(true)
  })
})
