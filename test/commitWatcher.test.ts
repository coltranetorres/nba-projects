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

run('HEAD change with a matching log entry but no commitDate is not a new commit', () => {
  const result = checkForNewCommit('abc', 'def', { hash: 'def' });
  assert.strictEqual(result.isNewCommit, false);
});

run('HEAD change with a commit dated exactly 15000ms ago is a new commit (inclusive boundary)', () => {
  const exactlyFifteenSecondsAgo = new Date(Date.now() - 15000);
  const now = new Date();
  const result = checkForNewCommit('abc', 'def', { hash: 'def', commitDate: exactlyFifteenSecondsAgo }, now);
  assert.strictEqual(result.isNewCommit, true);
});

run('HEAD change with a future-dated commit (negative age) is not a new commit', () => {
  const oneSecondInFuture = new Date(Date.now() + 1000);
  const now = new Date();
  const result = checkForNewCommit('abc', 'def', { hash: 'def', commitDate: oneSecondInFuture }, now);
  assert.strictEqual(result.isNewCommit, false);
});

console.log('All commitWatcher tests passed.');
