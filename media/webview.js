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