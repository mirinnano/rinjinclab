// Frozen stills of each scene + console errors.
// node tools/stills.mjs <outdir> [width] [height]   (needs puppeteer-core and the site on :4173)
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const [out = "stills", W = "1440", H = "900"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const shots = (process.env.SHOTS || [
  "00-intro-t0.4 s=stage&y=0&t=0.4",
  "01-hero s=stage&y=0",
  "02-develop-30 s=stage&y=0.38",
  "03-develop-55 s=stage&y=0.52",
  "04-watermark s=stage&y=0.95",
  "05-call-30 s=call&y=0.3",
  "06-call-70 s=call&y=0.7",
  "07-rule-10 s=rule&y=0.1",
  "08-rule-45 s=rule&y=0.45",
  "09-rule-65 s=rule&y=0.65",
  "10-rule-90 s=rule&y=0.9",
  "11-pit s=pit-sec&y=0",
  "12-code-50 s=code&y=0.5",
  "13-code-100 s=code&y=1",
  "14-neighbors s=neighbors&y=0",
  "15-join-20 s=join&y=0.2",
  "16-join-60 s=join&y=0.6",
].join("|")).split("|");

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H, deviceScaleFactor: 1, isMobile: +W < 600, hasTouch: +W < 600 });
const errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text()));
page.on("pageerror", (e) => errs.push(String(e)));
for (const s of shots) {
  const [name, q] = s.trim().split(" ");
  await page.goto(`http://localhost:4317/?${q}`, { waitUntil: "networkidle0" });
  await page.waitForFunction("window.__ready === true", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 150));
  await page.screenshot({ path: `${out}/${name}.png` });
}
console.log(errs.length ? "ERRORS:\n" + [...new Set(errs)].join("\n") : "no console errors");
await browser.close();
