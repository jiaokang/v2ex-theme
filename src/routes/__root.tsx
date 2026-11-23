import '@ui-sdk/core/web.css'
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Palette from 'lucide-react/icons/palette'
import Sparkles from 'lucide-react/icons/sparkles'

import { ThemeModeToggle, colorModeInitScript } from '../components/theme-mode-toggle'
import { siteDescription, siteName } from '../site'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: `${siteName} · 社区主题库`,
      },
      {
        name: 'description',
        content: siteDescription,
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
        sizes: '32x32',
      },
      {
        rel: 'icon',
        href: '/favicon.svg',
        type: 'image/svg+xml',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: colorModeInitScript }} />
      </head>
      <body>
        <header className="site-topbar">
          <div className="site-topbar-inner">
            <Link className="site-brand" to="/" activeOptions={{ exact: true }}>
              <span className="site-mark" aria-hidden="true">V</span>
              {siteName}
            </Link>
            <div className="site-topbar-end">
              <nav className="site-nav" aria-label="主导航">
                <Link className="site-nav-link" to="/" hash="features">特性</Link>
                <Link className="site-nav-link" to="/" hash="faq">常见问题</Link>
                <a
                  className="site-nav-link"
                  href="https://github.com/yuyinws/v2ex-theme"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                  <ArrowUpRight className="ui-icon" aria-hidden="true" />
                </a>
                <div className="site-nav-actions">
                  <Link className="brutal-btn brutal-btn-sm brutal-btn-secondary" to="/" hash="create-theme">
                    <Sparkles className="ui-icon" aria-hidden="true" />
                    创作主题
                  </Link>
                  <Link className="brutal-btn brutal-btn-sm brutal-btn-primary" to="/themes">
                    <Palette className="ui-icon" aria-hidden="true" />
                    查看主题
                  </Link>
                </div>
              </nav>
              <ThemeModeToggle />
            </div>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-main">
              <div className="site-footer-about">
                <strong>{siteName}</strong>
                <p>{siteDescription}</p>
              </div>
              <nav className="site-footer-nav" aria-label="页脚导航">
                <div className="site-footer-group">
                  <span>探索</span>
                  <ul>
                    <li><Link to="/themes">查看主题</Link></li>
                    <li><Link to="/" hash="features">核心特性</Link></li>
                    <li><Link to="/" hash="create-theme">创作主题</Link></li>
                    <li><Link to="/" hash="faq">常见问题</Link></li>
                  </ul>
                </div>
                <div className="site-footer-group">
                  <span>项目</span>
                  <ul>
                    <li>
                      <a
                        href="https://github.com/yuyinws/v2ex-theme"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        GitHub<ArrowUpRight className="ui-icon" aria-hidden="true" />
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.v2ex.com/settings"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        V2EX 设置页<ArrowUpRight className="ui-icon" aria-hidden="true" />
                      </a>
                    </li>
                  </ul>
                </div>
              </nav>
            </div>
            <div className="site-footer-bottom">
              <p>独立 V2EX 社区主题库，与 V2EX 官方无关。</p>
            </div>
          </div>
        </footer>

        <Scripts />
      </body>
    </html>
  )
}
