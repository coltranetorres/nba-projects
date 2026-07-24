# Kobe Git Commit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code extension that plays a Kobe Bryant sound effect and shows a short CSS toy-figure shooting animation in a webview popup every time a commit is made via VS Code's Source Control panel, then auto-closes.

**Architecture:** The extension subscribes to the built-in Git extension's repository change events, uses a pure, vscode-independent module (`commitWatcher.ts`) to decide whether a HEAD change represents a freshly-made commit (vs. pull/checkout), and on a positive detection opens a `WebviewPanel` (`popupPanel.ts`) loading a self-contained HTML/CSS/JS scene that plays the sound and runs the animation, then messages the extension host to dispose the panel when done.

**Tech Stack:** TypeScript, VS Code Extension API (`vscode.git` built-in extension API v1), plain Node `assert` for unit tests (no test framework needed), CSS `@keyframes` for animation.

## Global Constraints

- No LEGO-branded assets, logos, or trademarked imagery — original toy-block-style CSS figure only.
- Trigger source is VS Code's Source Control panel (via the `vscode.git` extension API) only — terminal-only `git commit` is out of scope for v1.
- Commit detection must ignore HEAD changes from `pull`/`checkout`/`fetch` — only treat a HEAD change as a fresh commit if the new HEAD's commit date is within the last 15 seconds.
- Popup: `vscode.WebviewPanel`, opened `ViewColumn.Beside` with `preserveFocus: true`, auto-closes when the webview reports the animation finished (via `postMessage`), not via a hardcoded host-side timer.
- Total animation+sound sequence target: ~2.5 seconds.
- Sound asset: `kobe_git_commit/KOBE (Meme Sound) - Sound Effect for Editing.mp3` (already present) — copy into `media/kobe.mp3`.
- No settings/mute toggle in v1 (disable via VS Code's extension UI instead).
- Unit tests only for `commitWatcher.ts`'s pure logic (plain Node `assert`, no VS Code test harness); everything else is verified manually via the Extension Development Host.

---

### Task 1: Project scaffolding

**Files:**
- Create: `kobe_git_commit/package.json`
- Create: `kobe_git_commit/tsconfig.json`
- Create: `kobe_git_commit/.gitignore`
- Create: `kobe_git_commit/.vscodeignore`
- Create: `kobe_git_commit/src/extension.ts`

**Interfaces:**
- Produces: `activate(context: vscode.ExtensionContext)` and `deactivate()` exports from `src/extension.ts` (entry point referenced by `package.json`'s `main`), compiled to `out/src/extension.js`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "kobe-git-commit",
  "displayName": "Kobe Git Commit",
  "description": "Plays a Kobe sound and a toy-figure shooting animation every time you make a git commit.",
  "version": "0.0.1",
  "private": true,
  "engines": {
    "vscode": "^1.90.0"
  },
  "categories": ["Other"],
  "activationEvents": ["onStartupFinished"],
  "main": "./out/src/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "kobeGitCommit.previewCelebration",
        "title": "Kobe: Preview Celebration"
      }
    ]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/commitWatcher.test.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.90.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "outDir": "out",
    "rootDir": ".",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", ".vscode-test", "out"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
out/
*.vsix
.vscode-test/
```

- [ ] **Step 4: Create `.vscodeignore`**

```
.vscode/**
.vscode-test/**
src/**
test/**
docs/**
tsconfig.json
.gitignore
**/*.map
**/*.ts
node_modules/**
```

- [ ] **Step 5: Create minimal `src/extension.ts`**

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Kobe Git Commit extension activated.');
}

export function deactivate() {}
```

- [ ] **Step 6: Install dependencies**

Run: `cd kobe_git_commit && npm install`
Expected: exits 0, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 7: Compile and verify**

Run: `cd kobe_git_commit && npm run compile`
Expected: exits 0, creates `out/src/extension.js`.

- [ ] **Step 8: Commit**

```bash
cd kobe_git_commit
git add package.json package-lock.json tsconfig.json .gitignore .vscodeignore src/extension.ts
git commit -m "Scaffold VS Code extension project"
```

---

### Task 2: Commit-detection logic (TDD)

**Files:**
- Create: `kobe_git_commit/src/commitWatcher.ts`
- Test: `kobe_git_commit/test/commitWatcher.test.ts`

**Interfaces:**
- Consumes: nothing (pure module, no imports from `vscode`).
- Produces: `export interface CommitLogEntry { hash: string; commitDate?: Date; }`, `export interface CommitCheckResult { isNewCommit: boolean; }`, `export function checkForNewCommit(previousHead: string | undefined, currentHead: string | undefined, latestLogEntry: CommitLogEntry | undefined, now?: Date): CommitCheckResult`. Task 5 imports `CommitLogEntry` and `checkForNewCommit` from this file.

- [ ] **Step 1: Write the failing tests**

Create `test/commitWatcher.test.ts`:

```typescript
import assert from 'node:assert';
import { checkForNewCommit } from '../src/commitWatcher';

function run(name: string, fn: () => void) {
  fn();
  console.log(`PASS: ${name}`);
}

run('no change in HEAD is not a new commit', () => {
  const result = checkForNewCommit('abc', 'abc', { hash: 'abc', commitDate: new Date() });
  assert.strictEqual(result.isNewCommit, false);
});

run('HEAD change with no log entry is not a new commit', () => {
  const result = checkForNewCommit('abc', 'def', undefined);
  assert.strictEqual(result.isNewCommit, false);
});

run('HEAD change where log entry hash does not match current head is not a new commit', () => {
  const result = checkForNewCommit('abc', 'def', { hash: 'zzz', commitDate: new Date() });
  assert.strictEqual(result.isNewCommit, false);
});

run('HEAD change with a commit dated 1 second ago is a new commit', () => {
  const oneSecondAgo = new Date(Date.now() - 1000);
  const now = new Date();
  const result = checkForNewCommit('abc', 'def', { hash: 'def', commitDate: oneSecondAgo }, now);
  assert.strictEqual(result.isNewCommit, true);
});

run('HEAD change with a commit dated 20 seconds ago is not a new commit (too old)', () => {
  const twentySecondsAgo = new Date(Date.now() - 20000);
  const now = new Date();
  const result = checkForNewCommit('abc', 'def', { hash: 'def', commitDate: twentySecondsAgo }, now);
  assert.strictEqual(result.isNewCommit, false);
});

run('undefined previous head with a recent matching commit is a new commit', () => {
  const oneSecondAgo = new Date(Date.now() - 1000);
  const now = new Date();
  const result = checkForNewCommit(undefined, 'def', { hash: 'def', commitDate: oneSecondAgo }, now);
  assert.strictEqual(result.isNewCommit, true);
});

console.log('All commitWatcher tests passed.');
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd kobe_git_commit && npx tsc -p ./ && node ./out/test/commitWatcher.test.js`
Expected: FAIL — TypeScript compile error, `Cannot find module '../src/commitWatcher'`.

- [ ] **Step 3: Write `src/commitWatcher.ts`**

```typescript
export interface CommitLogEntry {
  hash: string;
  commitDate?: Date;
}

export interface CommitCheckResult {
  isNewCommit: boolean;
}

const RECENCY_WINDOW_MS = 15_000;

export function checkForNewCommit(
  previousHead: string | undefined,
  currentHead: string | undefined,
  latestLogEntry: CommitLogEntry | undefined,
  now: Date = new Date()
): CommitCheckResult {
  if (!currentHead || currentHead === previousHead) {
    return { isNewCommit: false };
  }

  if (!latestLogEntry || latestLogEntry.hash !== currentHead || !latestLogEntry.commitDate) {
    return { isNewCommit: false };
  }

  const ageMs = now.getTime() - latestLogEntry.commitDate.getTime();
  return { isNewCommit: ageMs >= 0 && ageMs <= RECENCY_WINDOW_MS };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd kobe_git_commit && npm run compile && node ./out/test/commitWatcher.test.js`
Expected: PASS — prints 6 `PASS:` lines and `All commitWatcher tests passed.`, exits 0.

- [ ] **Step 5: Commit**

```bash
cd kobe_git_commit
git add src/commitWatcher.ts test/commitWatcher.test.ts
git commit -m "Add commit-detection logic with unit tests"
```

---

### Task 3: Media assets — sound, scene HTML/CSS/JS

**Files:**
- Create: `kobe_git_commit/media/kobe.mp3` (copy of the existing mp3)
- Create: `kobe_git_commit/media/webview.html`
- Create: `kobe_git_commit/media/webview.css`
- Create: `kobe_git_commit/media/webview.js`

**Interfaces:**
- Produces: `webview.html` with template placeholders `{{cspSource}}`, `{{cssUri}}`, `{{jsUri}}`, `{{audioUri}}` that Task 4's `popupPanel.ts` will string-replace before setting `panel.webview.html`. `webview.js` posts `{ type: 'done' }` via `vscode.postMessage` when the ball's landing animation ends — Task 4's message listener depends on this exact message shape.

- [ ] **Step 1: Copy the sound file into `media/`**

Run (from `kobe_git_commit/`):
```bash
mkdir -p media
cp "KOBE (Meme Sound) - Sound Effect for Editing.mp3" "media/kobe.mp3"
```
Expected: `media/kobe.mp3` exists.

- [ ] **Step 2: Create `media/webview.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; img-src {{cspSource}}; media-src {{cspSource}}; style-src {{cspSource}} 'unsafe-inline'; script-src {{cspSource}};">
<link rel="stylesheet" href="{{cssUri}}">
<title>Kobe!</title>
</head>
<body>
  <div class="scene">
    <div class="hoop">
      <div class="backboard"></div>
      <div class="rim"></div>
      <div class="net"></div>
    </div>
    <div class="figure">
      <div class="head"></div>
      <div class="jersey">24</div>
      <div class="arm arm-left"></div>
      <div class="arm arm-right"></div>
      <div class="shorts"></div>
      <div class="leg leg-left"></div>
      <div class="leg leg-right"></div>
    </div>
    <div class="ball"></div>
  </div>
  <audio id="kobe-audio" src="{{audioUri}}" autoplay></audio>
  <script src="{{jsUri}}"></script>
</body>
</html>
```

- [ ] **Step 3: Create `media/webview.css`**

```css
body {
  margin: 0;
  background: #0d0d0d;
  overflow: hidden;
}

.scene {
  position: relative;
  width: 360px;
  height: 260px;
  margin: 0 auto;
}

.hoop {
  position: absolute;
  top: 20px;
  right: 50px;
}

.backboard {
  width: 6px;
  height: 60px;
  background: #eee;
}

.rim {
  position: absolute;
  top: 55px;
  left: -34px;
  width: 40px;
  height: 6px;
  background: #F58426;
  border-radius: 2px;
  animation: rimShake 0.4s ease-out 1.7s;
}

.net {
  position: absolute;
  top: 61px;
  left: -30px;
  width: 32px;
  height: 24px;
  border: 2px solid #ccc;
  border-top: none;
  border-radius: 0 0 6px 6px;
  opacity: 0.85;
}

.figure {
  position: absolute;
  bottom: 10px;
  left: 40px;
  width: 40px;
  animation: windup 0.5s ease-out;
}

.head {
  width: 16px;
  height: 16px;
  background: #f4c542;
  border-radius: 3px;
  margin: 0 auto;
}

.jersey {
  width: 24px;
  height: 26px;
  background: #552583;
  color: #FDB927;
  font-size: 9px;
  font-family: sans-serif;
  font-weight: bold;
  text-align: center;
  line-height: 26px;
  margin: 2px auto 0;
  border-radius: 2px;
}

.arm {
  position: absolute;
  top: 18px;
  width: 6px;
  height: 18px;
  background: #552583;
  border-radius: 3px;
}

.arm-left {
  left: -6px;
}

.arm-right {
  right: -6px;
  transform-origin: top center;
  animation: shootArm 1.2s ease-out 0.5s forwards;
}

.shorts {
  width: 22px;
  height: 12px;
  background: #FDB927;
  margin: 0 auto;
}

.leg-left,
.leg-right {
  width: 6px;
  height: 18px;
  background: #552583;
  display: inline-block;
  margin: 0 1px;
}

.ball {
  position: absolute;
  bottom: 26px;
  left: 66px;
  width: 12px;
  height: 12px;
  background: #F58426;
  border-radius: 50%;
  opacity: 0;
  animation:
    shootBall 1.2s ease-in 0.7s forwards,
    land 0.4s ease-in 1.9s forwards;
}

@keyframes windup {
  0% { transform: translateY(0); }
  60% { transform: translateY(4px); }
  100% { transform: translateY(0); }
}

@keyframes shootArm {
  0% { transform: rotate(30deg); }
  40% { transform: rotate(-40deg); }
  100% { transform: rotate(-70deg); }
}

@keyframes shootBall {
  0% { opacity: 1; transform: translate(0, 0) scale(1); }
  50% { transform: translate(90px, -110px) scale(0.9); }
  100% { transform: translate(180px, -40px) scale(0.8); opacity: 1; }
}

@keyframes rimShake {
  0%, 100% { transform: translateX(0); }
  30% { transform: translateX(-2px); }
  60% { transform: translateX(2px); }
}

@keyframes land {
  0% { opacity: 1; transform: translate(180px, -40px) scale(0.8); }
  100% { opacity: 0; transform: translate(180px, 20px) scale(0.6); }
}
```

- [ ] **Step 4: Create `media/webview.js`**

```javascript
const vscode = acquireVsCodeApi();
const ball = document.querySelector('.ball');
const audio = document.getElementById('kobe-audio');

audio.play().catch(() => {
  // Autoplay can be blocked in some contexts; animation still runs.
});

ball.addEventListener('animationend', (event) => {
  if (event.animationName === 'land') {
    vscode.postMessage({ type: 'done' });
  }
});
```

- [ ] **Step 5: Commit**

```bash
cd kobe_git_commit
git add media/
git commit -m "Add webview scene assets: sound, HTML, CSS animation, JS"
```

---

### Task 4: Webview panel manager + manual preview command

**Files:**
- Create: `kobe_git_commit/src/popupPanel.ts`
- Modify: `kobe_git_commit/src/extension.ts`

**Interfaces:**
- Consumes: `media/webview.html`, `media/webview.css`, `media/webview.js`, `media/kobe.mp3` (Task 3); the `kobeGitCommit.previewCelebration` command id already declared in `package.json` (Task 1).
- Produces: `export function showKobeCelebration(extensionUri: vscode.Uri): void` from `src/popupPanel.ts`. Task 5 calls this directly on detected commits.

- [ ] **Step 1: Write `src/popupPanel.ts`**

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';

let activePanel: vscode.WebviewPanel | undefined;

export function showKobeCelebration(extensionUri: vscode.Uri): void {
  if (activePanel) {
    activePanel.dispose();
  }

  const mediaUri = vscode.Uri.joinPath(extensionUri, 'media');

  const panel = vscode.window.createWebviewPanel(
    'kobeGitCommit',
    'Kobe!',
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      localResourceRoots: [mediaUri],
    }
  );

  activePanel = panel;

  const htmlPath = vscode.Uri.joinPath(mediaUri, 'webview.html').fsPath;
  const rawHtml = fs.readFileSync(htmlPath, 'utf8');

  const cssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.css'));
  const jsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.js'));
  const audioUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'kobe.mp3'));

  panel.webview.html = rawHtml
    .replace(/{{cspSource}}/g, panel.webview.cspSource)
    .replace('{{cssUri}}', cssUri.toString())
    .replace('{{jsUri}}', jsUri.toString())
    .replace('{{audioUri}}', audioUri.toString());

  panel.webview.onDidReceiveMessage((message: { type?: string }) => {
    if (message?.type === 'done') {
      panel.dispose();
    }
  });

  panel.onDidDispose(() => {
    if (activePanel === panel) {
      activePanel = undefined;
    }
  });
}
```

- [ ] **Step 2: Wire the manual preview command in `src/extension.ts`**

Replace the contents of `src/extension.ts` with:

```typescript
import * as vscode from 'vscode';
import { showKobeCelebration } from './popupPanel';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('kobeGitCommit.previewCelebration', () => {
      showKobeCelebration(context.extensionUri);
    })
  );
}

export function deactivate() {}
```

- [ ] **Step 3: Compile**

Run: `cd kobe_git_commit && npm run compile`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Manually verify in the Extension Development Host**

1. Open the `kobe_git_commit` folder in VS Code.
2. Press F5 (or run "Debug: Start Debugging") to launch the Extension Development Host.
3. In the new window, open the Command Palette and run "Kobe: Preview Celebration".
4. Confirm: a panel opens beside the editor, the Kobe sound plays, the figure winds up and shoots, the ball arcs into the hoop, and the panel closes on its own roughly 2.5 seconds after opening.

- [ ] **Step 5: Commit**

```bash
cd kobe_git_commit
git add src/popupPanel.ts src/extension.ts
git commit -m "Add webview panel manager and manual preview command"
```

---

### Task 5: Wire real git-commit detection, README, final verification

**Files:**
- Create: `kobe_git_commit/src/gitTypes.ts`
- Modify: `kobe_git_commit/src/extension.ts`
- Create: `kobe_git_commit/README.md`

**Interfaces:**
- Consumes: `checkForNewCommit`, `CommitLogEntry` from `src/commitWatcher.ts` (Task 2); `showKobeCelebration` from `src/popupPanel.ts` (Task 4).
- Produces: fully working `activate()` that subscribes to real repository changes; no further tasks depend on this file.

- [ ] **Step 1: Write minimal Git extension API types in `src/gitTypes.ts`**

```typescript
import type { Event } from 'vscode';
import type { CommitLogEntry } from './commitWatcher';

export interface GitExtensionExports {
  getAPI(version: 1): GitAPI;
}

export interface GitAPI {
  repositories: Repository[];
  onDidOpenRepository: Event<Repository>;
}

export interface Repository {
  rootUri: { toString(): string };
  state: RepositoryState;
  log(options?: { maxEntries?: number }): Promise<CommitLogEntry[]>;
}

export interface RepositoryState {
  HEAD: { commit?: string } | undefined;
  onDidChange: Event<void>;
}
```

- [ ] **Step 2: Replace `src/extension.ts` with full wiring**

```typescript
import * as vscode from 'vscode';
import { checkForNewCommit } from './commitWatcher';
import { showKobeCelebration } from './popupPanel';
import { GitExtensionExports, Repository } from './gitTypes';

const lastHeads = new Map<string, string | undefined>();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('kobeGitCommit.previewCelebration', () => {
      showKobeCelebration(context.extensionUri);
    })
  );

  const gitExtension = vscode.extensions.getExtension<GitExtensionExports>('vscode.git');
  if (!gitExtension) {
    return;
  }

  gitExtension.activate().then((exports) => {
    const api = exports.getAPI(1);

    const watchRepo = (repo: Repository) => {
      const key = repo.rootUri.toString();
      lastHeads.set(key, repo.state.HEAD?.commit);

      context.subscriptions.push(
        repo.state.onDidChange(async () => {
          const previousHead = lastHeads.get(key);
          const currentHead = repo.state.HEAD?.commit;

          if (currentHead === previousHead) {
            return;
          }
          lastHeads.set(key, currentHead);

          let latestLogEntry;
          try {
            const entries = await repo.log({ maxEntries: 1 });
            latestLogEntry = entries[0];
          } catch {
            return;
          }

          const result = checkForNewCommit(previousHead, currentHead, latestLogEntry);
          if (result.isNewCommit) {
            showKobeCelebration(context.extensionUri);
          }
        })
      );
    };

    api.repositories.forEach(watchRepo);
    context.subscriptions.push(api.onDidOpenRepository(watchRepo));
  });
}

export function deactivate() {}
```

- [ ] **Step 3: Compile**

Run: `cd kobe_git_commit && npm run compile`
Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Write `README.md`**

```markdown
# Kobe Git Commit

Plays a Kobe Bryant sound effect and a toy-figure shooting animation every
time you make a git commit through VS Code's Source Control panel.

## Usage

Just commit as normal via the Source Control panel. A small panel opens
beside your editor, plays the sound, and animates the shot — it closes
itself automatically once the ball lands.

You can also preview it any time via the Command Palette:
**Kobe: Preview Celebration**.

## Development

- `npm install`
- `npm run compile`
- `npm test` — runs the commit-detection unit tests
- Press F5 in VS Code to launch the Extension Development Host
```

- [ ] **Step 5: Run unit tests one more time to confirm nothing broke**

Run: `cd kobe_git_commit && npm test`
Expected: PASS — 6 `PASS:` lines, `All commitWatcher tests passed.`, exits 0.

- [ ] **Step 6: Manually verify real commit detection end-to-end**

1. Launch the Extension Development Host (F5) from `kobe_git_commit`.
2. In that new window, open your local `nba-projects` clone as the workspace folder.
3. Make a small change, stage it, and commit via the Source Control panel.
4. Confirm the popup appears automatically within a second or two of the commit completing, plays sound + animation, and auto-closes — without needing to run the preview command.
5. Make a second commit and confirm the popup appears again (no stale-state issues from the first trigger).
6. Switch branches or pull in that repo and confirm the popup does **not** fire (recency filter working).

- [ ] **Step 7: Commit**

```bash
cd kobe_git_commit
git add src/gitTypes.ts src/extension.ts README.md
git commit -m "Wire real git-commit detection to celebration popup"
```

---

## Self-Review Notes

- **Spec coverage:** project setup (Task 1), commit detection with recency filter (Task 2, spec section "Commit detection"), webview animation/sound/auto-close (Tasks 3-4, spec section "Webview content"/"Popup lifecycle"), full wiring across any open repo (Task 5), unit + manual test plan (Tasks 2 and 5) — all spec sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO markers; all steps contain complete, runnable code.
- **Type consistency:** `CommitLogEntry` and `checkForNewCommit` signatures match between `commitWatcher.ts` (Task 2), its test (Task 2), and `gitTypes.ts`/`extension.ts` (Task 5). `showKobeCelebration(extensionUri: vscode.Uri)` matches between `popupPanel.ts` (Task 4) and both call sites in `extension.ts` (Tasks 4 and 5).
