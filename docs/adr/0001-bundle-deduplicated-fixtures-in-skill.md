# Bundle Deduplicated Offline Fixtures Inside the Distributable Skill

Users who install `skills/v2ex-theme` via a skill installer do not have a local clone of the `v2ex-theme` repository, yet the skill must preview and verify themes against the three canonical V2EX fixtures (`home`, `topic`, `settings`) offline. We bundle a deduplicated copy of these fixtures inside `skills/v2ex-theme/` (extracting the ~2.08 MB of base64-inlined V2EX styles repeated across all three snapshots into a single shared asset) and maintain a one-way sync script plus a consistency test against `scripts/fixtures/`.

## Considered Options

- **Reference `scripts/fixtures/` directly**: Impossible for external installs without a local repository clone.
- **Copy the three raw HTML files (~6.7 MB)**: Doubles repository weight and bloats skill downloads with 3× duplicated inline CSS/fonts.
- **Fetch fixtures from GitHub Raw at runtime**: Keeps the skill tiny, but breaks offline use and is unreliable for Chinese V2EX users when `raw.githubusercontent.com` is slow or blocked.

## Consequences

- `skills/v2ex-theme` works 100% offline immediately after installation.
- Updating `scripts/fixtures/` requires running the sync script so the bundled fixtures stay aligned; a Vitest check enforces sync in CI/local tests.
