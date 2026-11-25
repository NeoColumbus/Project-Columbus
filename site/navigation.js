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
  const guide = document.querySelector('.chapter-guide');
  if (guide) {
    const select = guide.querySelector('select');
    const entries = [...document.querySelectorAll('#top section[aria-labelledby]')].flatMap(section => {
      const label = section.querySelector('.kicker')?.textContent.trim();
      const heading = document.getElementById(section.getAttribute('aria-labelledby'));
      return heading && /^\d{2} \//.test(label) ? [{heading, label}] : [];
    });
    for (const {heading, label} of [...entries].sort((a,b) => a.label.localeCompare(b.label))) {
      select.add(new Option(label, heading.id));
    }
    guide.hidden = false;
    guide.querySelector('button').addEventListener('click', () => {
      const target = document.getElementById(select.value);
      location.hash = target.id;
      revealFragment();
      target.tabIndex = -1;
      target.focus({preventScroll:true});
      target.scrollIntoView();
    });
    let scheduled = false;
    function reflectChapter() {
      scheduled = false;
      if (guide.contains(document.activeElement)) return;
      const current = entries.filter(({heading}) => heading.getClientRects().length && heading.getBoundingClientRect().top < innerHeight * .45).pop();
      select.value = (current || entries[0]).heading.id;
    }
    window.addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(reflectChapter); }
    }, {passive:true});
    reflectChapter();
  }
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
