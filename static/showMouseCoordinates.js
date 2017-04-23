window.addEventListener('mousemove', (mouseEvent) => {
  consoleBuffer.push({
      method: 'info',
      arguments: `Mouse X: ${mouseEvent.clientX}, Y: ${mouseEvent.clientY}`,
      source: 'sketch'
  });
});
