import { Link, createFileRoute } from '@tanstack/react-router'
import ArrowRight from 'lucide-react/icons/arrow-right'
import { siteDescription, siteName } from '../site'
import { themes } from '../themes'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="theme-gallery">
      <header className="gallery-hero">
        <h1>{siteName}</h1>
        <p>{siteDescription}</p>
      </header>
      <section id="theme-catalog" aria-labelledby="gallery-title">
        <div className="gallery-heading">
          <h2 id="gallery-title">全部主题 <span>{themes.length}</span></h2>
        </div>
        <div className="theme-grid">
          {themes.map(({ id, name, author, description }) => (
            <Link
              key={id}
              className="theme-card"
              to="/t/$slug"
              params={{ slug: id }}
              aria-labelledby={`theme-name-${id}`}
            >
              <div className="theme-card-media">
                <img
                  src={`/theme-previews/${id}.webp`}
                  alt={`${name} 主题的 V2EX 首页样张`}
                  width={1000}
                  height={580}
                />
              </div>
              <div className="theme-card-info">
                <h3 id={`theme-name-${id}`}>{name}</h3>
                <p>{description}</p>
                <div className="theme-card-meta">
                  <span>作者：<span className="theme-card-author">{author}</span></span>
                  <ArrowRight className="ui-icon theme-card-arrow" aria-hidden="true" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
