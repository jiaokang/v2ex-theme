# V2EX Theme CSS Reference

Real DOM selectors, native CSS variables, color-scheme hooks, and gotchas verified against the bundled V2EX `home`, `topic`, and `settings` fixtures.

## 1. Specificity & Color-Scheme Template

Use `:root:root` to beat V2EX's base `:root` rules cleanly without spamming `!important`. Prefix your theme tokens (for example `--vt-*`) so they never collide with V2EX's native variables.

```css
:root:root {
  color-scheme: light dark;
  /* Theme palette using light-dark(lightValue, darkValue) */
  --vt-canvas: light-dark(#faf9f5, #141413);
  --vt-surface: light-dark(#ffffff, #1e1d1a);
  --vt-fill: light-dark(#f3f0e8, #282621);
  --vt-hover: light-dark(#eeeadf, #312d27);
  --vt-line: light-dark(#e5e3dc, #37342d);
  --vt-control: light-dark(#8e877a, #7d7669);
  --vt-ink: light-dark(#141413, #f5f4ef);
  --vt-muted: light-dark(#625e55, #b0aea5);
  --vt-accent: light-dark(#1f5fbf, #7ab0ff);
  --vt-logo-filter: brightness(0) invert(0.08);

  /* Map native V2EX components onto the same tokens */
  --code-font: var(--vt-mono);
  --box-background-color: var(--vt-surface);
  --box-background-translucent-color: var(--vt-surface);
  --box-glass-color: var(--vt-surface);
  --box-thick-glass-color: var(--vt-surface);
  --box-background-alt-color: var(--vt-fill);
  --box-background-hover-color: var(--vt-hover);
  --box-foreground-color: var(--vt-ink);
  --box-border-color: var(--vt-line);
  --box-border-hover-color: var(--vt-control);
  --box-border-focus-color: var(--vt-accent);
  --box-border-radius: var(--vt-radius);
  --button-background-color: var(--vt-surface);
  --button-background-hover-color: var(--vt-fill);
  --button-background-active-color: var(--vt-hover);
  --button-foreground-color: var(--vt-ink);
  --button-foreground-hover-color: var(--vt-ink);
  --button-border-color: var(--vt-control);
  --button-border-hover-color: var(--vt-accent);
  --node-sidebar-hover-color: var(--vt-fill);
  --color-foreground: var(--vt-ink);
  --color-graphite: var(--vt-ink);
  --color-gray: var(--vt-muted);
  --color-fade: var(--vt-muted);
  --link-color: var(--vt-muted);
  --link-visited-color: var(--vt-muted);
  --link-hover-color: var(--vt-ink);
  --link-primary-color: var(--vt-accent);
  --color-blue: var(--vt-accent);
  --subtle-blue-background-color: var(--vt-fill);
}

:root[data-site-theme="light"] {
  color-scheme: light;
}
:root[data-site-theme="dark"],
:root:not([data-site-theme]):has(#Wrapper.Night) {
  color-scheme: dark;
  --vt-logo-filter: brightness(0) invert(0.95);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-site-theme="light"]) {
    --vt-logo-filter: brightness(0) invert(0.95);
  }
}
```

> Single-mode exemption: when the requested style is explicitly single-mode (such as a dark-only terminal theme), lock `color-scheme: dark` (or `light`) on `:root:root` and keep `#Wrapper, #Wrapper.Night` consistent so neither V2EX setting breaks contrast.

## 2. Page Shell & Layout

| Region | Selectors | Notes / Gotchas |
| --- | --- | --- |
| Document & wrapper | `html, body`, `#Wrapper`, `#Wrapper.Night` | Set `body { min-width: 0 !important; font-family: ... !important; }` to override V2EX's inline `body { min-width: 820px; }`. Use `#Wrapper, #Wrapper.Night { background: ... !important; }` because node pages inject inline styles overriding `#Wrapper` background. |
| Centered columns | `:is(#Top, #Wrapper, #Bottom) > .content`, `#Main`, `#Rightbar`, `#Leftbar` | Desktop layout uses `#Main { margin-inline: 0 290px; }` and `#Rightbar { width: 266px; margin-inline: 0; }` with `#Wrapper > .content::after { content: ""; display: block; clear: both; }`. |
| Top bar & footer | `#Top`, `#site-header`, `#Top .site-nav`, `#Bottom`, `#Logo`, `#LogoMobile` | `#Logo` is a dark bitmap; apply `filter: var(--vt-logo-filter)` so it stays visible on dark backgrounds. Style `:is(#Top, #site-header) a.top:any-link`. |
| Search box | `:is(#Top, #site-header) #search-container`, `#search-container::before`, `#search-container #search`, `#search-container #search-result`, `.search-item` | `#search-container::before` renders the magnifying glass icon; filter it with `--vt-logo-filter` so it remains legible in dark mode. |
| Cards & rows | `#Wrapper .box`, `#Top .box`, `#Wrapper .box > :is(.cell, .inner, .header, .subtle)`, `#Rightbar .box > :is(.cell, .inner, .header)` | Always neutralize empty boxes: `#Wrapper .box:empty, #Wrapper #pro-campaign-container:not(:has(> *)) { border: 0 !important; }`. **Do not** overwrite inline padding on threaded reply rows: exclude `.reply-threads-d > .cell[data-depth]` and `.reply-threads-f.reply-lines-on > .cell[data-reply-id]` so reply tree connector lines stay aligned. |
| Sidebar balance & CTA | `#Wrapper .balance_area`, `#Rightbar .box:has(a.super.button[href="/signup"])` | Keep `.balance_area` `white-space: nowrap; font-variant-numeric: tabular-nums;`. |

## 3. Home Scene (`home`)

- **Primary & secondary tabs**: `#Wrapper #Tabs`, `#Tabs a.tab:any-link`, `#Tabs a.tab_current:any-link`, `#Wrapper #SecondaryTabs`, `#SecondaryTabs a`.
- **Topic list rows**: `#Wrapper .box > .cell.item`, `.item_title`, `#Wrapper .item_title a:any-link`, `#Wrapper .item_title a:visited`, `#Wrapper img.avatar`.
- **Metadata & node badges**: `#Wrapper :is(.topic_info, .ago, .gray, .fade, .snow, .chevron)`, `#Wrapper :is(a.node, a.tag):any-link`.
- **Reply count pills**: `#Wrapper :is(a.count_livid, a.count_orange, a.count_blue, a.count_green):any-link` (highlight unread/hot `.count_orange:not(:visited)`).
- **Hot topics & plane directory**: `#TopicsHot .item_hot_topic_title a`, `#Rightbar .box > :is(.cell, .inner) > a.item_node:any-link`, and plane headers `#Wrapper .box:has(> .inner > a.item_node) > .header:has(> .spacer + span[style])` (plane headers carry inline `background-color` / `color`, requiring `!important` to theme cleanly).

## 4. Topic Detail Scene (`topic`)

- **Topic header**: `#Wrapper .box > .header:has(h1)`, `#Wrapper .header h1`.
- **Post body & replies**: `#Wrapper .topic_content`, `#Wrapper .reply_content`, `#Wrapper #topic-replies a.dark:any-link`.
- **Rich text inside posts**: `#Wrapper :is(.topic_content, .reply_content) :is(pre, code, kbd)`, `blockquote`, `a:any-link`. Ensure `pre` has `box-sizing: border-box; max-width: 100%; overflow: auto;` so long code blocks never push horizontal scroll.
- **Topic actions & subtles**: `#Wrapper :is(.topic_buttons, .cell.buttons, .inner.buttons)`, `#Wrapper .subtle`, `#Wrapper :is(.page_normal, .page_current)`.

### Threaded Replies (楼中楼)

V2EX renders nested conversations inside `#topic-replies` in two modes; the `topic` fixture uses the tree mode (`.reply-threads-d`).

| Mode / Element | Selectors & Variables | Adaptation Rules |
| --- | --- | --- |
| Tree mode (`.reply-threads-d`) | `#topic-replies .box.reply-threads.reply-threads-d`, `.reply-threads-d > .cell[data-depth]`, `.reply-tree-line`, `.reply-tree-join`, `.reply-tree-join.reply-tree-straight`, `.reply-toggle`, `.reply-tree-more`, `.reply-tree-folded`, `--tree-line`, `--tree-line-hot` | **Preserve native `padding-left` and avatar dimensions** (`48px` root / `24px` child via `--tree-size`): exclude `.reply-threads-d > .cell[data-depth]` from generic `.box > .cell` padding rules so connector lines align with avatar centers. Keep child rows visually grouped—V2EX adds `border-top` only before root replies (`.cell[data-depth] + .cell[data-depth="0"]`). Override `--tree-line` / `--tree-line-hot` if the theme needs sharper or subtler connectors than `color-mix(var(--color-fade) 70%, transparent)`. |
| Flat line mode (`.reply-threads-f`) | `.reply-threads-f.reply-lines-on > .cell[data-reply-id]`, `.reply-lines` (SVG `path`, `circle`), `a.reply-line-to`, `--reply-line-0` .. `--reply-line-5` | Exclude `.reply-threads-f.reply-lines-on > .cell[data-reply-id]` from generic `.box > .cell` padding so `--reply-lane-pad` stays intact. Station circles fill with `--box-background-color`; customize `--reply-line-0`..`--reply-line-5` when harmonizing lane colors with a stylized palette. |
| Quoted parent strips | `a.reply-strip`, `.reply-strip-who`, `.reply-strip-text`, `.reply-parent`, `.reply-parent-text`, `.reply-parent-cancel`, `.reply-quote-no`, `--subtle-blue-background-color`, `--color-blue` | Map `--subtle-blue-background-color` (accent tint) and `--color-blue` (accent) or style `a.reply-strip` / `.reply-parent` directly so quoted reply bars stay readable in both light and dark modes. |

## 5. Settings Scene (`settings`)

- **Settings tabs**: `#Wrapper :is(a.tab, a.tab_current)[href^="/settings/"]`.
- **On/off switches**: `#Wrapper form[action="/settings"] .onoffswitch` (`.frame::before` = ON label, `.frame::after` = OFF label, `.switch` = thumb, `input:focus-visible + label` = focus ring).
- **Theme switch control**: `#Wrapper:has(form[action="/settings"]) .theme-switch` exposes native CSS variables:
  - `--theme-switch-track-color`, `--theme-switch-track-hover-color`
  - `--theme-switch-thumb-color`, `--theme-switch-thumb-hover-color`, `--theme-switch-thumb-shadow`
  - `--theme-switch-glyph-color`, `--theme-switch-glyph-hover-color`, `--theme-switch-glyph-chosen-color`, `--theme-switch-glyph-chosen-hover-color`
- **Inputs, textareas & buttons**:
  - Inputs: `:is(#Wrapper, #Top, #site-header, #Bottom) :is(.sl, .sll, .sls, .ml, .mll, .mle)` (use mono font on `.mll, .mle, .ml.code`).
  - Native `<select>` & Select2: `#Wrapper form[action="/settings"] :is(select:not(.select2-hidden-accessible), .select2-selection--single)`, `.select2-selection__rendered`, `.select2-selection__arrow b`, plus body-appended open menus `:root:has(form[action="/settings"]) body > .select2-container--open :is(.select2-dropdown, .select2-search__field, .select2-results__option--selected, .select2-results__option--highlighted)`.
  - Buttons: `:is(#Wrapper, #Top, #site-header, #Bottom) .super.button`, primary submits `:is(#Wrapper, #Top, #site-header) :is(input[type="submit"], button[type="submit"], a[href="/signup"]).super.normal.button`.

## 6. Responsive & Accessibility Baseline

Always include narrow-screen breakpoints so `390×844` has zero horizontal overflow:

```css
@media (max-width: 840px) {
  #Main { margin-inline: 0; }
  #Wrapper > .content:has(> #Main) { display: flex; flex-direction: column; }
  #Rightbar { float: none; order: 1; width: auto; }
  #Leftbar:empty { display: none; }
}
@media (max-width: 520px) {
  #Top { height: auto; }
  #Top .site-nav { flex-wrap: wrap; gap: 6px; padding-block: 8px; }
  #Top #search-container { margin-left: 0; flex: 1 1 90px; width: auto; max-width: 245px; }
  #Wrapper .cell.item td[width="70"] { width: 42px; }
  #Wrapper .cell.item td[width="48"] { width: 32px; }
  #Wrapper .cell.item td[width="48"] .avatar { width: 32px !important; }
}
```

Add visible `:focus-visible` outlines on interactive controls, `::selection` styling, and `@media (prefers-reduced-motion: reduce)` transitions reset.
