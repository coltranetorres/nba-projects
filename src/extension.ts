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
