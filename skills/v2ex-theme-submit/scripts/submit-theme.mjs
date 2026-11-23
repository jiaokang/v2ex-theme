#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DEFAULT_UPSTREAM_REPO = 'yuyinws/v2ex-theme'
export const DEFAULT_API_BASE = 'https://api.github.com'
export const MAX_CSS_BYTES = 200 * 1024
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export class SubmitError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'SubmitError'
    this.code = code
    this.details = details
  }
}

export function normalizeSlug(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

export function inferSlugFromPath(cssPath) {
  const abs = resolve(cssPath)
  const file = basename(abs, '.css')
  if (file.toLowerCase() === 'theme') {
    return normalizeSlug(basename(dirname(abs)))
  }
  return normalizeSlug(file)
}

export function titleFromSlug(slug) {
  return String(slug ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}

export function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

export function stripFontFaceBlocks(cssWithoutComments) {
  let out = ''
  let i = 0
  const lower = cssWithoutComments.toLowerCase()

  while (i < cssWithoutComments.length) {
    const idx = lower.indexOf('@font-face', i)
    if (idx === -1) {
      out += cssWithoutComments.slice(i)
      break
    }

    out += cssWithoutComments.slice(i, idx)
    const openBrace = cssWithoutComments.indexOf('{', idx)
    if (openBrace === -1) {
      out += cssWithoutComments.slice(idx)
      break
    }

    let depth = 0
    let j = openBrace
    for (; j < cssWithoutComments.length; j += 1) {
      const ch = cssWithoutComments[j]
      if (ch === '{') depth += 1
      else if (ch === '}') {
        depth -= 1
        if (depth === 0) {
          j += 1
          break
        }
      }
    }
    i = j
  }

  return out
}

export function validateSubmission({ slug, css, metadata = {} }) {
  const errors = []
  const normalizedSlug = String(slug ?? '').trim()

  if (!normalizedSlug) {
    errors.push('缺少主题目录标识（slug）。')
  } else if (normalizedSlug.length > 64 || !SLUG_RE.test(normalizedSlug)) {
    errors.push(
      `主题 slug「${normalizedSlug}」格式不合法：仅允许小写字母、数字和单个连字符（例如 "solarized-warm"），且长度不超过 64 个字符。`,
    )
  }

  if (typeof css !== 'string' || css.trim().length === 0) {
    errors.push('theme.css 内容为空。')
  } else {
    const byteLength = Buffer.byteLength(css, 'utf8')
    if (byteLength > MAX_CSS_BYTES) {
      errors.push(`theme.css 体积超出限制（当前 ${byteLength} 字节，最大允许 ${MAX_CSS_BYTES} 字节）。`)
    }

    if (/<\/style\b/i.test(css)) {
      errors.push('theme.css 不能包含闭合标签 </style>。')
    }
    if (/<script\b/i.test(css)) {
      errors.push('theme.css 不能包含 <script> 标签。')
    }

    const uncommented = stripCssComments(css)
    if (/@import\b/i.test(uncommented)) {
      errors.push('theme.css 不能使用 @import 引入外部样式表。')
    }

    const withoutFontFaces = stripFontFaceBlocks(uncommented)
    const externalUrlRe = /url\(\s*(['"]?)\s*((?:https?:|\/\/)[^)'"\s]+)\s*\1\s*\)/gi
    const externalMatches = [...withoutFontFaces.matchAll(externalUrlRe)].map((m) => m[2])
    if (externalMatches.length > 0) {
      const sample = externalMatches.slice(0, 3).join('、')
      errors.push(`theme.css 在 @font-face 之外不能引用外链资源（发现：${sample}）。`)
    }

    const insecureFontUrlRe = /url\(\s*(['"]?)\s*(http:\/\/[^)'"\s]+)\s*\1\s*\)/gi
    const insecureMatches = [...uncommented.matchAll(insecureFontUrlRe)].map((m) => m[2])
    if (insecureMatches.length > 0) {
      errors.push(`theme.css 中的外链必须使用 https://，不允许不安全的 http://（发现：${insecureMatches[0]}）。`)
    }
  }

  const name = String(metadata.name ?? '').trim()
  const author = String(metadata.author ?? '').trim()
  const description = String(metadata.description ?? '').trim()

  if (!name) errors.push('缺少主题名称（metadata.name）。')
  if (!author) errors.push('缺少主题作者（metadata.author）。')
  if (!description) errors.push('缺少一句话主题简介（metadata.description）。')

  return {
    valid: errors.length === 0,
    errors,
    metadata: { name, author, description },
    slug: normalizedSlug,
  }
}

export function formatThemeJson(metadata) {
  return `${JSON.stringify(
    {
      name: String(metadata.name).trim(),
      author: String(metadata.author).trim(),
      description: String(metadata.description).trim(),
    },
    null,
    2,
  )}\n`
}

export function readLocalThemeMetadata(cssPath) {
  const jsonPath = join(dirname(resolve(cssPath)), 'theme.json')
  if (!existsSync(jsonPath)) return { jsonPath, exists: false, data: null }
  const raw = readFileSync(jsonPath, 'utf8')
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new SubmitError('INVALID_THEME_JSON', `解析 ${jsonPath} 失败：${err.message}`, {
      jsonPath,
    })
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SubmitError('INVALID_THEME_JSON', `${jsonPath} 必须是一个 JSON 对象。`, { jsonPath })
  }
  return { jsonPath, exists: true, data: parsed }
}

export function resolveGitHubToken({ env = process.env, execSyncFn = execFileSync } = {}) {
  const envToken = (env.GITHUB_TOKEN || env.GH_TOKEN || '').trim()
  if (envToken) {
    return { token: envToken, source: env.GITHUB_TOKEN ? 'GITHUB_TOKEN' : 'GH_TOKEN' }
  }

  let hasGhCli = false
  try {
    execSyncFn('gh', ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    hasGhCli = true
  } catch {
    hasGhCli = false
  }

  if (hasGhCli) {
    try {
      const ghToken = execSyncFn('gh', ['auth', 'token'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
      if (ghToken) {
        return { token: ghToken, source: 'gh-cli' }
      }
    } catch {
      // 未登录时回落到下方的结构化引导错误
    }
  }

  const instructions = hasGhCli
    ? '请先在终端运行 `gh auth login` 登录 GitHub，或导出带 `public_repo` 权限的环境变量 `GITHUB_TOKEN` 后重试。'
    : '请先安装 GitHub CLI（例如 `brew install gh`）并运行 `gh auth login`，或导出带 `public_repo` 权限的环境变量 `GITHUB_TOKEN` 后重试。'

  throw new SubmitError('AUTH_REQUIRED', `需要先完成 GitHub 身份认证。${instructions}`, {
    hasGhCli,
    instructions,
  })
}

export function parseRepoSpec(repoSpec) {
  const parts = String(repoSpec ?? '').trim().split('/')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new SubmitError('INVALID_REPO', `仓库地址「${repoSpec}」格式不合法，应为 "owner/repo"。`)
  }
  return { owner: parts[0], repo: parts[1] }
}

export function createGitHubClient({ token, apiBase = DEFAULT_API_BASE, fetchImpl = fetch }) {
  const base = apiBase.replace(/\/+$/, '')

  return async function request(method, path, { body, allowStatuses = [] } = {}) {
    const url = path.startsWith('http') ? path : `${base}${path}`
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'v2ex-theme-submit-skill',
    }
    const init = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }

    const res = await fetchImpl(url, init)
    const text = await res.text()
    let data = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (res.ok || allowStatuses.includes(res.status)) {
      return { status: res.status, ok: res.ok, data }
    }

    const apiMsg =
      data && typeof data === 'object' && 'message' in data ? data.message : String(data || res.statusText)

    if (res.status === 401) {
      throw new SubmitError(
        'AUTH_INVALID',
        `GitHub 凭证无效或已过期（401：${apiMsg}）。请重新运行 \`gh auth login\` 或更新 \`GITHUB_TOKEN\`。`,
        { status: res.status, path },
      )
    }

    if (res.status === 403) {
      throw new SubmitError(
        'GITHUB_FORBIDDEN',
        `GitHub API 权限不足（403：${apiMsg}）。请确认凭证具备 \`public_repo\` 权限（或 fork / Pull Request 写入权限）。`,
        { status: res.status, path },
      )
    }

    throw new SubmitError('GITHUB_API_ERROR', `GitHub API 请求失败（${method} ${path}，状态码 ${res.status}）：${apiMsg}`, {
      status: res.status,
      path,
      response: data,
    })
  }
}

export function buildPrBody({ slug, metadata, isUpdate }) {
  const heading = isUpdate
    ? `更新 **${metadata.name}**（\`${slug}\`）V2EX 主题。`
    : `新增 **${metadata.name}**（\`${slug}\`）V2EX 主题。`

  return [
    heading,
    '',
    '### 主题信息',
    `- **Slug**：\`${slug}\``,
    `- **名称**：${metadata.name}`,
    `- **作者**：${metadata.author}`,
    `- **简介**：${metadata.description}`,
    '',
    '### 提交文件',
    `- \`public/themes/${slug}/theme.css\``,
    `- \`public/themes/${slug}/theme.json\``,
    '',
    '> 由 `v2ex-theme-submit` 提交。首页 `.webp` 样张由维护者在合入时通过 `npm run screenshots:themes` 生成。',
  ].join('\n')
}

function defaultTimestampSuffix(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1),
    pad(now.getUTCDate()),
    '-',
    pad(now.getUTCHours()),
    pad(now.getUTCMinutes()),
    pad(now.getUTCSeconds()),
  ].join('')
}

function defaultSleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

async function fetchUpstreamTheme(gh, { owner, repo, defaultBranch, slug }) {
  const jsonRes = await gh(
    'GET',
    `/repos/${owner}/${repo}/contents/public/themes/${encodeURIComponent(slug)}/theme.json?ref=${encodeURIComponent(defaultBranch)}`,
    { allowStatuses: [404] },
  )
  if (jsonRes.status === 200 && jsonRes.data && typeof jsonRes.data === 'object') {
    let parsed = null
    if (typeof jsonRes.data.content === 'string') {
      try {
        parsed = JSON.parse(Buffer.from(jsonRes.data.content, 'base64').toString('utf8'))
      } catch {
        parsed = null
      }
    }
    return { exists: true, theme: parsed }
  }

  const dirRes = await gh(
    'GET',
    `/repos/${owner}/${repo}/contents/public/themes/${encodeURIComponent(slug)}?ref=${encodeURIComponent(defaultBranch)}`,
    { allowStatuses: [404] },
  )
  if (dirRes.status === 200) {
    return { exists: true, theme: null }
  }

  return { exists: false, theme: null }
}

export async function preflightSubmission(
  {
    css,
    slug,
    metadata = {},
    upstreamRepo = DEFAULT_UPSTREAM_REPO,
    branch: requestedBranch,
    token,
    tokenSource = 'provided',
  },
  deps = {},
) {
  const { apiBase = DEFAULT_API_BASE, fetchImpl = fetch } = deps
  const { owner: upstreamOwner, repo: upstreamRepoName } = parseRepoSpec(upstreamRepo)
  const gh = createGitHubClient({ token, apiBase, fetchImpl })

  const userRes = await gh('GET', '/user')
  const login = userRes.data?.login
  if (!login) {
    throw new SubmitError('AUTH_INVALID', '无法从 GitHub `/user` 接口获取当前登录用户名。')
  }

  const repoRes = await gh('GET', `/repos/${upstreamOwner}/${upstreamRepoName}`)
  const defaultBranch = repoRes.data?.default_branch || 'main'
  const canPushUpstream = Boolean(repoRes.data?.permissions?.push)
  const targetOwner = canPushUpstream ? upstreamOwner : login

  const resolvedMetadata = {
    name: String(metadata.name ?? '').trim() || (slug ? titleFromSlug(slug) : ''),
    author: String(metadata.author ?? '').trim() || login,
    description: String(metadata.description ?? '').trim(),
  }

  const validation = validateSubmission({ slug, css, metadata: resolvedMetadata })
  const branch = requestedBranch?.trim() || (validation.slug ? `theme/${validation.slug}` : '')

  let upstreamExists = false
  let upstreamTheme = null
  let existingPr = null

  if (validation.slug && SLUG_RE.test(validation.slug)) {
    const upstreamCheck = await fetchUpstreamTheme(gh, {
      owner: upstreamOwner,
      repo: upstreamRepoName,
      defaultBranch,
      slug: validation.slug,
    })
    upstreamExists = upstreamCheck.exists
    upstreamTheme = upstreamCheck.theme

    if (branch) {
      const headQuery = `${targetOwner}:${branch}`
      const pullsRes = await gh(
        'GET',
        `/repos/${upstreamOwner}/${upstreamRepoName}/pulls?state=open&head=${encodeURIComponent(headQuery)}&base=${encodeURIComponent(defaultBranch)}`,
      )
      if (Array.isArray(pullsRes.data) && pullsRes.data.length > 0) {
        const pr = pullsRes.data[0]
        existingPr = {
          number: pr.number,
          url: pr.html_url,
          title: pr.title,
          headSha: pr.head?.sha || null,
          branch: pr.head?.ref || branch,
          headRepoOwner: pr.head?.repo?.owner?.login || targetOwner,
          headRepoName: pr.head?.repo?.name || upstreamRepoName,
        }
      }
    }
  }

  const action = existingPr
    ? 'update_open_pr'
    : upstreamExists
      ? 'update_existing_theme'
      : 'create_new_theme'

  return {
    ok: validation.valid,
    user: { login, tokenSource },
    upstream: {
      owner: upstreamOwner,
      repo: upstreamRepoName,
      defaultBranch,
      canPushUpstream,
    },
    targetOwner,
    willFork: !canPushUpstream,
    slug: validation.slug,
    branch,
    metadata: validation.metadata,
    files: validation.slug
      ? [`public/themes/${validation.slug}/theme.css`, `public/themes/${validation.slug}/theme.json`]
      : [],
    cssBytes: typeof css === 'string' ? Buffer.byteLength(css, 'utf8') : 0,
    upstreamExists,
    upstreamTheme,
    existingPr,
    action,
    validationErrors: validation.errors,
  }
}

async function ensureForkReady(gh, { upstreamOwner, upstreamRepo, defaultBranch, sleepFn, maxAttempts }) {
  const forkRes = await gh('POST', `/repos/${upstreamOwner}/${upstreamRepo}/forks`, {
    body: { default_branch_only: true },
  })
  const forkOwner = forkRes.data?.owner?.login
  const forkRepo = forkRes.data?.name || upstreamRepo
  if (!forkOwner) {
    throw new SubmitError('FORK_FAILED', 'GitHub 未返回 fork 仓库的所属账号信息。')
  }

  let refReady = false
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const refRes = await gh(
      'GET',
      `/repos/${forkOwner}/${forkRepo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
      { allowStatuses: [404, 409] },
    )
    if (refRes.status === 200 && refRes.data?.object?.sha) {
      refReady = true
      break
    }
    if (attempt < maxAttempts - 1) {
      await sleepFn(1500)
    }
  }

  if (!refReady) {
    throw new SubmitError(
      'FORK_NOT_READY',
      `GitHub 仍在初始化 fork 仓库 ${forkOwner}/${forkRepo}，请稍等几秒后重试。`,
      { forkOwner, forkRepo },
    )
  }

  const syncRes = await gh('POST', `/repos/${forkOwner}/${forkRepo}/merge-upstream`, {
    body: { branch: defaultBranch },
    allowStatuses: [409],
  })

  if (syncRes.status === 409) {
    throw new SubmitError(
      'FORK_SYNC_CONFLICT',
      `你的 fork 仓库 ${forkOwner}/${forkRepo} 的「${defaultBranch}」分支与上游 ${upstreamOwner}/${upstreamRepo} 存在冲突提交。请先在 GitHub 上同步或重置该分支后再重试。`,
      { forkOwner, forkRepo, defaultBranch },
    )
  }

  const updatedRef = await gh(
    'GET',
    `/repos/${forkOwner}/${forkRepo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
  )
  return {
    targetOwner: forkOwner,
    targetRepo: forkRepo,
    defaultBranchSha: updatedRef.data.object.sha,
  }
}

export async function submitTheme(
  {
    css,
    slug,
    metadata = {},
    upstreamRepo = DEFAULT_UPSTREAM_REPO,
    branch: requestedBranch,
    allowUpdate = false,
    token,
    tokenSource = 'provided',
  },
  deps = {},
) {
  const {
    apiBase = DEFAULT_API_BASE,
    fetchImpl = fetch,
    sleepFn = defaultSleep,
    forkPollAttempts = 15,
    timestampFn = defaultTimestampSuffix,
  } = deps

  const preflight = await preflightSubmission(
    { css, slug, metadata, upstreamRepo, branch: requestedBranch, token, tokenSource },
    { apiBase, fetchImpl },
  )

  if (preflight.validationErrors.length > 0) {
    throw new SubmitError(
      'VALIDATION_ERROR',
      `主题校验未通过：\n- ${preflight.validationErrors.join('\n- ')}`,
      { errors: preflight.validationErrors, preflight },
    )
  }

  if (preflight.upstreamExists && !allowUpdate && !preflight.existingPr) {
    const existingInfo = preflight.upstreamTheme
      ? `${preflight.upstreamTheme.name || preflight.slug}（作者：${preflight.upstreamTheme.author || '未知'}）`
      : preflight.slug
    throw new SubmitError(
      'SLUG_EXISTS',
      `上游仓库 ${upstreamRepo} 已存在同名主题「${preflight.slug}」：${existingInfo}。请更换新的 slug，或在确认要更新该主题后加上 --allow-update 重试。`,
      {
        slug: preflight.slug,
        upstreamTheme: preflight.upstreamTheme,
        preflight,
      },
    )
  }

  const gh = createGitHubClient({ token, apiBase, fetchImpl })
  const { owner: upstreamOwner, repo: upstreamRepoName, defaultBranch, canPushUpstream } = preflight.upstream

  let targetOwner
  let targetRepo
  let baseCommitSha
  let finalBranch = preflight.branch
  const updatingOpenPr = Boolean(preflight.existingPr)

  if (updatingOpenPr) {
    targetOwner = preflight.existingPr.headRepoOwner
    targetRepo = preflight.existingPr.headRepoName
    finalBranch = preflight.existingPr.branch
    const headRef = await gh(
      'GET',
      `/repos/${targetOwner}/${targetRepo}/git/ref/heads/${encodeURIComponent(finalBranch)}`,
    )
    baseCommitSha = headRef.data.object.sha
  } else if (canPushUpstream) {
    targetOwner = upstreamOwner
    targetRepo = upstreamRepoName
    const defaultRef = await gh(
      'GET',
      `/repos/${targetOwner}/${targetRepo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
    )
    baseCommitSha = defaultRef.data.object.sha
  } else {
    const fork = await ensureForkReady(gh, {
      upstreamOwner,
      upstreamRepo: upstreamRepoName,
      defaultBranch,
      sleepFn,
      maxAttempts: forkPollAttempts,
    })
    targetOwner = fork.targetOwner
    targetRepo = fork.targetRepo
    baseCommitSha = fork.defaultBranchSha
  }

  if (!updatingOpenPr) {
    const existingBranchRes = await gh(
      'GET',
      `/repos/${targetOwner}/${targetRepo}/git/ref/heads/${encodeURIComponent(finalBranch)}`,
      { allowStatuses: [404] },
    )
    if (existingBranchRes.status === 200) {
      finalBranch = `${finalBranch}-${timestampFn()}`
    }
  }

  const baseCommitRes = await gh('GET', `/repos/${targetOwner}/${targetRepo}/git/commits/${baseCommitSha}`)
  const baseTreeSha = baseCommitRes.data.tree.sha

  const cssPathInRepo = `public/themes/${preflight.slug}/theme.css`
  const jsonPathInRepo = `public/themes/${preflight.slug}/theme.json`
  const themeJsonContent = formatThemeJson(preflight.metadata)

  const [cssBlobRes, jsonBlobRes] = await Promise.all([
    gh('POST', `/repos/${targetOwner}/${targetRepo}/git/blobs`, {
      body: { content: css, encoding: 'utf-8' },
    }),
    gh('POST', `/repos/${targetOwner}/${targetRepo}/git/blobs`, {
      body: { content: themeJsonContent, encoding: 'utf-8' },
    }),
  ])

  const treeRes = await gh('POST', `/repos/${targetOwner}/${targetRepo}/git/trees`, {
    body: {
      base_tree: baseTreeSha,
      tree: [
        { path: cssPathInRepo, mode: '100644', type: 'blob', sha: cssBlobRes.data.sha },
        { path: jsonPathInRepo, mode: '100644', type: 'blob', sha: jsonBlobRes.data.sha },
      ],
    },
  })
  const newTreeSha = treeRes.data.sha

  if (newTreeSha === baseTreeSha) {
    return {
      ok: true,
      action: 'no_changes',
      slug: preflight.slug,
      metadata: preflight.metadata,
      targetRepo: `${targetOwner}/${targetRepo}`,
      branch: finalBranch,
      forked: targetOwner !== upstreamOwner,
      prUrl: preflight.existingPr?.url || null,
      prNumber: preflight.existingPr?.number || null,
      commitSha: baseCommitSha,
      files: [cssPathInRepo, jsonPathInRepo],
    }
  }

  const isUpdate = preflight.upstreamExists || updatingOpenPr
  const commitMessage = isUpdate
    ? `feat(theme): update ${preflight.metadata.name} (${preflight.slug})`
    : `feat(theme): add ${preflight.metadata.name} (${preflight.slug})`

  const commitRes = await gh('POST', `/repos/${targetOwner}/${targetRepo}/git/commits`, {
    body: {
      message: commitMessage,
      tree: newTreeSha,
      parents: [baseCommitSha],
    },
  })
  const newCommitSha = commitRes.data.sha

  if (updatingOpenPr) {
    await gh('PATCH', `/repos/${targetOwner}/${targetRepo}/git/refs/heads/${encodeURIComponent(finalBranch)}`, {
      body: { sha: newCommitSha, force: false },
    })
    return {
      ok: true,
      action: 'updated_pr',
      slug: preflight.slug,
      metadata: preflight.metadata,
      targetRepo: `${targetOwner}/${targetRepo}`,
      branch: finalBranch,
      forked: targetOwner !== upstreamOwner,
      prUrl: preflight.existingPr.url,
      prNumber: preflight.existingPr.number,
      commitSha: newCommitSha,
      files: [cssPathInRepo, jsonPathInRepo],
    }
  }

  await gh('POST', `/repos/${targetOwner}/${targetRepo}/git/refs`, {
    body: { ref: `refs/heads/${finalBranch}`, sha: newCommitSha },
  })

  const prTitle = preflight.upstreamExists
    ? `feat(theme): update ${preflight.metadata.name} theme`
    : `feat(theme): add ${preflight.metadata.name} theme`
  const prHead = targetOwner === upstreamOwner ? finalBranch : `${targetOwner}:${finalBranch}`

  const prPayload = {
    title: prTitle,
    head: prHead,
    base: defaultBranch,
    body: buildPrBody({ slug: preflight.slug, metadata: preflight.metadata, isUpdate: preflight.upstreamExists }),
  }
  if (targetOwner !== upstreamOwner) {
    prPayload.maintainer_can_modify = true
  }

  const prRes = await gh('POST', `/repos/${upstreamOwner}/${upstreamRepoName}/pulls`, {
    body: prPayload,
  })

  return {
    ok: true,
    action: 'created_pr',
    slug: preflight.slug,
    metadata: preflight.metadata,
    targetRepo: `${targetOwner}/${targetRepo}`,
    branch: finalBranch,
    forked: targetOwner !== upstreamOwner,
    prUrl: prRes.data.html_url,
    prNumber: prRes.data.number,
    commitSha: newCommitSha,
    files: [cssPathInRepo, jsonPathInRepo],
  }
}

export function parseArgs(argv) {
  const opts = {
    css: '',
    slug: '',
    name: '',
    author: '',
    description: '',
    repo: DEFAULT_UPSTREAM_REPO,
    branch: '',
    check: false,
    allowUpdate: false,
    writeMetadata: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--css') opts.css = argv[++i] ?? ''
    else if (arg === '--slug') opts.slug = argv[++i] ?? ''
    else if (arg === '--name') opts.name = argv[++i] ?? ''
    else if (arg === '--author') opts.author = argv[++i] ?? ''
    else if (arg === '--description') opts.description = argv[++i] ?? ''
    else if (arg === '--repo') opts.repo = argv[++i] ?? ''
    else if (arg === '--branch') opts.branch = argv[++i] ?? ''
    else if (arg === '--check') opts.check = true
    else if (arg === '--allow-update') opts.allowUpdate = true
    else if (arg === '--write-metadata') opts.writeMetadata = true
    else if (arg === '-h' || arg === '--help') opts.help = true
    else throw new SubmitError('INVALID_ARGS', `未知参数：${arg}`)
  }

  return opts
}

function usageText() {
  return `用法：submit-theme.mjs --css <theme.css 路径> [选项]

选项：
  --css <路径>            theme.css 文件路径（必填）
  --slug <slug>           主题目录标识（默认从所在目录或文件名推断）
  --name <名称>           主题展示名称（默认读取同目录 theme.json 或按 slug 生成）
  --author <作者>         主题作者（默认读取同目录 theme.json 或当前 GitHub 用户名）
  --description <简介>    一句话主题简介（默认读取同目录 theme.json）
  --repo <owner/repo>     目标仓库（默认：${DEFAULT_UPSTREAM_REPO}）
  --branch <分支名>       提交分支名（默认：theme/<slug>）
  --check                 仅执行只读预检（校验、认证与上游重名检查，不写入 GitHub）
  --allow-update          允许更新上游仓库中已存在的同名主题
  --write-metadata        提交后将规范化的 theme.json 写回本地 theme.css 同目录
  -h, --help              显示此帮助信息`
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help || !opts.css) {
    console.error(usageText())
    process.exit(opts.help ? 0 : 1)
  }

  const cssPath = resolve(opts.css)
  if (!existsSync(cssPath)) {
    throw new SubmitError('FILE_NOT_FOUND', `找不到 CSS 文件：${cssPath}`, { cssPath })
  }

  const css = readFileSync(cssPath, 'utf8')
  const localMeta = readLocalThemeMetadata(cssPath)
  const slug = opts.slug ? opts.slug.trim() : inferSlugFromPath(cssPath)
  const metadata = {
    name: opts.name || localMeta.data?.name || '',
    author: opts.author || localMeta.data?.author || '',
    description: opts.description || localMeta.data?.description || '',
  }

  const { token, source } = resolveGitHubToken()

  if (opts.check) {
    const result = await preflightSubmission({
      css,
      slug,
      metadata,
      upstreamRepo: opts.repo,
      branch: opts.branch,
      token,
      tokenSource: source,
    })
    console.log(
      JSON.stringify(
        {
          ...result,
          cssPath,
          localThemeJson: { path: localMeta.jsonPath, exists: localMeta.exists },
        },
        null,
        2,
      ),
    )
    return
  }

  const result = await submitTheme({
    css,
    slug,
    metadata,
    upstreamRepo: opts.repo,
    branch: opts.branch,
    allowUpdate: opts.allowUpdate,
    token,
    tokenSource: source,
  })

  if (opts.writeMetadata) {
    writeFileSync(localMeta.jsonPath, formatThemeJson(result.metadata), 'utf8')
  }

  console.log(
    JSON.stringify(
      {
        ...result,
        cssPath,
        localThemeJsonWritten: opts.writeMetadata ? localMeta.jsonPath : null,
      },
      null,
      2,
    ),
  )
}

const isEntrypoint =
  process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))

if (isEntrypoint) {
  main().catch((err) => {
    if (err instanceof SubmitError) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            code: err.code,
            message: err.message,
            ...err.details,
          },
          null,
          2,
        ),
      )
      process.exit(1)
    }
    console.error(err?.stack || String(err))
    process.exit(1)
  })
}
