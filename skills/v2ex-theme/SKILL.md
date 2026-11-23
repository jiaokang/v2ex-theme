---
name: v2ex-theme
description: Generate and visually verify a custom V2EX CSS theme from a requested design style.
disable-model-invocation: true
---

Create a standalone pure-CSS V2EX **Theme** from the user's requested design style, self-verify it against the bundled offline **Fixtures** (`home`, `topic`, `settings`), and open an interactive **Preview Shell** for final review.

Read [`references/v2ex-selectors.md`](references/v2ex-selectors.md) before writing CSS: it contains V2EX's real DOM selectors, native CSS variable mappings, color-scheme hooks, and specificity gotchas.

## Workflow

Run straight through steps 1–5 in one pass whenever the user has already provided a style direction. Ask a single clarifying question upfront only if the user gave no style direction at all.

### 1. Derive design tokens

Accept any style input: free-text description, design system or brand name, reference URL, image, or design doc. Distill a concise token set before writing CSS:

- **Palette**: canvas, card surface, secondary fill, hover, subtle border, control border, primary ink, muted ink, accent, accent tint, primary action + text-on-action.
- **Typography**: UI sans, reading body font (if distinct), monospace, size/line-height scale.
- **Geometry & density**: card radius, control radius, spacing rhythm, border weight, shadow/bevel treatment.
- **Color scheme**: support both `light` and `dark` by default (following V2EX's `:root[data-site-theme]`, `#Wrapper.Night`, and `prefers-color-scheme`). Lock to a single mode only when the requested style is inherently single-mode (for example, a dark-only terminal aesthetic).

### 2. Determine output path

Resolve output paths adaptively from the current working directory:

- **Inside the `v2ex-theme` repository** (`public/themes/` exists in cwd) or when the user explicitly intends to contribute a PR to `v2ex-theme`:
  - Write `public/themes/<slug>/theme.css`
  - Write `public/themes/<slug>/theme.json` with `{"name", "author", "description"}` (do not generate `.webp` previews).
- **Outside the repository** (default for standalone installs):
  - Write `<slug>/theme.css` in cwd (or the exact path the user requested).

### 3. Author `theme.css`

Write a complete, single-file CSS theme grounded in [`references/v2ex-selectors.md`](references/v2ex-selectors.md):

- Pure CSS with zero JavaScript.
- Optional public `@font-face` rules are allowed only with full Latin + CJK system font fallbacks (`font-display: swap`). Keep themes free of external images, `@import`, and external stylesheet dependencies.
- Map V2EX's native `--box-*`, `--button-*`, `--link-*`, `--color-*`, and `--theme-switch-*` variables onto your theme tokens.
- Cover all three **Scenes** (`home`, `topic`, `settings`), including header/search, tabs, topic rows, reply count pills, sidebar, plane directory, topic typography/code/blockquotes, threaded replies (楼中楼) connectors and parent strips, settings toggles/Select2/inputs/buttons, focus rings, reduced motion, and narrow-screen breakpoints (`840px` and `520px`).

### 4. Run visual self-check and open the Preview Shell

Execute the bundled zero-dependency verifier from this skill's directory (resolve the script path relative to this `SKILL.md`):

```bash
node <skill-dir>/scripts/verify-theme.mjs --css <path/to/theme.css> --name "<Theme Name>" --mode <both|light|dark>
```

Pass `--mode both` for dual-mode themes, or `--mode light` / `--mode dark` for explicitly single-mode themes. The script writes temporary files under the OS temp directory (never polluting cwd), captures screenshots via Playwright or local headless Chromium, and opens `preview.html` in the user's browser.

**Completion criteria for visual self-check:**

- When `screenshotEngine` is `playwright` or `chrome-headless`, inspect **every** generated PNG (`home`, `topic`, `settings` across enabled color modes at `1280×800`, plus `home-mobile.png` at `390×844`) using your image-reading tool.
- Check every shot for:
  1. Text, link, and muted metadata contrast in both light and dark modes.
  2. Unstyled white surfaces, invisible `#Logo` or search icon, or broken inline-colored plane headers in dark mode.
  3. Clean alignment of `#Top`, `#Tabs`, `#Main`/`#Rightbar`, `.cell.item` rows, `.topic_content`/`pre` code blocks, threaded replies (`.reply-threads-d` indentation, connector lines aligned to avatars, readable `.reply-strip` / `.reply-parent`), and `.onoffswitch`/Select2/`.super.button` controls.
  4. Zero horizontal overflow or clipped header/avatar columns on `home-mobile.png`.
- Fix every defect found in `theme.css` and re-run `verify-theme.mjs` (use `--no-open` on intermediate passes, then open once clean) until all shots pass.
- If `screenshotEngine` is `none`, note clearly in your reply that automatic screenshot capture was skipped because neither Playwright nor local Chrome/Chromium was available, and direct the user to inspect the opened `preview.html`.

### 5. Hand off and iterate

Report:
- The written file path(s) and key design tokens chosen.
- What visual checks passed (or whether screenshot capture fell back to manual preview).
- The path to `preview.html` (already opened in the browser), noting it supports switching `首页 / 帖子详情 / 设置页`, `浅色 / 深色`, viewport widths, and **Baseline** comparison (`1/2/3`, `L/D`, `B`).

When the user requests visual tweaks after reviewing the **Preview Shell**, edit `theme.css`, re-run `verify-theme.mjs --no-open` (which refreshes screenshots and overwrites the same `preview.html`), inspect affected screenshots, and let the user know they can refresh the browser tab.
