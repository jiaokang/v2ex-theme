# v2ex-theme

使用 TanStack Start、React 和 ui-sdk 的 V2EX 主题图册。

```bash
npm install
npm run dev
```

## 生成主题样张

新增主题时，在 `public/themes/<slug>/` 放入 `theme.css` 和 `theme.json`，不需要修改首页。目录名是主题的稳定 ID；首页按目录名排列，直接读取 `theme.json` 的 `name`、`author` 和 `description`。两个文件构建后可从 `/themes/<slug>/` 直接访问。新增主题或修改主题 CSS、离线样本后，重新生成首页样张：

```bash
npx playwright install chromium
npm run screenshots:themes
```

脚本为每个包含 `theme.json` 的目录生成样张，用固定视口和亮色模式把对应 CSS 套到同一份离线 V2EX 首页样本，并禁用网络请求。生成的 WebP 位于 `public/theme-previews/<slug>.webp`，应用构建直接使用这些文件，不启动浏览器。离线生成使用本机字体回退，不同系统的字形可能略有差异。

`/t/<slug>` 详情页提供首页、帖子详情、个人主页和设置页四个离线场景。渲染时先加载 `scripts/fixtures/v2ex-base.css`，再把主题 CSS 放入无脚本、无外部请求的沙箱 iframe；原样对照保留相同样本和基础 CSS。首页的基础样式以原站桌面快照的结构和尺寸为参照手写，不分发原站 CSS 或资源；窄屏仍使用自适应布局。帖子详情用四层回复树展示楼中楼。设置控件不可提交，仓库不保留原始导出。

## 主题点赞

点赞存放在 Cloudflare D1（绑定名 `DB`），表结构见 `migrations/`。首页按点赞数降序排列并显示计数，只有详情页能点赞或取消。访客用一个 `httpOnly` 匿名 cookie 区分，库里只存它的 HMAC；写入按 IP 限流（`LIKE_LIMITER`，每分钟 20 次）。这是软去重：清 cookie 或换浏览器可以再赞一次。D1 不可用时，首页照常展示，只是不排序、不显示计数。

本地开发前准备一次：

```bash
echo "LIKE_SECRET=$(openssl rand -hex 32)" > .dev.vars
npm run db:migrate:local
```

首次部署时 Wrangler 会自动创建 D1 数据库，之后再执行：

```bash
npx wrangler secret put LIKE_SECRET
npm run db:migrate:remote
```

## 构建

```bash
npm run build
```
