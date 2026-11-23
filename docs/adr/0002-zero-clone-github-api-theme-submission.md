# Zero-Clone GitHub API Theme Submission Skill

External users who author a V2EX theme via `skills/v2ex-theme-create` (or by hand) should be able to publish it to `yuyinws/v2ex-theme` under `public/themes/<slug>/` without manually forking or cloning the repository. We split submission into a dedicated skill (`skills/v2ex-theme-submit`, paired symmetrically with `skills/v2ex-theme-create`) backed by a zero-dependency Node script that talks directly to the GitHub REST and Git Data APIs using the contributor's existing `GITHUB_TOKEN` / `GH_TOKEN` or `gh auth token`.

## Considered Options

- **Pure client-side GitHub API with automatic silent fork (chosen)**: Zero backend infrastructure, no secrets or GitHub App to host, commits and PRs are authored directly by the contributor's GitHub account, and no local `git clone` is needed. Contributors without write access get an automatically created/synced fork; maintainers with push access branch directly in `yuyinws/v2ex-theme`.
- **Server-side proxy + GitHub App on Cloudflare Workers**: Avoids creating a fork in the contributor's GitHub account and removes the `gh`/token requirement, but introduces backend auth, abuse/rate-limit controls, App key management, and bot-authored PRs.
- **Embed a GitHub OAuth Device Flow App in the CLI**: Allows browser login without `gh` CLI (closest to Raycast's extension publish flow), but requires registering and maintaining a public OAuth App client ID. Deferred until zero-`gh` adoption justifies the extra setup.
- **Merge submission into `v2ex-theme-create`**: Keeps one skill, but blurs creation/visual review with external GitHub writes and prevents hand-authored CSS themes from using submission independently.

## Consequences

- `skills/v2ex-theme` is renamed to `skills/v2ex-theme-create` so creation and submission form a clear, symmetrical pair (`v2ex-theme-create` + `v2ex-theme-submit`).
- PRs submitted through `v2ex-theme-submit` contain only `public/themes/<slug>/theme.css` and `public/themes/<slug>/theme.json` in a single atomic commit; `.webp` gallery previews remain the maintainer's responsibility (`npm run screenshots:themes`).
- Upstream slug collisions are detected in a read-only preflight step so contributors explicitly decide between renaming or updating an existing theme, and re-running submission while a PR is open appends a commit to that PR instead of creating duplicates.
