"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { HandwrittenTagline } from "./handwritten-tagline";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
let bannerRatio = "1600 / 636";
let seenInMemory = false;

export function VideoBanner() {
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);
  if (!ready) return <section className="home-banner video-story" style={{ aspectRatio: bannerRatio }} aria-label="BrewLite" />;
  return <BannerPlayback />;
}

function BannerPlayback() {
  const [skipAnimation] = useState(() => seenInMemory);
  const [aspectRatio, setAspectRatio] = useState(() => bannerRatio);
  useEffect(() => { seenInMemory = true; }, []);
  const [showMessage, setShowMessage] = useState(false);
  const [writingDone, setWritingDone] = useState(false);
  const finished = skipAnimation || writingDone;

  function revealMessage() {
    setShowMessage(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setWritingDone(true);
  }

  return (
    <section className={`home-banner video-story${skipAnimation ? " is-static" : ""}${finished ? " is-finished" : ""}`} aria-labelledby="hero-title" style={{ aspectRatio }}>
      <Image className="video-final-photo" src="/images/brand/hero.jpg" alt=""
        fill sizes="100vw" aria-hidden="true" />
      <video autoPlay={!skipAnimation} muted playsInline preload={skipAnimation ? "none" : "auto"}
        aria-label="Hơi cà phê BrewLite" width={1600} height={636}
        onPlaying={revealMessage}
        onEnded={revealMessage}
        onLoadedMetadata={(event) => {
          const { videoWidth, videoHeight } = event.currentTarget;
          if (videoWidth > 0 && videoHeight > 0) {
            bannerRatio = `${videoWidth} / ${videoHeight}`;
            setAspectRatio(bannerRatio);
          }
        }}
        onTransitionEnd={(event) => { if (finished && event.propertyName === "opacity") event.currentTarget.pause(); }}>
        {!skipAnimation && <source src="/videos/coffee-steam.mp4" type="video/mp4" />}
      </video>
      <div className={`video-banner-message${(skipAnimation || showMessage) ? " is-visible" : ""}`}>
        <h1 id="hero-title">
          <span className="visually-hidden">BrewLite. Bắt đầu ngày mới theo cách của bạn</span>
          <svg className="banner-written-title" viewBox="0 0 1200 330" aria-hidden="true">
            <HandwrittenTagline text="BrewLite" startDelay={0} y={-10} maxScale={3.2} />
            <text className="banner-fade-slogan" x="600" y="300" textAnchor="middle"
              textLength="1100" lengthAdjust="spacingAndGlyphs"
              onAnimationEnd={() => setWritingDone(true)}>
              Bắt đầu ngày mới theo cách của bạn
            </text>
          </svg>
        </h1>
      </div>
    </section>
  );
}