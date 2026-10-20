// Logo Stack Loader (Osmo Supply), with the Lake logo.
// Plays once when the page opens, then hides itself.

function initLogoLoader() {
  const loader = document.querySelector("[data-logo-loader-init]");
  if (!loader) return;

  const bg = loader.querySelector("[data-logo-loader-bg]");
  const stack = loader.querySelector("[data-logo-loader-stack]");
  const logo = loader.querySelector("[data-logo-loader-logo]");
  const bar = loader.querySelector("[data-logo-loader-bar]");
  const track = loader.querySelector("[data-logo-loader-track]") || bar;
  if (!bg || !stack || !logo) return;

  const resetTargets = [...loader.querySelectorAll("[data-logo-loader-reset]")].filter(
    (element) => element !== stack
  );
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Five copies of the logo fan out behind it during the tilt
  const logoDuplicates = [];
  for (let i = 0; i < 5; i++) {
    const duplicate = logo.cloneNode(true);
    duplicate.setAttribute("aria-hidden", "true");
    stack.appendChild(duplicate);
    logoDuplicates.push(duplicate);
  }

  const em = parseFloat(getComputedStyle(stack).fontSize);

  const timeline = gsap.timeline({
    defaults: { duration: 0.4, ease: "power2.out" },
  });

  gsap.set(logoDuplicates, { opacity: 0, z: 0 });

  if (resetTargets.length) {
    timeline.set(resetTargets, { autoAlpha: 1 }, 0);
  }

  timeline.to(stack, { autoAlpha: 1, duration: 0.5 });

  if (reduceMotion) {
    // Reduced motion: the logo just fades in and out, no tilting
    timeline
      .addLabel("impact", "+=0.6")
      .to(loader, { autoAlpha: 0, duration: 0.5, ease: "power2.inOut" }, "impact+=0.5");
  } else {
    timeline
      .addLabel("tilt", "-=0.1")
      .to(stack, { rotationY: -40, rotationX: 20, xPercent: -15, duration: 0.6, ease: "power4.out" }, "tilt")
      .to(
        logoDuplicates,
        {
          z: (i) => -(i + 1) * 2.5 * em,
          opacity: (i) => Math.pow(0.5, i + 1),
          duration: 0.55,
          ease: "power4.out",
          stagger: { each: 0.05, ease: "power1.out" },
        },
        "tilt+=0.1"
      )
      .addLabel("smash", "+=0.4")
      .to(stack, { rotationY: 0, rotationX: 0, xPercent: 0, ease: "power4.in" }, "smash")
      .to(logoDuplicates, { z: 0, ease: "power4.in" }, "smash")
      .addLabel("impact")
      .set(logoDuplicates, { opacity: 0 }, "impact")
      .to(stack, { scale: 1.05, duration: 0.1 }, "impact")
      .to(stack, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" })
      .to(stack, { autoAlpha: 0 }, "impact+=0.5")
      .to(bg, { scaleY: 0, duration: 0.5, ease: "expo.inOut" }, "impact+=0.6");
  }

  // The bar fills up exactly as the logo lands
  if (bar) {
    timeline
      .to(bar, { scaleX: 1, duration: timeline.labels.impact, ease: "power2.inOut" }, 0)
      .to(track, { autoAlpha: 0 }, "impact+=0.5");
  }

  timeline.set(loader, { display: "none" });
}

// Initialize Logo Loader
// This script loads with `defer`, so the page is already there when it runs.
// Starting now (not on DOMContentLoaded) means it doesn't wait for the shaders.
initLogoLoader();
