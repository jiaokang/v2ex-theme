---
name: v2ex-theme-submit
description: 校验本地 V2EX 自定义 CSS 主题，并通过 GitHub API 免手动 fork、免克隆仓库直接向 yuyinws/v2ex-theme 提交 PR。
disable-model-invocation: true
---

校验本地生成的 V2EX 纯 CSS 主题，并通过 GitHub API 直接向 `yuyinws/v2ex-theme` 的 `public/themes/<slug>/` 目录提交或更新 Pull Request（`theme.css` 与 `theme.json`），无需用户提前手动 fork 或 clone 仓库。

面向用户的所有提问、确认摘要、错误说明与结果汇报**默认使用中文**（除非用户明确使用其他语言沟通）。

使用本 skill 目录自带的零依赖脚本 `<skill-dir>/scripts/submit-theme.mjs`（按本 `SKILL.md` 所在目录解析 `<skill-dir>`）。

## 工作流

### 1. 定位主题文件

确定要提交的 `theme.css`：
- 优先使用用户指定的文件路径、`slug`，或当前对话刚生成的主题文件。
- 否则在当前工作目录查找 `public/themes/*/theme.css`、`*/theme.css` 或 `./theme.css`。
- 若找到多个候选且无法判断，用中文简洁询问用户要提交哪一个。

### 2. 执行只读预检

先以 `--check` 模式运行脚本（该模式仅读取信息，不会在 GitHub 上创建任何仓库、分支或 PR）：

```bash
node <skill-dir>/scripts/submit-theme.mjs --check --css <path/to/theme.css> [--slug <slug>] [--name "<名称>"] [--author "<作者>"] [--description "<简介>"]
```

根据返回的 JSON 处理以下情况：

- **未完成 GitHub 认证（`code: "AUTH_REQUIRED"`）**：
  - 将脚本返回的中文认证指引清晰展示给用户（已安装 `gh` 则引导运行 `gh auth login`；未安装则引导安装 `gh` 或导出带 `public_repo` 权限的 `GITHUB_TOKEN`），等待用户完成认证后再继续。
- **静态校验未通过（`validationErrors` 非空）**：
  - `slug` 仅允许小写字母、数字和单个连字符（`^[a-z0-9]+(?:-[a-z0-9]+)*$`，最长 64 字符）。
  - `theme.css` 必须非空、不超过 200 KB，禁止 `</style>`、`<script`、`@import`、不安全的 `http://` 以及 `@font-face` 之外的外链 `url(...)`（允许 `@font-face` 中的 `https://` 字体）。
  - `name`、`author`、`description` 必须为非空字符串。
  - 若仅缺少元数据（例如本地还没有 `theme.json` 导致缺少 `description`）：用 `user.login` 预填 `author`、用 `metadata.name` 预填名称，并根据主题风格拟定一句简短中文简介，请用户确认或修改。
  - 若 `theme.css` 本身有校验错误，先与用户一起修复再继续。
- **上游存在同名 `slug`（`upstreamExists: true` 且 `existingPr: null`）**：
  - 向用户展示上游已有的 `theme.json` 信息（`upstreamTheme.name`、`upstreamTheme.author`、`upstreamTheme.description`）。
  - 用中文明确询问用户：是**更换一个新的 `slug`**，还是**有意发起更新该主题的 PR**（确认更新才传 `--allow-update`）。

### 3. 提交前向用户确认摘要

在真正调用 GitHub API 写入（自动 fork、建分支、提交 commit、开 PR）之前，先用中文向用户展示一份简洁摘要并等待明确确认：

- **目标仓库**：`yuyinws/v2ex-theme`（说明将直接建分支，还是自动在 `<login>/v2ex-theme` 创建/复用 fork 后提跨仓库 PR）
- **操作类型**：新增主题 PR / 更新上游已有主题 PR / 向开放中的 PR `#<number>` 追加提交
- **提交文件**：`public/themes/<slug>/theme.css`、`public/themes/<slug>/theme.json`
- **主题元数据**：`slug`、`name`、`author`、`description`

如果用户已经核对过上述全部信息（含重名决策）并明确回复确认，立即进入下一步。

### 4. 提交 Pull Request

去掉 `--check` 执行正式提交：

```bash
node <skill-dir>/scripts/submit-theme.mjs \
  --css <path/to/theme.css> \
  --slug <slug> \
  --name "<名称>" \
  --author "<作者>" \
  --description "<简介>" \
  [--allow-update] \
  [--write-metadata]
```

仅在用户明确同意更新已有主题时传 `--allow-update`；若本次新建或修改了元数据，附带 `--write-metadata` 将规范化的 `theme.json` 同步写回本地同目录。

### 5. 汇报结果

用中文向用户汇报：
- 可点击的 PR 链接（`prUrl`）与编号（`prNumber`）。
- 本次操作结果：新建 PR、向已有开放 PR 追加提交，或内容无变更（`no_changes`）。
- 提交分支（`branch`）、Commit SHA（`commitSha`），以及是否自动创建/复用了个人 fork。
- 顺带说明：图册首页 `.webp` 样张由仓库维护者在合入时统一生成，本次 PR 无需包含图片文件。
