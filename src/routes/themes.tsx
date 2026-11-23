import { Link, createFileRoute } from '@tanstack/react-router'
import Sparkles from 'lucide-react/icons/sparkles'
import { ThemeCardGrid } from '../components/theme-card-grid'
import { getLikeCounts } from '../likes'
import { sortByLikes } from '../server/likes-store'
import { siteName } from '../site'
import { themes } from '../themes'

export const Route = createFileRoute('/themes')({
  // Counts are decoration: the catalog still renders, unsorted and without them, if D1 is unavailable.
  loader: async () => ({ counts: await getLikeCounts().catch(() => null) }),
  head: () => {
    const title = `全部主题 · ${siteName}`
    const description = `浏览 ${siteName} 收录的全部 V2EX 社区主题，支持多场景在线预览与一键导入。`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
    }
  },
  component: ThemesPage,
})

function ThemesPage() {
  const { counts } = Route.useLoaderData()
  const ordered = counts ? sortByLikes(themes, counts) : themes

  return (
    <main className="theme-gallery themes-page">
      <header className="themes-page-hero">
        <div className="themes-page-copy">
          <div className="gallery-heading">
            <h1>全部主题 <span>{themes.length}</span></h1>
          </div>
          <p>每套主题均通过首页、帖子详情与设置页三场景校验，点击卡片进入交互预览与一键获取。</p>
        </div>
        <Link className="brutal-btn brutal-btn-secondary" to="/" hash="create-theme">
          <Sparkles className="ui-icon" aria-hidden="true" />
          创作主题
        </Link>
      </header>
      <section aria-label="全部主题列表">
        <ThemeCardGrid themes={ordered} counts={counts} />
      </section>
    </main>
  )
}
