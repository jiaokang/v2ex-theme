# V2EX Theme Hub

开源的 V2EX 纯 CSS 主题库与在线预览站点，内置 AI Agent Skill，支持快速创作、离线预览并一键投稿 PR。

- **一行启用**：在详情页复制 `@import`，粘贴到 [V2EX 设置页](https://www.v2ex.com/settings) 的「使用自定义 CSS」即可生效。
- **离线实景预览**：详情页内置首页、帖子详情与设置页三个脱敏离线样本，无脚本沙箱渲染，支持原版对照。
- **深浅色与窄屏适配**：统一适配 V2EX 浅色/夜间模式与移动端窄屏。
- **AI 创作与投稿**：无需克隆仓库即可生成主题、视觉自检并提交 PR。

## 创作与投稿

### 使用 Agent Skill（推荐）

```bash
npx skills add yuyinws/v2ex-theme
```

- `/v2ex-theme-create`：根据描述生成纯 CSS 主题，并自动完成多场景视觉自检与本地预览。
- `/v2ex-theme-submit`：校验主题并通过 GitHub API 免克隆提交 PR。

### 手动提交

在 `public/themes/<slug>/` 中添加 `theme.css` 与 `theme.json`（含 `name`、`author`、`description`），无需修改页面代码或手动生成 `.webp` 样张。

## 本地开发

基于 TanStack Start、React、ui-sdk 与 Cloudflare Workers / D1 构建。

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
# 本地初始化 D1 点赞数据库（首次部署用 wrangler secret put LIKE_SECRET + db:migrate:remote）
echo "LIKE_SECRET=$(openssl rand -hex 32)" > .dev.vars
pnpm db:migrate:local

# 重新生成首页主题样张（需先安装 chromium：npx playwright install chromium）
pnpm screenshots:themes

# 同步 Skill 离线样本（修改 scripts/fixtures/ 后执行）
pnpm sync:skill-fixtures

# 测试与构建
pnpm test
pnpm build
```
