import Swup from "swup";
import SwupHeadPlugin from "@swup/head-plugin";
import SwupPreloadPlugin from "@swup/preload-plugin";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

let lenis: Lenis | null = null;
let pageMotionContext: gsap.Context | null = null;
let pageMedia: gsap.MatchMedia | null = null;
let pageListeners: AbortController | null = null;

const getPageContainer = () => document.querySelector<HTMLElement>("#swup");
const getProgressBar = () =>
  document.querySelector<HTMLElement>("[data-motion-progress-bar]");

const tween = (
  target: gsap.TweenTarget,
  vars: gsap.TweenVars
): Promise<void> =>
  new Promise((resolve) => {
    gsap.to(target, {
      ...vars,
      onComplete: () => {
        vars.onComplete?.();
        resolve();
      },
    });
  });

const startProgress = () => {
  const bar = getProgressBar();
  if (!bar || reducedMotion.matches) return;

  gsap.killTweensOf(bar);
  gsap.set(bar, { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" });
  gsap.to(bar, {
    scaleX: 0.72,
    duration: 0.8,
    ease: "power2.out",
  });
};

const completeProgress = () => {
  const bar = getProgressBar();
  if (!bar) return;

  if (reducedMotion.matches) {
    gsap.set(bar, { clearProps: "all" });
    return;
  }

  gsap.killTweensOf(bar);
  gsap.to(bar, {
    scaleX: 1,
    duration: 0.25,
    ease: "power2.out",
    onComplete: () => {
      gsap.to(bar, {
        autoAlpha: 0,
        duration: 0.25,
        delay: 0.08,
        onComplete: () => gsap.set(bar, { clearProps: "all" }),
      });
    },
  });
};

const isRevealCandidate = (element: Element): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false;
  if (
    element.matches(
      "script, style, noscript, svg, path, br, hr, input, textarea, select, option"
    )
  ) {
    return false;
  }
  if (
    element.closest(
      '[data-motion="none"], [data-no-motion], [hidden], [aria-hidden="true"]'
    )
  ) {
    return false;
  }
  return true;
};

const getSectionElements = (container: HTMLElement) => {
  const sections = new Set<HTMLElement>();

  container
    .querySelectorAll<HTMLElement>(
      [
        "section",
        "article",
        "main:not(#swup)",
        "[data-motion-section]",
        ':scope > [class~="max-w-screen-xl"] > *',
        ':scope > * > [class~="max-w-screen-xl"] > *',
      ].join(",")
    )
    .forEach((element) => {
      if (element.matches("[data-home-page-shell]")) return;
      if (isRevealCandidate(element)) sections.add(element);
    });

  return Array.from(sections);
};

const getRevealElements = (
  container: HTMLElement,
  sectionElements: HTMLElement[]
) => {
  const structural = new Set<HTMLElement>();
  const sections = new Set(sectionElements);

  container
    .querySelectorAll<HTMLElement>(
      [
        '[data-motion="reveal"]',
        "article",
        ".glass-card",
        ".glass-panel",
        ".dc-card",
        ".dc-panel",
        ".dc-location-card",
        ".tl-intro",
      ].join(",")
    )
    .forEach((element) => {
      if (sections.has(element)) return;
      if (isRevealCandidate(element)) structural.add(element);
    });

  container
    .querySelectorAll<HTMLElement>('[class~="grid"], [class*=" grid"]')
    .forEach((grid) => {
      if (grid.children.length < 2) return;
      Array.from(grid.children).forEach((element) => {
        if (sections.has(element as HTMLElement)) return;
        if (isRevealCandidate(element)) structural.add(element);
      });
    });

  const structuralElements = Array.from(structural).filter(
    (element) =>
      !Array.from(structural).some(
        (parent) => parent !== element && parent.contains(element)
      )
  );

  const revealElements = [...structuralElements];
  container
    .querySelectorAll<HTMLElement>(
      [
        "h1",
        "h2",
        "h3",
        ".prose > p",
        "section > p",
        "section > ul",
        "section > ol",
        "figure",
        'img[data-motion="reveal"]',
      ].join(",")
    )
    .forEach((element) => {
      if (!isRevealCandidate(element)) return;
      if (structuralElements.some((parent) => parent.contains(element))) return;
      revealElements.push(element);
    });

  return Array.from(new Set(revealElements));
};

const addButtonMotion = (container: HTMLElement, signal: AbortSignal) => {
  if (!finePointer.matches || reducedMotion.matches) return;

  container
    .querySelectorAll<HTMLElement>(
      'a[class*="rounded"], button[class*="rounded"], [data-motion="button"]'
    )
    .forEach((element) => {
      element.addEventListener(
        "pointerenter",
        () => {
          gsap.to(element, {
            scale: 1.025,
            duration: 0.24,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        { signal }
      );

      element.addEventListener(
        "pointerleave",
        () => {
          gsap.to(element, {
            scale: 1,
            duration: 0.3,
            ease: "power3.out",
            overwrite: "auto",
            onComplete: () => gsap.set(element, { clearProps: "transform" }),
          });
        },
        { signal }
      );
    });
};

const cleanupPageMotion = () => {
  pageListeners?.abort();
  pageListeners = null;
  pageMedia?.revert();
  pageMedia = null;
  pageMotionContext?.revert();
  pageMotionContext = null;
};

const initHomeHeroCarousel = (
  container: HTMLElement,
  signal: AbortSignal
) => {
  const carousel = container.querySelector<HTMLElement>(
    "[data-home-hero-carousel]"
  );
  if (!carousel) return;

  const slides = Array.from(
    carousel.querySelectorAll<HTMLElement>("[data-home-hero-slide]")
  );
  const selectors = Array.from(
    carousel.querySelectorAll<HTMLButtonElement>("[data-home-carousel-select]")
  );
  const previous = carousel.querySelector<HTMLButtonElement>(
    "[data-home-carousel-previous]"
  );
  const next = carousel.querySelector<HTMLButtonElement>(
    "[data-home-carousel-next]"
  );
  if (slides.length < 2) return;

  let activeIndex = Math.max(
    0,
    slides.findIndex((slide) => slide.dataset.active === "true")
  );
  let autoplayTimer: number | null = null;
  let pointerInside = false;
  let focusInside = false;

  const stopAutoplay = () => {
    if (autoplayTimer === null) return;
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  };

  const canAutoplay = () =>
    !reducedMotion.matches &&
    !pointerInside &&
    !focusInside &&
    !document.hidden &&
    !signal.aborted;

  const startAutoplay = () => {
    stopAutoplay();
    if (!canAutoplay()) return;
    autoplayTimer = window.setInterval(() => {
      showSlide(activeIndex + 1);
    }, 5600);
  };

  const showSlide = (requestedIndex: number) => {
    activeIndex = (requestedIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.dataset.active = String(isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    selectors.forEach((selector, index) => {
      const isActive = index === activeIndex;
      selector.dataset.active = String(isActive);
      selector.setAttribute("aria-pressed", String(isActive));
    });
  };

  selectors.forEach((selector) => {
    selector.addEventListener(
      "click",
      () => {
        showSlide(Number(selector.dataset.slideIndex ?? 0));
        startAutoplay();
      },
      { signal }
    );
  });

  previous?.addEventListener(
    "click",
    () => {
      showSlide(activeIndex - 1);
      startAutoplay();
    },
    { signal }
  );
  next?.addEventListener(
    "click",
    () => {
      showSlide(activeIndex + 1);
      startAutoplay();
    },
    { signal }
  );

  carousel.addEventListener(
    "pointerenter",
    () => {
      pointerInside = true;
      stopAutoplay();
    },
    { signal }
  );
  carousel.addEventListener(
    "pointerleave",
    () => {
      pointerInside = false;
      startAutoplay();
    },
    { signal }
  );
  carousel.addEventListener(
    "focusin",
    () => {
      focusInside = true;
      stopAutoplay();
    },
    { signal }
  );
  carousel.addEventListener(
    "focusout",
    (event) => {
      if (
        event.relatedTarget instanceof Node &&
        carousel.contains(event.relatedTarget)
      ) {
        return;
      }
      focusInside = false;
      startAutoplay();
    },
    { signal }
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    },
    { signal }
  );
  signal.addEventListener("abort", stopAutoplay, { once: true });

  showSlide(activeIndex);
  startAutoplay();
};

const initHomeHeroFlow = (container: HTMLElement) => {
  const hero = container.querySelector<HTMLElement>("[data-home-hero]");
  if (!hero) return;

  const copy = hero.querySelector<HTMLElement>("[data-home-hero-copy]");
  const visual = hero.querySelector<HTMLElement>("[data-home-hero-visual]");
  if (!copy || !visual) return;

  const headline = copy.querySelector("h1");
  const paragraphs = copy.querySelectorAll(":scope > p");
  const actions = copy.querySelectorAll("a");
  const stats = copy.querySelectorAll(".glass-card");
  const heroTargets = [
    visual,
    ...(headline ? [headline] : []),
    ...Array.from(paragraphs),
    ...Array.from(actions),
    ...Array.from(stats),
  ];
  const visualDirection =
    visual.getBoundingClientRect().left < copy.getBoundingClientRect().left
      ? -1
      : 1;

  const timeline = gsap.timeline({
    delay: 0.12,
    defaults: { ease: "power3.out" },
  });

  timeline
    .from(visual, {
      autoAlpha: 0,
      x: 54 * visualDirection,
      scale: 0.96,
      duration: 1,
    })
    .from(
      headline,
      {
        autoAlpha: 0,
        y: 38,
        duration: 0.86,
      },
      0.08
    )
    .from(
      paragraphs,
      {
        autoAlpha: 0,
        y: 24,
        duration: 0.68,
        stagger: 0.08,
      },
      0.28
    )
    .from(
      actions,
      {
        autoAlpha: 0,
        y: 18,
        scale: 0.96,
        duration: 0.56,
        stagger: 0.09,
      },
      0.46
    )
    .from(
      stats,
      {
        autoAlpha: 0,
        y: 22,
        duration: 0.62,
        stagger: 0.08,
      },
      0.58
    )
    .set(heroTargets, {
      clearProps: "opacity,visibility,transform",
    });
};

const initHomeEnterpriseServices = (container: HTMLElement) => {
  const section = container.querySelector<HTMLElement>(
    "[data-enterprise-services]"
  );
  const pinScene = section?.querySelector<HTMLElement>(
    "[data-enterprise-services-pin]"
  );
  if (!section || !pinScene) return;

  const panels = Array.from(
    section.querySelectorAll<HTMLElement>("[data-enterprise-panel]")
  );
  const steps = Array.from(
    section.querySelectorAll<HTMLElement>("[data-enterprise-step]")
  );
  const providers = Array.from(
    section.querySelectorAll<HTMLElement>("[data-enterprise-provider]")
  );
  const links = Array.from(
    section.querySelectorAll<SVGPathElement>("[data-enterprise-link]")
  );
  const progress = section.querySelector<HTMLElement>(
    "[data-enterprise-progress]"
  );
  if (panels.length < 3 || steps.length < 3 || !progress) return;

  pageMedia ??= gsap.matchMedia();

  pageMedia.add("(min-width: 821px)", () => {
    gsap.set(panels, {
      autoAlpha: 0,
      xPercent: 3,
    });
    gsap.set(panels[0], {
      autoAlpha: 1,
      xPercent: 0,
    });
    gsap.set(providers, {
      autoAlpha: 0,
      y: 14,
      scale: 0.82,
      transformOrigin: "center",
    });
    gsap.set(progress, {
      scaleY: 0,
      transformOrigin: "top center",
    });

    links.forEach((link) => {
      const length = link.getTotalLength();
      gsap.set(link, {
        strokeDasharray: length,
        strokeDashoffset: length,
      });
    });

    const setActiveStep = (activeIndex: number) => {
      steps.forEach((step, index) => {
        step.dataset.active = String(index === activeIndex);
      });
    };

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: pinScene,
        start: "center center",
        end: () => `+=${Math.max(window.innerHeight * 3.8, 2900)}`,
        scrub: 0.72,
        pin: pinScene,
        pinSpacing: true,
        pinReparent: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set(progress, { scaleY: self.progress });

          const activeTime = self.progress * timeline.duration();
          const activeIndex =
            activeTime < 3.62 ? 0 : activeTime < 5.57 ? 1 : 2;
          setActiveStep(activeIndex);
        },
      },
    });

    let providerPosition = 0.08;
    let linkIndex = 0;
    providers.forEach((provider) => {
      timeline.to(
        provider,
        {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
        },
        providerPosition
      );

      const isHub = provider.matches(
        ".enterprise-story__provider--hub"
      );
      if (!isHub && links[linkIndex]) {
        timeline.to(
          links[linkIndex],
          {
            strokeDashoffset: 0,
            duration: 0.4,
          },
          providerPosition
        );
        linkIndex += 1;
      }

      providerPosition += 0.31;
    });

    timeline
      .to(
        panels[0],
        {
          autoAlpha: 0,
          xPercent: -3,
          duration: 0.45,
        },
        3.2
      )
      .fromTo(
        panels[1],
        {
          autoAlpha: 0,
          xPercent: 3,
        },
        {
          autoAlpha: 1,
          xPercent: 0,
          duration: 0.58,
        },
        3.62
      )
      .from(
        panels[1].querySelector("[data-enterprise-panel-visual]"),
        {
          clipPath: "inset(10% 12% 10% 12% round 1.5rem)",
          scale: 1.04,
          duration: 0.8,
        },
        3.62
      )
      .to(
        panels[1],
        {
          autoAlpha: 0,
          xPercent: -3,
          duration: 0.45,
        },
        5.15
      )
      .fromTo(
        panels[2],
        {
          autoAlpha: 0,
          xPercent: 3,
        },
        {
          autoAlpha: 1,
          xPercent: 0,
          duration: 0.58,
        },
        5.57
      )
      .from(
        panels[2].querySelector("[data-enterprise-panel-visual]"),
        {
          clipPath: "inset(10% 12% 10% 12% round 1.5rem)",
          scale: 1.04,
          duration: 0.8,
        },
        5.57
      )
      .to({}, { duration: 0.75 });

    return () => setActiveStep(0);
  });

  pageMedia.add("(max-width: 820px)", () => {
    panels.forEach((panel) => {
      gsap.from(panel, {
        autoAlpha: 0,
        y: 36,
        duration: 0.78,
        ease: "power3.out",
        scrollTrigger: {
          trigger: panel,
          start: "top 88%",
          once: true,
        },
      });
    });

    gsap.from(providers, {
      autoAlpha: 0,
      y: 12,
      scale: 0.9,
      duration: 0.48,
      stagger: 0.08,
      ease: "power2.out",
      scrollTrigger: {
        trigger: section.querySelector('[data-service="transit"]'),
        start: "top 72%",
        once: true,
      },
    });
  });
};

const initHomeNetworkFlow = (container: HTMLElement) => {
  const section = container.querySelector<HTMLElement>("[data-home-network]");
  const pinScene = section?.querySelector<HTMLElement>(
    "[data-home-network-pin]"
  );
  const route = section?.querySelector<SVGPathElement>("[data-home-route]");
  const packet = section?.querySelector<SVGCircleElement>("[data-home-packet]");
  if (!section || !pinScene || !route || !packet) return;

  const nodes = section.querySelectorAll<SVGGElement>("[data-home-node]");
  const metrics = section.querySelectorAll<HTMLElement>(
    "[data-home-network-metric]"
  );
  const steps = section.querySelectorAll<HTMLElement>(
    "[data-home-network-step]"
  );
  const metricsGroup = section.querySelector<HTMLElement>(
    "[data-home-network-metrics]"
  );
  const stepsGroup = section.querySelector<HTMLElement>(
    "[data-home-network-steps]"
  );
  const routeLength = route.getTotalLength();

  gsap.set(route, {
    strokeDasharray: routeLength,
    strokeDashoffset: routeLength,
  });
  gsap.set(packet, { autoAlpha: 0 });

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: pinScene,
      start: "center center",
      end: () => `+=${Math.max(window.innerHeight * 1.8, 1500)}`,
      scrub: 0.85,
      pin: pinScene,
      pinSpacing: true,
      pinReparent: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  timeline
    .to(
      route,
      {
        strokeDashoffset: 0,
        duration: 1.55,
        ease: "power2.inOut",
      },
      0.08
    )
    .to(
      nodes,
      {
        scale: 1.1,
        transformBox: "fill-box",
        transformOrigin: "center",
        duration: 0.28,
        stagger: 0.16,
        ease: "power2.out",
      },
      0.08
    )
    .to(
      nodes,
      {
        scale: 1,
        duration: 0.36,
        stagger: 0.16,
        ease: "power2.inOut",
      },
      0.36
    )
    .set(packet, { autoAlpha: 1 }, 0.22)
    .to(
      packet,
      {
        duration: 2.15,
        ease: "power1.inOut",
        motionPath: {
          path: route,
          align: route,
          alignOrigin: [0.5, 0.5],
          start: 0,
          end: 1,
        },
      },
      0.22
    )
    .to(
      packet,
      {
        autoAlpha: 0,
        scale: 1.8,
        duration: 0.32,
      },
      2.16
    );

  if (!metricsGroup || !stepsGroup) return;

  const detailsTimeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: metricsGroup,
      endTrigger: stepsGroup,
      start: "top 88%",
      end: "bottom 58%",
      scrub: 0.55,
      invalidateOnRefresh: true,
    },
  });

  detailsTimeline
    .from(metrics, {
      autoAlpha: 0,
      y: 28,
      duration: 0.62,
      stagger: 0.08,
    })
    .from(
      steps,
      {
        autoAlpha: 0,
        x: -18,
        duration: 0.6,
        stagger: 0.09,
      },
      0.32
    );

  section
    .querySelectorAll<HTMLElement>("[data-home-counter]")
    .forEach((counter, index) => {
      const value = Number(counter.dataset.value ?? 0);
      const decimals = Number(counter.dataset.decimals ?? 0);
      const state = { value: 0 };
      const position = 0.08 + index * 0.04;

      detailsTimeline.call(
        () => {
          counter.textContent = (0).toFixed(decimals);
        },
        undefined,
        position
      );
      detailsTimeline.to(
        state,
        {
          value,
          duration: 0.78,
          ease: "power2.out",
          onUpdate: () => {
            counter.textContent = state.value.toFixed(decimals);
          },
        },
        position
      );
    });
};

const initPageMotion = () => {
  const container = getPageContainer();
  if (!container) return;

  cleanupPageMotion();
  pageListeners = new AbortController();
  initHomeHeroCarousel(container, pageListeners.signal);

  if (reducedMotion.matches) {
    gsap.set(container, { clearProps: "all" });
    return;
  }

  pageMotionContext = gsap.context(() => {
    initHomeHeroFlow(container);
    initHomeEnterpriseServices(container);
    initHomeNetworkFlow(container);

    const sectionElements = getSectionElements(container);
    const revealElements = getRevealElements(container, sectionElements);

    sectionElements.forEach((section) => {
      gsap.fromTo(
        section,
        {
          autoAlpha: 0.45,
          y: 46,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.88,
          ease: "power3.out",
          clearProps: "opacity,visibility,transform",
          scrollTrigger: {
            trigger: section,
            start: "top 92%",
            once: true,
          },
        }
      );
    });

    gsap.set(revealElements, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(revealElements, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => {
        gsap.to(batch, {
          autoAlpha: 1,
          y: 0,
          duration: 0.72,
          stagger: 0.07,
          ease: "power3.out",
          overwrite: "auto",
          onComplete: () =>
            gsap.set(batch, {
              clearProps: "opacity,visibility,transform",
            }),
        });
      },
    });

    container
      .querySelectorAll<HTMLElement>(
        ".dc-hero__glow, [data-motion-parallax]"
      )
      .forEach((element) => {
        gsap.fromTo(
          element,
          { yPercent: -2 },
          {
            yPercent: 5,
            ease: "none",
            scrollTrigger: {
              trigger: element.parentElement ?? element,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.8,
            },
          }
        );
      });
  }, container);

  addButtonMotion(container, pageListeners.signal);
  requestAnimationFrame(() => ScrollTrigger.refresh());
};

const animatePageOut = async () => {
  const container = getPageContainer();
  lenis?.stop();

  if (!container || reducedMotion.matches) return;
  await tween(container, {
    autoAlpha: 0,
    y: -16,
    duration: 0.32,
    ease: "power2.in",
    overwrite: true,
  });
};

const preparePageIn = () => {
  const container = getPageContainer();
  if (!container || reducedMotion.matches) return;
  gsap.set(container, { autoAlpha: 0, y: 20 });
};

const animatePageIn = async () => {
  const container = getPageContainer();

  lenis?.resize();
  lenis?.start();

  if (!container || reducedMotion.matches) {
    if (container) gsap.set(container, { clearProps: "all" });
    ScrollTrigger.refresh();
    return;
  }

  await tween(container, {
    autoAlpha: 1,
    y: 0,
    duration: 0.56,
    ease: "power3.out",
    overwrite: true,
    clearProps: "opacity,visibility,transform",
  });
  ScrollTrigger.refresh();
};

const initSmoothScroll = () => {
  if (reducedMotion.matches) return;

  lenis = new Lenis({
    duration: 1.05,
    easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
    smoothWheel: true,
    wheelMultiplier: 0.9,
    anchors: { offset: -96 },
    autoResize: true,
    stopInertiaOnNavigate: true,
  });

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
};

initSmoothScroll();
initPageMotion();
void animatePageIn();

const swup = new Swup({
  containers: ["#swup"],
  animationSelector: false,
  animateHistoryBrowsing: true,
  plugins: [
    new SwupHeadPlugin({
      awaitAssets: true,
    }),
    new SwupPreloadPlugin({
      preloadHoveredLinks: true,
      preloadVisibleLinks: {
        threshold: 0.5,
        delay: 800,
        containers: ["#swup"],
      },
    }),
  ],
});

swup.hooks.on("visit:start", startProgress);
swup.hooks.on("animation:out:await", animatePageOut);
swup.hooks.before("content:replace", cleanupPageMotion);
swup.hooks.on("content:replace", () => {
  preparePageIn();
  initPageMotion();
});
swup.hooks.on("animation:in:await", animatePageIn);
swup.hooks.on("visit:end", completeProgress);
