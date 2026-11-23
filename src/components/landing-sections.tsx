import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@ui-sdk/react/accordion'
import { Button } from '@ui-sdk/react/button'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs'
import ArrowRight from 'lucide-react/icons/arrow-right'
import ArrowUpRight from 'lucide-react/icons/arrow-up-right'
import Check from 'lucide-react/icons/check'
import Copy from 'lucide-react/icons/copy'
import GitPullRequest from 'lucide-react/icons/git-pull-request'
import Minus from 'lucide-react/icons/minus'
import Paintbrush from 'lucide-react/icons/paintbrush'
import Plus from 'lucide-react/icons/plus'
import Terminal from 'lucide-react/icons/terminal'
import type { ThemeSummary } from '../themes'

const SKILL_INSTALL_CMD = 'npx skills add yuyinws/v2ex-theme'

const SHOWCASE_TONES = ['yellow', 'cyan', 'lavender'] as const

const CREATE_STEPS = [
  {
    step: '01',
    title: '安装创作与投稿 Skill',
    description: '把仓库内置的两个零依赖 Skill 安装到你的 AI 编程工具中，随时召唤。',
  },
  {
    step: '02',
    title: '描述风格并自动视觉自检',
    description: '运行 /v2ex-theme-create，自动提炼配色变量、生成主题样式并在三场景离线样本中截图验收。',
  },
  {
    step: '03',
    title: '免克隆一键发起投稿 PR',
    description: '运行 /v2ex-theme-submit，静态校验通过后直接调用 GitHub API 创建分支并提交 PR。',
  },
] as const

const FAQ_ITEMS = [
  {
    value: 'how-to-use',
    question: '怎么在 V2EX 启用这里的主题？',
    paragraphs: [
      '点开任意主题详情页，点击右上角「获取主题」即可复制一行 @import url(...) 代码。',
      '接着前往 V2EX 设置页（v2ex.com/settings），勾选「使用自定义 CSS」，将代码粘贴进去并保存即可立即生效，随时可以清空恢复原版。',
    ],
  },
  {
    value: 'auto-updates',
    question: '主题更新后，我需要重新复制代码吗？',
    paragraphs: [
      '不需要。通过 @import url(...) 引入的样式表由 Cloudflare Workers 分发，主题更新发布后会自动生效。',
      '主题源码同时开源在 GitHub 仓库，你可以随时查看完整样式或保存本地备份。',
    ],
  },
  {
    value: 'dark-and-mobile',
    question: '支持深色模式和手机端浏览吗？',
    paragraphs: [
      '支持。收录主题遵循统一的 V2EX 选择器与变量规范，默认同时适配浅色与夜间模式，并针对 840px、520px 等窄屏宽度做过排版校验。',
    ],
  },
  {
    value: 'how-to-create',
    question: '如何自己创作并投稿主题？',
    paragraphs: [
      '你可以直接手写样式，也可以安装仓库提供的 v2ex-theme-create 与 v2ex-theme-submit Skill。',
      'AI Agent 会自动基于离线首页、帖子详情与设置页样本做多场景验收，并通过 GitHub API 免手动 fork、免克隆仓库直接发起 PR。',
    ],
  },
  {
    value: 'offline-preview',
    question: '详情页的预览会连接我的 V2EX 账号吗？',
    paragraphs: [
      '不会。详情页预览运行在无脚本、无外部网络请求的沙箱 iframe 中，展示的是脱敏后的离线场景样本，不读取任何登录态。',
    ],
  },
] as const

export function HeroShowcase({ themes }: { themes: ThemeSummary[] }) {
  const initialId = themes[0]?.id ?? ''
  const [activeId, setActiveId] = useState(initialId)
  const activeIndex = Math.max(0, themes.findIndex(({ id }) => id === activeId))
  const activeTheme = themes[activeIndex] ?? themes[0]
  const tone = SHOWCASE_TONES[activeIndex % SHOWCASE_TONES.length]

  if (!activeTheme) return null

  return (
    <div className="hero-showcase card-brutal">
      <Tabs
        className="hero-showcase-tabs"
        value={activeTheme.id}
        onValueChange={(next) => {
          if (next) setActiveId(next)
        }}
      >
        <div className="hero-showcase-header">
          <div className="hero-showcase-title-group">
            <span className={`brutal-tile brutal-tile-${tone}`} aria-hidden="true">
              <Paintbrush className="ui-icon" />
            </span>
            <div className="hero-showcase-heading">
              <span className="hero-showcase-name">{activeTheme.name}</span>
              <span className="hero-showcase-author">@{activeTheme.author}</span>
            </div>
          </div>
          <TabsList className="hero-showcase-tablist" aria-label="精选主题预览">
            {themes.map(({ id, name }) => (
              <TabsTab key={id} value={id} className="hero-showcase-tab">
                {name}
              </TabsTab>
            ))}
          </TabsList>
        </div>
        {themes.map(({ id, name, description }) => (
          <TabsPanel key={id} value={id} className="hero-showcase-panel">
            <div className="hero-showcase-media">
              <img
                src={`/theme-previews/${id}.webp`}
                alt={`${name} 主题的首页预览图`}
                width={1000}
                height={580}
              />
            </div>
            <div className="hero-showcase-footer">
              <p className="hero-showcase-caption">{description}</p>
              <Link
                className="hero-showcase-link"
                to="/t/$slug"
                params={{ slug: id }}
                aria-label={`查看 ${name} 详情`}
              >
                详情预览
                <ArrowRight className="ui-icon" aria-hidden="true" />
              </Link>
            </div>
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  )
}

export function CreateThemeSection() {
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyCommand() {
    try {
      await navigator.clipboard.writeText(SKILL_INSTALL_CMD)
      setCopied(true)
      setStatus('已复制安装命令。')
    } catch {
      setCopied(false)
      setStatus('复制失败，请手动选择复制。')
    }
  }

  return (
    <section id="create-theme" className="landing-section" aria-labelledby="create-theme-title">
      <div className="landing-container">
        <div className="landing-section-head landing-section-head-center">
          <h2 id="create-theme-title">创作你的 V2EX 主题</h2>
          <p>
            仓库内置开箱即用的 Agent Skill，从提炼配色变量、编写样式到多场景截图自检与免克隆提 PR，一条流水线走完。
          </p>
        </div>

        <div className="create-grid">
          <ol className="create-steps">
            {CREATE_STEPS.map(({ step, title, description }) => (
              <li key={step} className="create-step-card">
                <span className="create-step-num" aria-hidden="true">{step}</span>
                <div className="create-step-body">
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="create-terminal card-brutal">
            <div className="create-terminal-bar">
              <div className="create-terminal-title">
                <span className="brutal-tile brutal-tile-yellow" aria-hidden="true">
                  <Terminal className="ui-icon" />
                </span>
                <span>Skill 命令行</span>
              </div>
              <span className="create-terminal-badge">ZERO CLONE</span>
            </div>

            <div className="create-terminal-body">
              <div className="create-command-head">
                <span className="create-command-label">安装主题创作与投稿 Skill</span>
                <p role="status" className="copy-status">{status}</p>
              </div>
              <div className="create-command-row">
                <pre className="create-command-code"><code>{SKILL_INSTALL_CMD}</code></pre>
                <Button
                  className="brutal-btn brutal-btn-sm brutal-btn-primary"
                  onClick={copyCommand}
                >
                  {copied
                    ? <Check className="ui-icon" aria-hidden="true" />
                    : <Copy className="ui-icon" aria-hidden="true" />}
                  复制安装命令
                </Button>
              </div>

              <div className="create-skill-list">
                <span className="create-command-label">Prompt 使用示例</span>
                <div className="create-skill-item">
                  <div className="create-skill-name">
                    <Paintbrush className="ui-icon" aria-hidden="true" />
                    <span>生成并预览主题</span>
                  </div>
                  <p className="create-prompt-box">
                    <span className="create-prompt-caret" aria-hidden="true">&gt;</span>
                    <span>
                      <code>/v2ex-theme-create</code>{' '}
                      参考 Linear 的极简风格，低饱和冷灰底色、细边框与克制的紫色强调，同时适配浅色和深色模式
                    </span>
                  </p>
                </div>
                <div className="create-skill-item">
                  <div className="create-skill-name">
                    <GitPullRequest className="ui-icon" aria-hidden="true" />
                    <span>提交主题 PR</span>
                  </div>
                  <p className="create-prompt-box">
                    <span className="create-prompt-caret" aria-hidden="true">&gt;</span>
                    <span>
                      <code>/v2ex-theme-submit</code>{' '}
                      把刚才生成的主题提交 PR，名称 Linear，简介写「极简冷灰与克制的紫色强调」
                    </span>
                  </p>
                </div>
              </div>

              <div className="create-terminal-foot">
                <a
                  className="create-docs-link"
                  href="https://github.com/yuyinws/v2ex-theme/tree/main/skills"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看 GitHub Skill 说明
                  <ArrowUpRight className="ui-icon" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  return (
    <section id="faq" className="landing-section landing-section-cream" aria-labelledby="faq-title">
      <div className="landing-container landing-container-narrow">
        <div className="landing-section-head landing-section-head-center">
          <h2 id="faq-title">常见问题</h2>
        </div>

        <div className="faq-card card-brutal">
          <Accordion
            className="faq-accordion"
            aria-label="常见问题"
            defaultValue={['how-to-use']}
          >
            {FAQ_ITEMS.map(({ value, question, paragraphs }) => (
              <AccordionItem key={value} value={value} className="faq-item">
                <AccordionHeader className="faq-header">
                  <AccordionTrigger className="faq-trigger">
                    {(state) => (
                      <>
                        <span className="faq-question">{question}</span>
                        <span className="faq-toggle-box" aria-hidden="true">
                          {state.open
                            ? <Minus className="ui-icon" />
                            : <Plus className="ui-icon" />}
                        </span>
                      </>
                    )}
                  </AccordionTrigger>
                </AccordionHeader>
                <AccordionPanel className="faq-panel">
                  <div className="faq-answer">
                    {paragraphs.map((text) => (
                      <p key={text}>{text}</p>
                    ))}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
