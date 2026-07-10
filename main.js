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


window.submitPuckProForm = async function submitPuckProForm(form, formType) {
  const submitButton = form.querySelector('[type="submit"]');
  const originalText = submitButton ? submitButton.textContent : '';
  const fields = {};

  form.querySelectorAll('input, textarea, select').forEach((field) => {
    if (!field.id && !field.name) return;
    if (field.type === 'hidden' || field.disabled) return;

    const key = field.name || field.id.replace(/^[a-z]+-/, '');
    if (field.type === 'checkbox') {
      fields[key] = field.checked ? 'Yes' : 'No';
      return;
    }

    fields[key] = field.value.trim();
  });

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
  }

  try {
    const response = await fetch('/api/send-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formType, fields }),
    });

    if (!response.ok) {
      throw new Error('Form submission failed');
    }

    return true;
  } catch (error) {
    alert('Something went wrong sending the form. Please email booking@puckpromedia.com directly.');
    return false;
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
};


document.addEventListener('click', (event) => {
  const toggle = event.target.closest('.pkg-feature-toggle');
  if (!toggle) return;

  const feature = toggle.closest('.pkg-feature');
  const isOpen = feature.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
});
