function initButton045() {
  const buttons = document.querySelectorAll('[data-button-045]');
  if (buttons.length === 0) return;

  let mm = gsap.matchMedia();

  buttons.forEach((element) => {
    const hoverRoot = element.closest('[data-hover]') || element;
    const inner = element.querySelector('[data-button-045-inner]') || element;
    let locked = false;

    function runPulse(click = false) {
      if (locked) return;
      locked = true;

      setTimeout(() => {
        locked = false;
      }, click ? 100 : 350);

      const el = inner;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const stretch = 0.75 * fs;
      const sx = (w + stretch) / w;
      const sy = (h - stretch * 0.33) / h;

      if (el._pulseTl && el._pulseTl.kill) el._pulseTl.kill();

      const tl = gsap.timeline();
      el._pulseTl = tl;
      el._pulseTl = gsap
        .timeline()
        .to(el, {
          scaleX: click ? sy : sx,
          scaleY: click ? sx * 1.3 : sy,
          duration: 0.1,
          ease: 'power1.out',
        })
        .to(element, {
          scale: click ? 0.8 : 1,
          duration: 0.1,
          ease: 'power1.out',
        }, '<')
        .to(el, {
          scaleX: 1,
          scaleY: 1,
          duration: 1,
          ease: 'elastic.out(1, 0.3)',
        })
        .to(element, {
          scale: 1,
          duration: 1,
          ease: 'elastic.out(1, 0.3)',
        }, '<');
    }

    const onFocusIn = () => {
      if (hoverRoot.matches(':focus-visible')) runPulse(false);
    };

    hoverRoot.addEventListener('pointerdown', () => runPulse(true));
    hoverRoot.addEventListener('focusin', onFocusIn);

    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      hoverRoot.addEventListener('mouseenter', () => runPulse(false));
    });
  });
}


// Initialize Button 045
document.addEventListener('DOMContentLoaded', () => {
  document.fonts.ready.then(function () {
    initButton045();
  });
});
