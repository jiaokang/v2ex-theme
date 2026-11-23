import { Link, createFileRoute } from '@tanstack/react-router'
import ArrowRight from 'lucide-react/icons/arrow-right'
import Code from 'lucide-react/icons/code'
import Eye from 'lucide-react/icons/eye'
import Palette from 'lucide-react/icons/palette'
import Sparkles from 'lucide-react/icons/sparkles'
import SunMoon from 'lucide-react/icons/sun-moon'
import { CreateThemeSection, FaqSection, HeroShowcase } from '../components/landing-sections'
import { ThemeCardGrid } from '../components/theme-card-grid'
import { getLikeCounts } from '../likes'
import { sortByLikes } from '../server/likes-store'
import { siteName } from '../site'
import { themes } from '../themes'

const FEATURED_LIMIT = 3

const FEATURE_CARDS = [
  {
    id: 'one-line-import',
    tone: 'yellow',
    Icon: Code,
    title: '一行导入，随时切换',
    description: '在主题详情页复制 @import 链接，粘贴到 V2EX 设置页即可生效，想换风格或恢复原版只需改一行。',
    tag: '@import 即贴即用',
  },
  {
    id: 'offline-preview',
    tone: 'cyan',
    Icon: Eye,
    title: '三场景离线实景预览',
    description: '每套主题都提供首页、帖子详情与设置页离线沙箱预览，支持一键切换原版对照，所见即所得。',
    tag: '首页 / 帖子 / 设置',
  },
  {
    id: 'dual-mode',
    tone: 'lime',
    Icon: SunMoon,
    title: '深浅双色与窄屏适配',
    description: '统一映射 V2EX 原生变量与夜间模式钩子，覆盖代码块排印、楼中楼回复与移动端窄屏断点。',
    tag: 'Light + Dark + Mobile',
  },
] as const

export const Route = createFileRoute('/')({
  // Counts are decoration: the gallery still renders, unsorted and without them, if D1 is unavailable.
  loader: async () => ({ counts: await getLikeCounts().catch(() => null) }),
  component: Home,
})

function Home() {
  const { counts } = Route.useLoaderData()
  const ordered = counts ? sortByLikes(themes, counts) : themes
  const featured = ordered.slice(0, FEATURED_LIMIT)

  return (
    <main className="landing-page">
      <section className="landing-hero" data-home-hero="true">
        <div className="landing-container">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">{siteName} · 社区主题库</p>
              <h1>
                给你的 V2EX
                <br />
                换一套顺眼的
                <br />
                社区主题。
              </h1>
              <p className="landing-hero-lead">
                精选开源社区主题，复制一行 <code>@import</code> 即可在 V2EX 设置页启用，也可以用 AI Agent 几分钟创作并投稿你的专属风格。
              </p>
              <div className="landing-cta-group">
                <Link className="brutal-btn brutal-btn-primary" to="/themes">
                  <Palette className="ui-icon" aria-hidden="true" />
                  查看主题
                </Link>
                <Link className="brutal-btn brutal-btn-secondary" to="/" hash="create-theme">
                  <Sparkles className="ui-icon" aria-hidden="true" />
                  创作主题
                </Link>
              </div>
            </div>
            <HeroShowcase themes={featured} />
          </div>
        </div>
      </section>

      <section className="landing-quote-band" aria-label="设计理念">
        <div className="landing-container landing-container-narrow">
          <p className="landing-quote-text">
            「挑一套合心意的主题，复制一行代码粘贴进设置页，
            <br />
            每天打开的 V2EX 立刻焕然一新。」
          </p>
          <ul className="landing-quote-pills">
            <li>一行导入即用</li>
            <li>三场景离线验收</li>
            <li>开源可审阅</li>
          </ul>
        </div>
      </section>

      <section id="featured-themes" className="landing-section" aria-labelledby="featured-title">
        <div className="landing-container">
          <div className="landing-section-head landing-section-head-split">
            <div className="gallery-heading">
              <h2 id="featured-title">热门主题 <span>TOP {featured.length}</span></h2>
            </div>
            <Link className="brutal-btn brutal-btn-sm brutal-btn-secondary" to="/themes">
              查看全部主题（{themes.length}）
              <ArrowRight className="ui-icon" aria-hidden="true" />
            </Link>
          </div>
          <ThemeCardGrid themes={featured} counts={counts} />
        </div>
      </section>

      <section id="features" className="landing-section landing-section-cream" aria-labelledby="features-title">
        <div className="landing-container">
          <div className="landing-section-head landing-section-head-center">
            <h2 id="features-title">{siteName} 有什么不同</h2>
            <p>把 V2EX 自定义主题做成一套规范、可预览、可轻松分享的开源主题库。</p>
          </div>
          <div className="feature-grid">
            {FEATURE_CARDS.map(({ id, tone, Icon, title, description, tag }) => (
              <article key={id} className="feature-card card-brutal">
                <div className="feature-card-top">
                  <span className={`brutal-tile brutal-tile-${tone}`} aria-hidden="true">
                    <Icon className="ui-icon" />
                  </span>
                  <span className="feature-card-tag">{tag}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CreateThemeSection />

      <FaqSection />

      <section className="landing-final-cta" data-final-cta="true" aria-labelledby="final-cta-title">
        <div className="landing-container landing-container-narrow">
          <h2 id="final-cta-title">准备好给 V2EX 换新装了吗？</h2>
          <p>挑一套喜欢的主题立刻启用，或亲手创作你的下一套社区精选。</p>
          <div className="landing-cta-group landing-cta-group-center">
            <Link className="brutal-btn brutal-btn-primary" to="/themes">
              <Palette className="ui-icon" aria-hidden="true" />
              查看主题
            </Link>
            <Link className="brutal-btn brutal-btn-secondary" to="/" hash="create-theme">
              <Sparkles className="ui-icon" aria-hidden="true" />
              创作主题
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
