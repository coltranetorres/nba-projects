const vscode = acquireVsCodeApi();
const ball = document.querySelector('.ball');

ball.addEventListener('animationend', (event) => {
  if (event.animationName === 'land') {
    vscode.postMessage({ type: 'done' });
  }
});
