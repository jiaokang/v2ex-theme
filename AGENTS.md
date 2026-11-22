# 项目指引

## ui-sdk

- 使用 ui-sdk 前，遵循 `ui-sdk` 技能（如果已安装），并阅读 `node_modules/@ui-sdk/react/docs/llms.txt`。
- 构建新组件时，还要按标题搜索 `node_modules/@ui-sdk/react/docs/core.md` 中的相关章节，并阅读同目录下的 `rendering.md`。

## Raft Design

- 调整站点外观前，查阅 [Raft Design 文档索引](https://raft-design.botiverse.build/llms.txt) 中对应的基础规范或组件页。全站从 `@botiverse/raft-ui/foundation.css` 读取设计变量；控件交互沿用 ui-sdk。
- 在 `public/themes/<slug>/theme.css` 维护 V2EX 主题。它们会公开发布，供截图和下载使用，与站点外壳的样式分开维护。
- 界面图标使用 [Lucide React](https://lucide.dev/guide/react/getting-started)，从 `lucide-react/icons/<name>` 按需导入。带文字的装饰图标加 `aria-hidden="true"`，纯图标操作给控件加可访问名称。
