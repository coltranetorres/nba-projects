import * as vscode from 'vscode';
import * as fs from 'fs';
import { spawn } from 'child_process';

let activePanel: vscode.WebviewPanel | undefined;

/**
 * Webview <audio> autoplay is blocked by Chromium's user-gesture policy
 * inside a freshly created webview's browsing context, even when the
 * panel itself was opened via a command (VS Code doesn't propagate that
 * activation into the webview). Playing via a detached PowerShell/WPF
 * MediaPlayer process sidesteps the browser entirely. Windows-only.
 */
function playKobeSound(mp3Path: string): void {
  if (process.platform !== 'win32') {
    return;
  }

  const escapedPath = mp3Path.replace(/'/g, "''");
  const script = [
    'Add-Type -AssemblyName PresentationCore;',
    '$player = New-Object System.Windows.Media.MediaPlayer;',
    `$player.Open([Uri]'${escapedPath}');`,
    '$player.Play();',
    'Start-Sleep -Milliseconds 4000;',
  ].join(' ');

  // Note: do NOT pass { detached: true } here — on Windows it silently
  // breaks WPF MediaPlayer's audio output (process runs and exits 0,
  // but no sound is produced). Confirmed by direct A/B testing.
  const child = spawn(
    'powershell.exe',
    ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', script],
    { stdio: 'ignore', windowsHide: true }
  );
  child.on('error', (err) => {
    console.error('Kobe Git Commit: failed to spawn powershell.exe', err);
  });
}

export function showKobeCelebration(extensionUri: vscode.Uri): void {
  if (activePanel) {
    activePanel.dispose();
  }

  const mediaUri = vscode.Uri.joinPath(extensionUri, 'media');

  playKobeSound(vscode.Uri.joinPath(mediaUri, 'kobe.mp3').fsPath);

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
  let rawHtml: string;
  try {
    rawHtml = fs.readFileSync(htmlPath, 'utf8');
  } catch (err) {
    console.error('Kobe Git Commit: failed to read webview.html', err);
    panel.dispose();
    return;
  }

  const cssUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.css'));
  const jsUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaUri, 'webview.js'));

  panel.webview.html = rawHtml
    .replace(/{{cspSource}}/g, panel.webview.cspSource)
    .replace('{{cssUri}}', cssUri.toString())
    .replace('{{jsUri}}', jsUri.toString());

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
