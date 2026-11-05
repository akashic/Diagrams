// Live behaviour. model.mjs and `D` (the build's geometry) are inlined above this, after the kit.
const stage = document.querySelector(".cva-stage");
const svg = stage.querySelector("svg");
const fig = svg.querySelector(".cva-fig");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const part = (name) => svg.querySelector(`[data-part="${name}"]`);
const P = D.P;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth01 = (t) => t * t * (3 - 2 * t);
const follow = (cur, want, dt, seconds) => (still.matches ? want : cur + (want - cur) * (1 - Math.exp(-dt / seconds)));

const pulses = {};
for (const el of svg.querySelectorAll(".cva-pulse")) {
  (pulses[el.dataset.line] ??= []).push({ el, from: +el.dataset.from, to: +el.dataset.to });
}

function showCapsule(id, head) {
  for (const chunk of pulses[id] ?? []) {
    const a = Math.max(head - CAPSULE, chunk.from);
    const b = Math.min(head, chunk.to);
    if (b <= a) {
      chunk.el.style.visibility = "hidden";
      continue;
    }
    chunk.el.style.visibility = "visible";
    chunk.el.style.strokeDasharray = `${(b - a).toFixed(2)} 100000`;
    chunk.el.style.strokeDashoffset = (chunk.from - a).toFixed(2);
  }
}
function clearCapsule(id) {
  for (const chunk of pulses[id] ?? []) chunk.el.style.visibility = "hidden";
}

// ---------- Parts that answer to the model ----------
const count = part("count");
const shuttle = part("shuttle");
const needle = part("score-needle");
const month = part("month-needle");
const gantry = part("gantry");
const envelope = part("envelope");
const template = part("template");
const pegs = part("pegs");
const report = part("report");
const lamp = part("entra-lamp")?.querySelector(".iso-solid");
const submit = part("submit");

const drawerState = D.drawers.map(() => ({ at: 0, want: 0, drawn: -1 }));
const drawerBody = D.drawers.map((_, i) => part(`drawer-body${i}`));
const drawerFront = D.drawers.map((_, i) => part(`drawer-front${i}`));
function drawDrawer(i) {
  const s = drawerState[i];
  if (Math.abs(s.drawn - s.at) < 0.01) return;
  s.drawn = s.at;
  const d = D.drawers[i];
  const plan = { x: d.x0, y: d.y, w: d.x1 - d.x0, d: 1.6 + s.at, r: 0.5 };
  drawerBody[i].innerHTML = solidSvg(slabOf(plan, d.z, d.h, P, 2, 0.3), { tone: s.at > 0.5 ? "hi" : "mid" });
  drawerFront[i].setAttribute("transform", translateAlong(P, [0, s.at, 0]));
}

const live = {
  status: 0,
  statusAt: D.status.stops[0],
  score: 0,
  scoreAt: 0,
  monthAt: 0,
  monthWant: 0,
  pressAt: D.press.y0,
  pressWant: D.press.y0,
  envAt: 0,
  envWant: 0,
  templateAt: 0,
  templateWant: 0,
  drum: 0,
  drumRate: 0,
};

function needleAt(dial, share) {
  const angle = dial.start + dial.span * share;
  return lineOnTop([dial.x, dial.y], [dial.x + Math.sin(angle) * dial.r, dial.y - Math.cos(angle) * dial.r], dial.z, P);
}

// Pegs on the five cams: visible only on the side of the drum that faces the viewer.
function drawPegs() {
  const { y, z, r, pegs: rows } = D.drum;
  const dots = [];
  rows.forEach((x, row) => {
    for (let i = 0; i < 6; i++) {
      const angle = live.drum + (i / 6) * Math.PI * 2 + row * 0.5;
      const ny = Math.cos(angle);
      const nz = Math.sin(angle);
      const facing = ny * D.view[1] + nz * D.view[2];
      if (facing < 0.08) continue;
      const [sx, sy] = iso([x, y + ny * r, z + nz * r], P);
      dots.push(`<circle cx="${sx.toFixed(2)}" cy="${sy.toFixed(2)}" r="0.9" class="iso-dot" style="fill:var(--anatomy-${row === live.status ? "hi" : "mid"});opacity:${Math.min(1, facing * 2.4).toFixed(2)}"/>`);
    }
  });
  pegs.innerHTML = dots.join("");
}

// ---------- One run ----------
let index = 0;
let head = 0;
let dwell = 0;
let paused = false;
let last = 0;
let frame = 0;
let visible = false;
let focus = null;

function applyStep(step) {
  // The run's own marks: signed in, submitted, and the report in the tray. A new run clears them.
  const here = STEPS.indexOf(step);
  const past = (line) => here >= STEPS.findIndex((s) => s.line === line);
  lamp?.toggleAttribute("data-lit", past("sign-in"));
  report.style.visibility = past("deliver-report") ? "visible" : "hidden";
  submit.setAttribute("transform", translateAlong(P, [0, 0, step.line === "submit-request" ? -2.4 : 0]));
  drawerState.forEach((s, i) => (s.want = step.drawer === i ? 13 : 0));
  // Status, count and score are whatever the run has reached by this step, in either direction.
  const reached = STEPS.slice(0, here + 1);
  const latest = (key, start) => reached.reduce((value, s) => s[key] ?? value, start);
  live.status = latest("status", 0);
  count.textContent = latest("count", COMPANIES).toLocaleString("en-US");
  const scored = reached.filter((s) => s.gauge && s !== step);
  live.score = scored.length ? scoreOf(scored[scored.length - 1].entries) ?? 0 : 0;
  if (step.month) live.monthWant += 1;
  if (step.op !== undefined) for (let i = 0; i < 3; i++) part(`plunger${i}`)?.setAttribute("transform", translateAlong(P, [0, 0, i === step.op ? 3 : 0]));
  live.templateWant = step.template ? 9 : 0;
  if (!step.press && !["write-workbook", "send-email", "deliver-report"].includes(step.line)) live.pressWant = D.press.y0;
  live.envWant = step.mail ? 1 : step.tray ? 0 : live.envWant;
  live.drumRate = step.status === 1 ? 2.2 : step.status === 2 ? 1.2 : 0.3;
  if (!focus) setReadout(step);
}
function setReadout(step) {
  const text = statusText(step);
  if (readout.textContent !== text) readout.textContent = text;
}

function advance(by) {
  clearCapsule(STEPS[index].line);
  index = (index + by + STEPS.length) % STEPS.length;
  // Under reduced motion a step doesn't run: its capsule simply rests partway down its line.
  head = still.matches ? D.tubes[STEPS[index].line].total * 0.6 : 0;
  dwell = 0;
  applyStep(STEPS[index]);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
  last = now;
  const step = STEPS[index];
  const tube = D.tubes[step.line];
  if (!paused) {
    if (head < tube.total + CAPSULE) {
      head = still.matches ? tube.total + CAPSULE : head + SPEED * dt;
    } else {
      dwell += dt;
      if (dwell >= (still.matches ? 4 : step.hold ?? DWELL)) advance(1);
    }
    if (step.press) {
      const share = clamp((head - 20) / Math.max(1, tube.total), 0, 1);
      live.pressWant = D.press.y0 + (D.press.y1 - D.press.y0) * smooth01(share);
    }
    if (step.gauge && head >= tube.total) live.score = scoreOf(step.entries) ?? 0;
    live.drum += live.drumRate * dt;
  }
  showCapsule(step.line, Math.min(head, tube.total + CAPSULE));
  // Eased parts, all driven by the model above.
  live.statusAt = follow(live.statusAt, D.status.stops[live.status], dt, 0.35);
  shuttle.setAttribute("transform", translateAlong(P, [live.statusAt, 0, 0]));
  live.scoreAt = follow(live.scoreAt, live.score, dt, 0.3);
  needle.setAttribute("d", needleAt(D.dial, live.scoreAt / 100));
  live.monthAt = follow(live.monthAt, live.monthWant, dt, 0.5);
  month.setAttribute("d", needleAt({ x: D.calendar.x, y: D.calendar.y, r: D.calendar.r, z: D.calendar.z, start: 0, span: Math.PI * 2 }, (live.monthAt % MONTHS) / MONTHS));
  live.pressAt = follow(live.pressAt, live.pressWant, dt, 0.18);
  gantry.setAttribute("transform", translateAlong(P, [0, live.pressAt, 0]));
  live.envAt = follow(live.envAt, live.envWant, dt, 0.45);
  envelope.setAttribute("transform", translateAlong(P, [live.envAt * D.envelope.travel, 0, 0]));
  live.templateAt = follow(live.templateAt, live.templateWant, dt, 0.3);
  template?.setAttribute("transform", translateAlong(P, [0, 0, live.templateAt]));
  drawerState.forEach((s, i) => {
    s.at = follow(s.at, s.want, dt, 0.25);
    if (Math.abs(s.at - s.want) < 0.02) s.at = s.want;
    drawDrawer(i);
  });
  drawPegs();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
}, { rootMargin: "120px 0px" }).observe(stage);

// ---------- Focus: a station and its lines ----------
const items = [...fig.querySelectorAll('.it, g[data-part="shuttle"]')];
function setFocus(id) {
  if (focus === id) return;
  focus = id;
  fig.classList.toggle("cva-focus", !!id);
  const lines = id ? Object.entries(D.tubes).filter(([, t]) => t.from === id || t.to === id).map(([lineId]) => lineId) : [];
  for (const item of items) item.classList.toggle("on", !!id && (item.dataset.st === id || lines.includes(item.dataset.line)));
  for (const b of document.querySelectorAll("[data-pick]")) b.setAttribute("aria-pressed", String(b.dataset.pick === id));
  if (id) {
    const s = D.stations[id];
    const out = lines.filter((l) => D.tubes[l].from === id).length;
    const into = lines.length - out;
    readout.textContent = `${s.name} · ${s.role} · ${out} out, ${into} in`;
  } else {
    setReadout(STEPS[index]);
  }
}
let hoverId = null;
svg.addEventListener("pointermove", (event) => {
  const it = event.target.closest?.(".it");
  const id = it?.dataset.st && it.dataset.st !== "bench" ? it.dataset.st : null;
  if (id !== hoverId) {
    hoverId = id;
    setFocus(id);
  }
});
svg.addEventListener("pointerleave", () => {
  hoverId = null;
  setFocus(null);
});
for (const b of document.querySelectorAll("[data-pick]")) {
  b.addEventListener("pointerenter", () => setFocus(b.dataset.pick));
  b.addEventListener("pointerleave", () => setFocus(null));
  b.addEventListener("focus", () => setFocus(b.dataset.pick));
  b.addEventListener("blur", () => setFocus(null));
}
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") advance(1);
  else if (event.key === "ArrowLeft") advance(-1);
  else if (event.key === " ") paused = !paused;
  else if (event.key === "Home") {
    advance(-index);
  } else return;
  event.preventDefault();
});

// Reduced motion: no tour. The figure rests on the finished run until the reader steps through it.
if (still.matches) {
  paused = true;
  index = STEPS.length - 1;
  head = D.tubes[STEPS[index].line].total + CAPSULE;
}
applyStep(STEPS[index]);
