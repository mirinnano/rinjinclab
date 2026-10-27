// Builds assets/zeiss-mascot.png at high resolution, after the badge on the club's CD art:
// blue square, black key halftone, the mascot screened in pink / yellow / blue,
// and a serif "ZEISS" printed slightly off-register across it.
// node tools/zeiss-sticker.mjs   (needs puppeteer-core and the site on :4173)
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const OUT = process.argv[2] || "assets/zeiss-mascot.png";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:4317/discord/render.html?t=logo", { waitUntil: "networkidle0" });
const url = await page.evaluate(async () => {
  const S = 720;
  const c = document.createElement("canvas"); c.width = S; c.height = S;
  const g = c.getContext("2d");
  const dots = (cell, angDeg, fn) => {
    const a = (angDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    for (let v = -S; v < S * 2; v += cell) for (let u = -S; u < S * 2; u += cell) {
      const x = u * ca - v * sa, y = u * sa + v * ca;
      if (x < -cell || y < -cell || x > S + cell || y > S + cell) continue;
      const d = fn(x, y); if (!d) continue;
      g.fillStyle = d.ink; g.beginPath(); g.arc(x, y, (cell / 2) * 1.08 * Math.sqrt(d.k), 0, Math.PI * 2); g.fill();
    }
  };

  // base: print blue with a black key screen that thickens toward the edges
  g.fillStyle = "#2a2fb4"; g.fillRect(0, 0, S, S);
  dots(18, 45, (x, y) => {
    const r = Math.hypot(x - S * 0.55, y - S * 0.45) / (S * 0.7);
    return { ink: "rgba(8,8,14,.9)", k: Math.min(1, 0.18 + r * 0.9) };
  });

  // mascot, read pixel by pixel and re-screened
  const img = new Image(); img.src = "/assets/mascot-cut.webp"; await img.decode();
  const mw = S * 0.82, mh = (img.height / img.width) * mw, mx = S * 0.12, my = S * 0.02;
  const src = document.createElement("canvas"); src.width = S; src.height = S;
  const s = src.getContext("2d"); s.drawImage(img, mx, my, mw, mh);
  const px = s.getImageData(0, 0, S, S).data;
  const at = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= S || y >= S) return null; const i = (y * S + x) * 4; return px[i + 3] > 100 ? [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255] : null; };
  // pink screen (the mascot's red)
  dots(16, 15, (x, y) => { const p = at(x, y); if (!p) return null; const [r, gg] = p; return r > 0.5 && gg < 0.55 ? { ink: "rgba(255,58,120,.96)", k: 0.95 } : null; });
  // yellow screen
  dots(14, 0, (x, y) => { const p = at(x + 3, y + 2); if (!p) return null; const [r, gg, b] = p; return r > 0.7 && gg > 0.55 && b < 0.6 ? { ink: "rgba(255,226,40,.95)", k: 0.9 } : null; });
  // the mascot's blacks come out as bright blue (eyes, mouth)
  dots(14, 75, (x, y) => { const p = at(x, y); if (!p) return null; return Math.max(...p) < 0.35 ? { ink: "rgba(40,70,255,.95)", k: 0.85 } : null; });
  // a sparse red overprint for moire
  dots(16, 60, (x, y) => { const p = at(x - 2, y); if (!p) return null; return p[0] > 0.5 && p[1] < 0.5 ? { ink: "rgba(220,20,40,.55)", k: 0.4 } : null; });

  // ZEISS, off-register
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = 'bold 168px "Times New Roman", Times, serif';
  const tx = S * 0.5, ty = S * 0.42;
  g.save(); g.translate(tx, ty); g.scale(1, 1.08);
  g.globalCompositeOperation = "screen";
  g.fillStyle = "rgba(255,40,90,.7)"; g.fillText("ZEISS", -5, 2);
  g.fillStyle = "rgba(60,120,255,.7)"; g.fillText("ZEISS", 5, -1);
  g.globalCompositeOperation = "source-over";
  g.fillStyle = "#f6f4ee"; g.fillText("ZEISS", 0, 0);
  g.restore();
  // knock the white letters back with a light dot screen so they read as print
  dots(10, 30, (x, y) => ({ ink: "rgba(42,47,180,.0)", k: 0 }));

  // soften like a scan
  const o = document.createElement("canvas"); o.width = S; o.height = S;
  const og = o.getContext("2d"); og.filter = "blur(.7px) saturate(1.1)"; og.drawImage(c, 0, 0);
  return o.toDataURL("image/png");
});
fs.writeFileSync(OUT, Buffer.from(url.split(",")[1], "base64"));
await browser.close();
console.log(OUT);
