"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function ScrollReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observed = new Set<HTMLElement>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-entered");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });

    function observeContent() {
      element!.querySelectorAll<HTMLElement>(".story-media, #story .section-title, .quality-list li, .menu-preview-copy .section-title, .menu-category-descriptions > div, .menu-preview-tile, .section-head, .process-step, .drink-discovery .section-title, .drink-discovery-search").forEach((item) => {
        if (observed.has(item)) return;
        observed.add(item);
        item.classList.add("scroll-enter-item");
        observer.observe(item);
      });
    }
    observeContent();
    const mutations = new MutationObserver(observeContent);
    mutations.observe(element, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      observed.forEach((item) => item.classList.remove("scroll-enter-item", "is-entered"));
    };
  }, []);

  return <div ref={root} className="home-scroll-content">{children}</div>;
}