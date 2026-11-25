"use strict";
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const hero = document.querySelector(".hero");
    // Cursor and page progress act on separate layers around the stems.
    gsap
      .timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
      .to(
        ".botanic-frame",
        { rotation: -15, yPercent: 13, scale: 1.1, ease: "none" },
        0,
      )
      .to(".bloom-one", { rotation: -14, svgOrigin: "101 90", ease: "none" }, 0)
      .to(
        ".bloom-two",
        { rotation: 21, svgOrigin: "184 138", ease: "none" },
        0,
      );
    const spread = document.querySelector(".event-spread");
    gsap
      .timeline({
        scrollTrigger: {
          trigger: spread,
          start: "top bottom",
          end: "center 46%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
      .fromTo(
        ".plate-one",
        { xPercent: -16, rotation: -5 },
        { xPercent: 0, rotation: 0, ease: "none" },
        0,
      )
      .fromTo(
        ".plate-two",
        { xPercent: 32, yPercent: 20, rotation: 13 },
        { xPercent: 0, yPercent: 0, rotation: 0, ease: "none" },
        0,
      );
    const root = hero.querySelector(".hero-copy"),
      target = hero.querySelector(".botanic-gust");
    const turn = gsap.quickTo(target, "rotation", {
      duration: 0.33,
      ease: "power2.out",
    });
    const shift = gsap.quickTo(target, "x", {
      duration: 0.33,
      ease: "power2.out",
    });
    const lift = gsap.quickTo(target, "y", {
      duration: 0.33,
      ease: "power2.out",
    });
    let rect = null;
    function enter() {
      rect = root.getBoundingClientRect();
    }
    function invalidate() {
      rect = null;
    }
    function track(e) {
      if (e.pointerType !== "mouse") return;
      if (!rect) enter();
      const x = Math.max(
          -0.5,
          Math.min(0.5, (e.clientX - rect.left) / rect.width - 0.5),
        ),
        y = Math.max(
          -0.5,
          Math.min(0.5, (e.clientY - rect.top) / rect.height - 0.5),
        );
      turn(x * 24);
      shift(x * 21);
      lift(y * 14);
    }
    function leave() {
      turn(0);
      shift(0);
      lift(0);
      rect = null;
    }
    root.addEventListener("pointerenter", enter);
    root.addEventListener("pointermove", track, { passive: true });
    root.addEventListener("pointerleave", leave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      root.removeEventListener("pointerenter", enter);
      root.removeEventListener("pointermove", track);
      root.removeEventListener("pointerleave", leave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  });
}
