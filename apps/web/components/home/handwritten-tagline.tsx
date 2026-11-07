// Single-line pen trajectories, including separate Vietnamese diacritics.
// Each path is a writing stroke, never an outline to be filled.
const letters: Record<string, { width: number; strokes: string[] }> = {
  B: { width: 38, strokes: ["M5 53 Q7 28 12 4", "M7 9 C39 -8 40 28 13 28 C43 16 46 52 5 53"] },
  r: { width: 25, strokes: ["M2 50 L10 28 Q21 20 21 32 Q16 39 12 35 Q7 58 27 47"] },
  w: { width: 42, strokes: ["M5 29 Q-2 67 19 32 Q12 67 38 29 Q34 39 44 39"] },
  L: { width: 36, strokes: ["M5 49 C37 9 31 -7 20 5 Q11 18 10 46 Q6 57 1 53 Q20 43 38 51"] },
  a: { width: 29, strokes: ["M22 30 C7 17 -1 51 11 52 Q20 54 24 30 Q16 58 30 48"] },
  b: { width: 29, strokes: ["M4 47 C23 16 18 -8 11 8 Q5 23 5 49 C25 14 38 39 19 51 Q9 57 6 48 L30 44"] },
  c: { width: 27, strokes: ["M23 32 C18 20 4 27 4 43 C3 59 20 54 28 45"] },
  d: { width: 30, strokes: ["M22 31 C7 19 -1 50 10 52 Q20 55 24 32 L33 6 Q22 25 22 47 Q23 56 31 47"] },
  e: { width: 25, strokes: ["M2 43 C28 37 24 20 12 29 C-4 42 5 65 27 46"] },
  g: { width: 30, strokes: ["M23 30 C6 19 0 51 12 52 Q21 52 24 31 L16 66 C9 89 -4 72 15 60 L31 47"] },
  h: { width: 30, strokes: ["M3 52 C19 19 21 -5 13 6 Q6 19 3 52 C21 17 29 28 23 45 Q20 58 32 47"] },
  i: { width: 16, strokes: ["M8 31 Q0 59 17 47", "M11 20 l.2 -.5"] },
  m: { width: 43, strokes: ["M3 49 L8 29 L4 51 C19 20 27 24 19 50 C34 20 43 26 36 45 Q34 56 45 47"] },
  n: { width: 30, strokes: ["M3 49 L8 29 L4 51 C21 18 32 25 24 45 Q22 56 32 47"] },
  o: { width: 28, strokes: ["M21 29 C3 20 -1 50 11 53 C26 58 31 26 19 28 Q14 34 29 39"] },
  t: { width: 22, strokes: ["M15 13 Q-2 64 23 47", "M3 29 L24 27"] },
  u: { width: 30, strokes: ["M8 29 C-7 61 15 60 24 29 Q14 60 32 47"] },
  v: { width: 28, strokes: ["M4 29 Q4 74 24 30 Q21 40 30 39"] },
  y: { width: 30, strokes: ["M8 29 C-5 62 15 58 24 30 L17 64 C10 89 -3 72 15 60 L32 47"] },
};

const marks: Record<string, string> = {
  "\u0306": "M9 14 Q15 24 23 12", // breve
  "\u0302": "M8 18 L16 9 L24 16", // circumflex
  "\u0301": "M17 4 L25 -3",       // acute
  "\u0300": "M19 4 L13 -3",       // grave
  "\u0309": "M15 3 C27 -7 29 7 19 11", // hook
  "\u031b": "M23 29 Q34 25 29 18", // horn
  "\u0323": "M15 65 l.2 -.5",    // dot below
};

export function HandwrittenTagline({ text = "Bắt đầu ngày mới theo cách của bạn", startDelay = 2.9, y = 210, maxScale = 1.45, onComplete }: { text?: string; startDelay?: number; y?: number; maxScale?: number; onComplete?: () => void }) {
  const speed = text === "BrewLite" ? 1.6 : .5;
  let x = 0;
  let delay = startDelay;
  const strokes: { d: string; x: number; delay: number; duration: number }[] = [];
  for (const letter of text) {
    if (letter === " ") { x += 17; delay += .06 * speed; continue; }
    const [base, ...accents] = Array.from(letter.normalize("NFD"));
    const glyph = letters[base === "đ" ? "d" : base];
    if (!glyph) continue;
    const paths = [...glyph.strokes];
    if (base === "đ") paths.push("M18 18 L36 15");
    for (const accent of accents) if (marks[accent]) paths.push(marks[accent]);
    paths.forEach((d, index) => {
      const duration = (index === 0 ? .28 : .14) * speed;
      strokes.push({ d, x, delay, duration });
      delay += duration;
    });
    x += glyph.width;
  }
  const scale = Math.min(maxScale, 1100 / x);
  return (
    <g className="banner-handwriting" transform={`translate(${(1200 - x * scale) / 2} ${y}) scale(${scale})`}>
      {strokes.map((stroke, index) => (
        <path key={index} className="banner-pen-stroke" d={stroke.d}
          transform={`translate(${stroke.x} 0)`} pathLength={1}
          onAnimationEnd={index === strokes.length - 1 ? onComplete : undefined}
          style={{ animationDelay: `${stroke.delay}s`, animationDuration: `${stroke.duration}s` }} />
      ))}
    </g>
  );
}