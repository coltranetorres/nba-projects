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
