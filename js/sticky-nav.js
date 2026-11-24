/* ----------------------------------------------------------------
   Sticky Nav
   ----------------------------------------------------------------
   The navbar is pinned to the top of every page. Once the page has
   scrolled a little, this adds .is-scrolled so the logo and tabs
   get a dark glass backing and stay readable over light sections.

   Related files:
     • CSS: styles/style.css (Work Page Header)
---------------------------------------------------------------- */

const header = document.querySelector(".hero-header");

if (header) {
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 16);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}
