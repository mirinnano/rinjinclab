// ============================================================
//  ここだけ編集すればOK
// ============================================================
const CONFIG = {
  // Discord 招待リンク（無期限のものを推奨）
  discordInvite: "",

  // 部員カード。face は集合写真の中の顔の位置（0〜1、左上が 0,0）
  members: [
    { name: "部員 01", role: "部長",   face: [0.07, 0.035] },
    { name: "部員 02", role: "",       face: [0.79, 0.17] },
    { name: "部員 03", role: "",       face: [0.05, 0.50] },
    { name: "部員 04", role: "",       face: [0.15, 0.45] },
    { name: "部員 05", role: "",       face: [0.34, 0.55] },
    { name: "部員 06", role: "",       face: [0.63, 0.50] },
    { name: "部員 07", role: "",       face: [0.46, 0.71] },
    { name: "部員 08", role: "",       face: [0.44, 0.89] },
    { name: "部員 09", role: "",       face: [0.80, 0.81] },
    { name: "部員 10", role: "",       face: [0.92, 0.11] },
    { name: "部員 11", role: "",       face: [0.59, 0.84] },
    { name: "守り神", role: "マスコット", face: [0.53, 0.48] },
  ],
};
// ============================================================

// Discord links
document.querySelectorAll("[data-discord]").forEach((a) => {
  if (CONFIG.discordInvite) {
    a.href = CONFIG.discordInvite;
    a.target = "_blank";
    a.rel = "noopener";
  } else {
    a.href = "#join";
  }
});

// Members
const grid = document.getElementById("member-grid");
CONFIG.members.forEach((m, i) => {
  const li = document.createElement("li");
  li.className = "member";
  const face = document.createElement("div");
  face.className = "member-face";
  face.style.backgroundPosition = `${m.face[0] * 100}% ${m.face[1] * 100}%`;
  li.append(face);
  li.insertAdjacentHTML(
    "beforeend",
    `<span class="member-no mono">No.${String(i + 1).padStart(2, "0")}</span>` +
      `<p class="member-name"></p>` +
      (m.role ? `<span class="member-role mono"></span>` : "")
  );
  li.querySelector(".member-name").textContent = m.name;
  if (m.role) li.querySelector(".member-role").textContent = m.role;
  grid.append(li);
});

// Reveal on scroll
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
  { threshold: 0.25 }
);
document.querySelectorAll(".section").forEach((s) => io.observe(s));

// Tilt the photo toward the cursor
const shot = document.getElementById("shot");
if (shot && matchMedia("(hover: hover) and (min-width: 901px)").matches) {
  const img = shot.querySelector("img");
  addEventListener("pointermove", (e) => {
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    shot.style.transform = `perspective(1200px) rotateY(${x * 8}deg) rotateX(${-y * 6}deg) rotate(1.6deg)`;
    img.style.transform = `scale(1.08) translate(${x * -14}px, ${y * -14}px)`;
  });
}

// Live EXIF clock + year
const pad = (n) => String(n).padStart(2, "0");
const clock = document.querySelector("[data-clock]");
const tick = () => {
  const d = new Date();
  clock.textContent = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
tick();
setInterval(tick, 15000);
document.querySelector("[data-year]").textContent = new Date().getFullYear();
