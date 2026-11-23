# V2EX Theme

A catalog of pure-CSS V2EX custom themes, offline verification snapshots, and the distributable skill for authoring new themes.

## Language

**Theme**:
A standalone custom stylesheet (`theme.css`) that restyles V2EX without JavaScript, optionally paired with catalog metadata (`theme.json`) when published in this repository.
_Avoid_: Skin, style pack

**Scene**:
One of the three canonical V2EX pages used to preview and verify a theme: `home` (首页), `topic` (帖子详情), and `settings` (设置页).
_Avoid_: Page, view, template

**Fixture**:
A sanitized, self-contained HTML snapshot of a V2EX scene stripped of scripts, external resources, and personal account data for offline rendering.
_Avoid_: Mock, sample HTML, export

**Baseline**:
A fixture rendered with V2EX's own styles only (without a theme stylesheet), used to compare against a theme.
_Avoid_: Default theme, original page

**Preview Shell**:
A local browser viewer that injects a theme stylesheet into the three fixtures and provides controls for scene switching, color-scheme toggling, and baseline comparison.
_Avoid_: Dev preview, test page
