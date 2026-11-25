(() => {
  const viewer = document.querySelector('.print-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;
  const prints = Array.from(document.querySelectorAll('.print-catalogue a'));
  const image = viewer.querySelector('img');
  const caption = viewer.querySelector('#print-caption');
  let index = 0;
  function show(position) {
    index = (position + prints.length) % prints.length;
    image.src = prints[index].href;
    image.alt = prints[index].textContent.trim();
    caption.textContent = (index + 1) + ' / ' + prints.length + '   ' + image.alt;
  }
  prints.forEach((link, position) => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(position);
    viewer.showModal();
  }));
  viewer.querySelectorAll('[data-print-step]').forEach(button =>
    button.addEventListener('click', () => show(index + Number(button.dataset.printStep))));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
})();
