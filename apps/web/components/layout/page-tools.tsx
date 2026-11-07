"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";

export function BackLink() {
  const pathname = usePathname() ?? "";
  if (!pathname || pathname === "/") return null;
  const fallback = pathname.startsWith("/products/") ? "/menu" : "/";

  function goBack(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const referrer = document.referrer;
    if (referrer) {
      try {
        const previous = new URL(referrer);
        if (previous.origin === window.location.origin) {
          window.history.back();
          return;
        }
      } catch {
        // Đường dẫn referrer không hợp lệ thì dùng trang nội bộ.
      }
    }
    window.location.assign(fallback);
  }

  return (
    <div className="container">
      <a className="back-link" href={fallback} onClick={goBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M15 6 9 12l6 6" />
        </svg>
        Quay lại
      </a>
    </div>
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 300);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="to-top"
      aria-label="Lên đầu trang"
      onClick={() => {
        const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="m6 14 6-6 6 6" />
      </svg>
    </button>
  );
}
