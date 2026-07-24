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
