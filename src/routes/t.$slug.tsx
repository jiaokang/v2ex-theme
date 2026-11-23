import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import ArrowLeft from 'lucide-react/icons/arrow-left'
import { GetThemeDialog } from '../components/get-theme-dialog'
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
        <div className="detail-tools">
          <GetThemeDialog key={theme.id} slug={theme.id} name={theme.name} />
        </div>
      </header>
      <ThemePreview key={theme.id} name={theme.name} css={css} />
    </main>
  )
}

function BackToGallery() {
  return (
    <Link className="detail-back" to="/themes">
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
