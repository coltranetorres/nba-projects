# Kobe Git Commit — Design Spec

## Purpose

A VS Code extension that celebrates every git commit with a Kobe Bryant sound
effect and a short toy-figure animation (blocky "minifig"-style Kobe, #24
jersey) shooting a basketball into a hoop. Personal-use fun/gamification
extension — not intended for the marketplace.

## Scope

- Standalone VS Code extension, its own repo (`kobe_git_commit/`), independent
  of the NBA prediction-model content in the parent folder.
- Triggers on commits made via VS Code's built-in Git extension (Source
  Control panel), across any repo open in the workspace — not limited to
  this extension's own repo. Terminal `git commit` via native hooks is
  explicitly out of scope for v1.
- No LEGO-branded assets or logos are used — the character is an original
  blocky/toy-block-style CSS figure, not licensed LEGO IP.

## Architecture

```
extension.ts        — activation, wires Git API to popupPanel
commitWatcher.ts     — pure logic: detects "this HEAD change is a fresh commit"
popupPanel.ts        — creates/manages the webview panel lifecycle
media/webview.html   — popup content (structure)
media/webview.css    — court/hoop/figure/ball styling + keyframe animations
media/webview.js     — plays audio, posts "done" message when animation ends
media/kobe.mp3        — sound effect (already supplied by user)
```

### Commit detection (`commitWatcher.ts`)

The built-in `vscode.git` extension exposes no direct "onCommit" event, so a
commit is inferred:

1. For each repository, track the last-seen `repository.state.HEAD.commit`
   hash.
2. On `repository.state.onDidChange`, if the hash changed, fetch the latest
   log entry (`repository.log({ maxEntries: 1 })`).
3. Treat it as "you just committed" only if that entry's commit date is
   within the last 15 seconds. This filters out HEAD changes caused by
   `pull`, `checkout`, `fetch`, branch switches, etc. (which move HEAD to
   older, not-just-created commits).

This logic is written against a small interface (not the full `vscode.git`
types) so it can be unit-tested with plain Node assertions, independent of
the extension host.

### Popup lifecycle (`popupPanel.ts`)

- On a detected commit, create a `vscode.WebviewPanel`
  (`viewColumn: ViewColumn.Beside`, `preserveFocus: true`) loading
  `media/webview.html`, with `localResourceRoots` scoped to `media/`.
- Listen for `panel.webview.onDidReceiveMessage`; when the webview posts
  `{ type: 'done' }`, call `panel.dispose()`.
- If a new commit fires while a panel from a previous commit is still open,
  dispose the old one before creating the new one (avoid stacking popups).

### Webview content

- CSS-drawn court background, hoop (rim + backboard) near the top, and a
  blocky toy-figure Kobe (yellow head block, purple/gold jersey with "24",
  stubby limbs) built from stacked `div`s.
- Sequence (~2.5s total, via CSS `@keyframes`):
  1. Figure pops in / winds up (~0.5s)
  2. Shot release — ball leaves hand, arcs toward the hoop (~1.2s)
  3. Ball drops through net, rim-shake/swish flourish (~0.5s)
  4. Brief hang (~0.3s)
- `media/kobe.mp3` plays via an `<audio>` tag as soon as the webview loads,
  timed roughly to the wind-up/shoot beat.
- When the landing animation's `animationend` fires, `webview.js` calls
  `vscode.postMessage({ type: 'done' })`.

## File structure

```
kobe_git_commit/
  package.json
  tsconfig.json
  .gitignore
  .vscodeignore
  src/
    extension.ts
    commitWatcher.ts
    popupPanel.ts
  test/
    commitWatcher.test.ts
  media/
    webview.html
    webview.css
    webview.js
    kobe.mp3
  docs/superpowers/specs/2026-07-24-kobe-git-commit-design.md
```

## Testing

- **Unit tests**: `commitWatcher.ts`'s recency-filter logic, tested with
  plain Node `assert` (no VS Code test harness needed since the module
  doesn't import `vscode` types directly — it takes a minimal repo-log
  interface as input).
- **Manual verification**: run via the Extension Development Host
  (F5 / `vscode-test`), make a real commit in the user's `nba-projects`
  clone (or this repo), confirm sound plays, animation runs, and the panel
  auto-closes after the ball lands.

## Out of scope (v1)

- Terminal-only `git commit` (no Source Control panel involvement) —
  would require a native `post-commit` git hook; not built now.
- Configurable mute/toggle settings — can disable via VS Code's normal
  extension disable/uninstall.
- Any LEGO-licensed assets or branding.
