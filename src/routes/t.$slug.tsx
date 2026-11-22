import { useEffect, useState } from 'react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Button } from '@ui-sdk/react/button'
import ArrowLeft from 'lucide-react/icons/arrow-left'
import Check from 'lucide-react/icons/check'
import Copy from 'lucide-react/icons/copy'
import { LikeButton } from '../components/like-button'
import { ThemePreview } from '../components/theme-preview'
import { getThemeLike } from '../likes'
import { siteName } from '../site'
import { themes } from '../themes'

const themeStyles = import.meta.glob<string>('../../public/themes/*/theme.css', {
  query: '?raw',
  import: 'default',
})

export const Route = createFileRoute('/t/$slug')({
  loader: async ({ params: { slug } }) => {
    const theme = themes.find(({ id }) => id === slug)
    if (!theme) throw notFound()
    const getCss = themeStyles[`../../public/themes/${theme.id}/theme.css`]
    if (!getCss) throw notFound()
    const [css, like] = await Promise.all([
      getCss(),
      getThemeLike({ data: { slug: theme.id } }).catch(() => null),
    ])
    return { theme, css, like }
  },
  head: ({ loaderData }) => loaderData ? {
    meta: [
      { title: `${loaderData.theme.name} · ${siteName}` },
      { name: 'description', content: loaderData.theme.description },
    ],
  } : {},
  component: ThemeDetail,
  notFoundComponent: ThemeNotFound,
})

function ThemeDetail() {
  const { theme, css, like } = Route.useLoaderData()
  return (
    <main className="theme-gallery theme-detail">
      <BackToGallery />
      <header className="gallery-hero detail-hero">
        <div className="detail-hero-copy">
          <h1>{theme.name}</h1>
          <p>{theme.description}</p>
          <p className="detail-author">作者：<span className="theme-card-author">{theme.author}</span></p>
          {like && <LikeButton key={theme.id} slug={theme.id} initial={like} />}
        </div>
        <GetTheme key={theme.id} slug={theme.id} />
      </header>
      <ThemePreview key={theme.id} name={theme.name} css={css} />
    </main>
  )
}

function GetTheme({ slug }: { slug: string }) {
  const [origin, setOrigin] = useState('')
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const snippet = `@import url(${origin}/themes/${slug}/theme.css)`

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setStatus('已复制到剪贴板。')
    } catch {
      setCopied(false)
      setStatus('复制失败，请手动选择复制。')
    }
  }

  return (
    <div className="detail-tools">
      <div className="get-theme-head">
        <h2 className="get-theme-title">获取主题</h2>
        <p role="status" className="copy-status">{status}</p>
      </div>
      <div className="import-row">
        <pre className="import-code"><code>{snippet}</code></pre>
        <Button className="detail-control detail-primary" onClick={copySnippet}>
          {copied
            ? <Check className="ui-icon" aria-hidden="true" />
            : <Copy className="ui-icon" aria-hidden="true" />}
          复制
        </Button>
      </div>
    </div>
  )
}

function BackToGallery() {
  return (
    <Link className="detail-back" to="/" hash="theme-catalog">
      <ArrowLeft className="ui-icon" aria-hidden="true" />全部主题
    </Link>
  )
}

function ThemeNotFound() {
  return (
    <main className="theme-gallery not-found">
      <h1>找不到这个主题</h1>
      <BackToGallery />
    </main>
  )
}
