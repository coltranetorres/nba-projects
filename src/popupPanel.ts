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
