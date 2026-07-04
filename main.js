document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (!nav || !hamburger || !mobileMenu) return;

  const setMenuOpen = (isOpen) => {
    mobileMenu.classList.toggle('open', isOpen);
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  };

  const updateScrolledState = () => {
    nav.classList.toggle('scrolled', window.scrollY > 8 || mobileMenu.classList.contains('open'));
  };

  hamburger.setAttribute('aria-controls', 'mobileMenu');
  hamburger.setAttribute('aria-expanded', 'false');

  hamburger.addEventListener('click', () => {
    setMenuOpen(!mobileMenu.classList.contains('open'));
    updateScrolledState();
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      setMenuOpen(false);
      updateScrolledState();
    });
  });

  document.addEventListener('click', (event) => {
    if (!mobileMenu.classList.contains('open')) return;
    if (nav.contains(event.target)) return;

    setMenuOpen(false);
    updateScrolledState();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;

    setMenuOpen(false);
    updateScrolledState();
  });

  window.addEventListener('scroll', updateScrolledState, { passive: true });
  updateScrolledState();
});
