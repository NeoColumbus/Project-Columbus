(function () {
  function revealFragment() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    let opened = false;
    for (let node = target; node; node = node.parentElement) {
      if (node instanceof HTMLDetailsElement && !node.open) { node.open = true; opened = true; }
    }
    if (opened) target.scrollIntoView();
  }
  window.addEventListener('hashchange', revealFragment);
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.hash === location.hash) revealFragment();
  });
  revealFragment();
  const pause = document.querySelector('.marquee-pause');
  const track = document.querySelector('.marquee-track');
  if (pause && track) {
    pause.hidden = false;
    let paused = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    function updateMotion() {
      track.style.animationPlayState = paused || reduced.matches ? 'paused' : 'running';
      pause.disabled = reduced.matches;
      pause.setAttribute('aria-pressed', String(paused || reduced.matches));
      pause.textContent = reduced.matches ? 'Motion off' : paused ? 'Resume slogans' : 'Pause slogans';
    }
    pause.addEventListener('click', () => { paused = !paused; updateMotion(); });
    reduced.addEventListener('change', updateMotion);
    updateMotion();
  }
  const header = document.querySelector('.site-header');
  const nav = header?.querySelector('.nav');
  if (!nav) return;
  nav.id = nav.id || 'primary-navigation';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-toggle';
  button.textContent = 'Menu';
  button.setAttribute('aria-controls', nav.id);
  button.setAttribute('aria-expanded', 'false');
  header.insertBefore(button, nav);
  header.classList.add('nav-ready');
  function close() {
    button.setAttribute('aria-expanded', 'false');
    header.classList.remove('nav-open');
  }
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    header.classList.toggle('nav-open', open);
  });
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) close();
  });
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) {
      close();
      button.focus();
    }
  });
  window.matchMedia('(max-width: 1280px)').addEventListener('change', close);
})();
