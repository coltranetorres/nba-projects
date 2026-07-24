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
