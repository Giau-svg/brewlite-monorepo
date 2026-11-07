"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { resolveProductImage } from "../../lib/safe-image";

export function ProductImage({ url, name, frame = false }: { url: string | null; name: string; frame?: boolean }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveProductImage(url);
  if (!resolved || failed) {
    return (
      <div role="img" aria-label={`Chưa có ảnh ${name}`} className={frame ? "img-fallback" : "img-fallback text-5xl"}>
        ☕
      </div>
    );
  }
  return (
    <img
      src={resolved}
      alt={name}
      width={640}
      height={640}
      onError={() => setFailed(true)}
    />
  );
}
