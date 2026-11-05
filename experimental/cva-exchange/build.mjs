// The Client Valuation Automation system as a physical object: a pneumatic-tube exchange on a workbench.
//
//   Build:  node experimental/cva-exchange/build.mjs [--dark] [--audit]
//   Needs the anatomy skill: npx skills add wheresryan22/anatomy -g
//
// The object is the explanation. Each product is a machine station standing where the diagram puts it; each of the
// diagram's 17 connections is one glass tube running the same way, so a request and its reply are two separate
// lines. A capsule running down a tube is one call. Boundaries become the raised plates the stations stand on.
//
// What moves and what it means:
//   capsule in a tube        one call along that line, source to target
//   status shuttle           the Valuation Request's status (the programmer's rail has one stop per status)
//   gauge needle             the Match Score that just came back from Azure OpenAI
//   drawer                   the Dataverse table being read or written (six drawers, six tables)
//   press gantry             the row being added to the Valuation Report (50 ticks, 7 ruled columns)
//   template book            the template workbook being copied out of SharePoint
//   calendar pointer         the monthly import (12 months)
//   counter on the console   Listed Companies still matching the Search Criteria
//
// Parts, by group (each stands on another; the audit proves it):
//   bench: top, skirt, feet, two ruler strips, label plate, corner bolts; three boundary plates with grooves and screws
//   every station: pad or plate, manifold block with its ports, deck plate, corner screws, nameplate
//   desk (User): two drawer pedestals, pulls, desktop, in-tray and its report stack, keyboard, lamp
//   lock (Entra ID): case, lid, key cylinder, plug, key, five tumbler pins, status lamp
//   console (Canvas App): body, upright panel, display, five filter knobs, submit plunger, vent slots, screws
//   canisters (Search flows): manifold bar, three canisters with knurled caps and seams, funnel, gauge
//   cabinet (Dataverse): case, plinth, cornice, six drawers with pulls and label holders
//   calendar (dataflow): stand, 12-month wheel, pointer, ribbed Power Query filter, hopper
//   crate (vendor): pallet boards and runners, crate, slats, straps, lid
//   programmer (Orchestration flow): cam drum with five cams, pillow blocks, motor, coupling, status rail, shuttle, key
//   gauge (Azure OpenAI): finned base, pedestal, bell jar, finial, dial with needle, connector block
//   press (Excel): bed, ledger with 7 columns, 50-row ruler, rails, gantry and print head
//   rack (SharePoint): shelf, bookends, nine workbooks, template book, copy tray
//   franker (Outlook): body, roller, feed bed, envelope, stamp lever, outbox
//   lines: 17 tubes with flanges, clamps on posts; emphasis lines heavier, returns lighter, import hoses ribbed, sign-in braided

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const SKILL = process.env.ANATOMY_SKILL ?? join(homedir(), ".claude", "skills", "anatomy");
const load = (file) => import(pathToFileURL(join(SKILL, file)).href);
const k = await load("kit/iso-kit.mjs");
const G = await load("kit/lathe.mjs");
const { tubePieces, tubeSvg } = await load("kit/tube.mjs");
const A = await load("kit/audit.mjs");
const { kitScript } = await load("scripts/inline-kit.mjs");

const THEME = process.argv.includes("--dark") ? "dark" : "light";

// ---------- The diagram is the source: fail the build if the model has drifted from it. ----------
{
  const dir = readdirSync(join(REPO, ".archify")).find((name) => name.startsWith("architecture-cva-power-platform-"));
  const candidate = JSON.parse(readFileSync(join(REPO, ".archify", dir, "candidate.json"), "utf8"));
  const problems = [];
  for (const c of candidate.components) if (!M.STATIONS[c.id] || M.STATIONS[c.id].name !== c.label) problems.push(`station ${c.id}`);
  if (candidate.components.length !== Object.keys(M.STATIONS).length) problems.push("station count");
  const norm = (c) => `${c.from}>${c.to}|${c.label}|${c.variant ?? ""}`;
  const theirs = candidate.connections.map(norm).sort();
  const ours = M.LINES.map(norm).sort();
  theirs.forEach((line, i) => line !== ours[i] && problems.push(`line ${line} vs ${ours[i]}`));
  if (theirs.length !== ours.length) problems.push("line count");
  for (const b of candidate.boundaries) {
    const plate = M.PLATES.find((p) => p.name === b.label);
    if (!plate || [...plate.members].sort().join() !== [...b.wraps].sort().join()) problems.push(`boundary ${b.label}`);
  }
  if (problems.length) throw new Error(`model.mjs no longer matches the diagram: ${problems.join("; ")}`);
}

const W = 1180;
const H = 690;
const AZIMUTH = 45;
const ELEVATION = 30;

const BENCH = { x: -316, y: -300, w: 632, d: 612, r: 12 };
const BENCH_H = 12;

// Stations stand where the diagram puts them, on the floor of the bench. Decks: w along x, d along y.
const ST = {
  entra: { c: [-245, -240], w: 96, d: 60 },
  vendor: { c: [240, -240], w: 108, d: 72 },
  user: { c: [-245, -125], w: 100, d: 72 },
  app: { c: [-87, -125], w: 120, d: 72 },
  search: { c: [-87, -5], w: 112, d: 70 },
  dv: { c: [85, -5], w: 128, d: 78 },
  dataflow: { c: [240, -5], w: 110, d: 70 },
  orch: { c: [85, 120], w: 150, d: 90 },
  outlook: { c: [-242, 245], w: 110, d: 66 },
  excel: { c: [-87, 245], w: 124, d: 72 },
  sharepoint: { c: [85, 245], w: 124, d: 72 },
  aoai: { c: [240, 245], w: 110, d: 70 },
};
const PLATE_PLANS = {
  "power-platform": { x: -164, y: -172, w: 468, d: 348, r: 7 },
  m365: { x: -304, y: 200, w: 458, d: 100, r: 7 },
  azure: { x: 178, y: 200, w: 126, d: 100, r: 7 },
};
const PLATE_TOP = 4;
const TUBE_Z = 10;
const DECK_Z = 16;
const T = DECK_Z + 1.2;

const P = k.fitProjection(
  [...k.boxCorners(BENCH, -BENCH_H - 6, 0), [ST.dv.c[0], ST.dv.c[1], 76], [ST.entra.c[0], ST.entra.c[1], 60], [ST.vendor.c[0], ST.vendor.c[1], 66]],
  W,
  H,
  { pad: 36, azimuth: AZIMUTH, elevation: ELEVATION },
);
const V = G.viewOf(P);
const KS = G.scaleOf(P);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const Ln = (d, style) => k.lineSvg(d, style);
const Dots = (points, style) => k.dotsSvg(points, style);

const R = A.recorder(P);
const record = R.solid;
let station = "bench";
function put(name, ref, svg, shapes = [], { bias = 0, attrs = "", ...rest } = {}) {
  const id = R.nameFor(name.includes(".") ? name : `${station}.${name}`);
  return R.put({ name: id, at: ref, bias, svg, shapes, piece: "fig", attrs: ` data-st="${station}"${attrs}`, ...rest });
}
const nm = (name) => R.nameFor(`${station}.${name}`);
const f2 = (v) => Math.round(v * 100) / 100;

function box(name, [x0, y0, z0], [x1, y1, z1], style = {}, { r = 0.5, steps = 3, bevel = 0.4, extra = "", inner = "", bias = 0, attrs = "", owner } = {}) {
  const plan = { x: x0, y: y0, w: x1 - x0, d: y1 - y0, r };
  const id = nm(name);
  const shape = record(A.slab(plan, z0, z1 - z0, { name: id, owner }, steps));
  R.put({ name: id, at: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], bias, svg: S(k.slabOf(plan, z0, z1 - z0, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, shapes: [shape], piece: "fig", attrs: ` data-st="${station}"${attrs}` });
  return shape;
}
function cyl(name, cx, cy, r, z0, z1, style = {}, { bevel = 0.4, extra = "", inner = "", bias = 0, attrs = "", knurl = 0, owner, steps } = {}) {
  const id = nm(name);
  const shape = record(A.cylinder(cx, cy, r, z0, z1 - z0, { name: id, owner }));
  const lines = knurl ? Ln(k.knurl(cx, cy, r, z0, z1, knurl, P), { tone: "lo" }) : "";
  R.put({ name: id, at: [cx, cy, (z0 + z1) / 2], bias, svg: S(k.cylinder(cx, cy, r, z0, z1 - z0, P, steps ?? Math.max(20, Math.round(r * 6)), bevel), { tone: "mid", ...style, inner: inner + lines }) + extra, shapes: [shape], piece: "fig", attrs: ` data-st="${station}"${attrs}` });
  return shape;
}
function turned(name, F, profile, style = {}, { extra = "", inner = "", bias = 0, smooth, attrs = "", owner, steps } = {}) {
  const id = nm(name);
  const opts = { ...(smooth !== undefined ? { smooth } : {}), ...(steps ? { steps } : {}) };
  const shape = record(A.solid(F, profile, { name: id, owner }));
  const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
  R.put({ name: id, at: G.add3(F.o, G.mul3(F.a, mid)), bias, svg: S(G.solidOf(profile, F, P, opts), { tone: "mid", ...style, inner }) + extra, shapes: [shape], piece: "fig", attrs: ` data-st="${station}"${attrs}` });
  return shape;
}
const UP = (x, y, z) => G.frameOf([x, y, z], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
const screwsOn = (points, z, size = 0.5) => Dots(points.map(([x, y]) => at([x, y, z])), { size });
const ringed = (points, z, r = 1.7) => Ln(points.map(([x, y]) => k.ring(x, y, r, z, P, 14)).join(""), { tone: "lo" });
const frontSeam = (plan, z, steps = 3) => Ln(k.sideSeam(plan, z, P, steps), { tone: "faint" });
const planOf = ([x0, y0], [x1, y1], r = 0.5) => ({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r });

// ---------- Bench and boundary plates ----------
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - 6, BENCH_H, P)}"/>`);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
for (const [x, y] of byDepth(k.corners(BENCH, 30))) {
  back.push(S(k.cylinder(x, y, 11, -BENCH_H - 6, 2, P, 40), { tone: "lo" }));
  back.push(S(k.cylinder(x, y, 8.4, -BENCH_H - 4, 4, P, 40), { tone: "mid" }));
}
back.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid", inner: frontSeam(BENCH, -4, 8) }));
back.push(Ln(k.planOutline(k.insetPlan(BENCH, 6), 0, P), { tone: "lo" }));
back.push(Dots(k.dotGrid(BENCH.x + 22, BENCH.y + 22, 25, 24, 24, 0, P), { size: 0.5, tone: "lo" }));
const benchBolts = k.corners(BENCH, 13);
back.push(ringed(benchBolts, 0, 2.6), screwsOn(benchBolts, 0, 0.6));
record(A.slab(BENCH, -BENCH_H, BENCH_H, { name: "stand.bench", ground: true }, 8));

// Ruler strips along the two near edges, ticks rooted on the strip's edge.
{
  const stripX = { x: BENCH.x + 22, y: BENCH.y + BENCH.d - 9, w: BENCH.w - 44, d: 6, r: 1 };
  back.push(S(k.slabOf(stripX, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const tx = k.topTicks(stripX.x + 4, stripX.x + stripX.w - 4, 5, 5, stripX.y, 0.6, [1.7, 3.2], P);
  back.push(Ln(tx.minor, { tone: "lo" }), Ln(tx.major, { tone: "mid" }));
  back.push(screwsOn([[stripX.x + 1.8, stripX.y + 3], [stripX.x + stripX.w - 1.8, stripX.y + 3]], 0.6, 0.45));
  const stripY = { x: BENCH.x + BENCH.w - 9, y: BENCH.y + 22, w: 6, d: BENCH.d - 44, r: 1 };
  back.push(S(k.slabOf(stripY, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ty = k.topTicks(stripY.y + 4, stripY.y + stripY.d - 4, 5, 5, stripY.x, 0.6, [1.7, 3.2], P, "y");
  back.push(Ln(ty.minor, { tone: "lo" }), Ln(ty.major, { tone: "mid" }));
  back.push(screwsOn([[stripY.x + 3, stripY.y + 1.8], [stripY.x + 3, stripY.y + stripY.d - 1.8]], 0.6, 0.45));
}

{
  const label = { x: 22, y: -284, w: 74, d: 22, r: 1.2 };
  back.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  back.push(Ln(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 3), { tone: "faint" }));
  back.push(k.faceTextSvg(k.topMatrix([label.x + 5, label.y + 9.5], 0.8, P, "x"), "CVA", { size: 7, tone: "hi" }));
  back.push(Ln([44, 30].map((w, i) => k.lineOnTop([label.x + 5, label.y + 13.5 + i * 3.4], [label.x + 5 + w, label.y + 13.5 + i * 3.4], 0.8, P)).join(""), { tone: "lo", free: true }));
  back.push(screwsOn([[label.x + label.w - 3.4, label.y + 3.4], [label.x + label.w - 3.4, label.y + label.d - 3.4]], 0.8, 0.45));
}

// A boundary is a plate: everything on it is inside that boundary.
for (const plate of M.PLATES) {
  const plan = PLATE_PLANS[plate.id];
  back.push(S(k.slabOf(plan, 0, PLATE_TOP, P, 6, 0.8), { tone: "lo" }));
  back.push(Ln(k.planOutline(k.insetPlan(plan, 3.5), PLATE_TOP, P, 6), { tone: "faint" }));
  const screws = k.corners(plan, 8);
  back.push(Dots(k.dotGrid(plan.x + 18, plan.y + 18, Math.floor((plan.w - 30) / 24) + 1, Math.floor((plan.d - 30) / 24) + 1, 24, PLATE_TOP, P), { size: 0.45, tone: "lo" }));
  back.push(ringed(screws, PLATE_TOP, 1.8), screwsOn(screws, PLATE_TOP, 0.5));
  record(A.slab(plan, 0, PLATE_TOP, { name: `stand.${plate.id}`, ground: true }, 6));
  const [lx, ly] = plate.id === "power-platform" ? [plan.x + 150, plan.y + 11] : [plan.x + 14, plan.y + plan.d - 5.5];
  back.push(k.faceTextSvg(k.topMatrix([lx, ly], PLATE_TOP, P, "x"), plate.name, { size: 7, tone: "mid" }));
}

const onPlate = (id) => M.PLATES.some((plate) => plate.members.includes(id));

// ---------- Decks: the block every station stands on, carrying its ports ----------
const GEOM = {};
function deck(id) {
  station = id;
  const { c: [cx, cy], w, d } = ST[id];
  const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 3 };
  const inPlate = onPlate(id);
  if (!inPlate) box("pad", [plan.x - 3, plan.y - 3, 0], [plan.x + w + 3, plan.y + d + 3, PLATE_TOP], { tone: "lo" }, { r: 4, steps: 4, bevel: 0.5 });
  box("block", [plan.x, plan.y, PLATE_TOP], [plan.x + w, plan.y + d, DECK_Z], {}, { r: 2.5, steps: 4, bevel: 0, inner: frontSeam({ ...plan, r: 2.5 }, DECK_Z - 2.4, 4) });
  box("deck", [plan.x - 1, plan.y - 1, DECK_Z], [plan.x + w + 1, plan.y + d + 1, T], { tone: "mid" }, {
    r: 3.2, steps: 4, bevel: 0.6,
    extra: Ln(k.planOutline(k.insetPlan(plan, 2.2), T, P, 4), { tone: "faint" }) + ringed(k.corners(plan, 5), T, 1.4) + screwsOn(k.corners(plan, 5), T, 0.45),
  });
  // Nameplate: a machine carries its maker's plate, along the front of the deck.
  const text = M.STATIONS[id].name;
  const textW = text.length * 4.62 + 9;
  const px = cx - textW / 2;
  const py = cy + d / 2 - 13.5;
  box("nameplate", [px, py, T], [px + textW, py + 11, T + 0.5], { tone: "lo", crease: "none" }, {
    r: 0.8, steps: 2, bevel: 0,
    extra: k.faceTextSvg(k.topMatrix([px + 4.5, py + 7.9], T + 0.5, P, "x"), text, { size: 7, tone: "hi" }),
  });
  GEOM[id] = { cx, cy, w, d, front: py - 1, floor: inPlate ? PLATE_TOP : 0 };
  return GEOM[id];
}
const faceOf = (id, side, offset) => {
  const { c: [cx, cy], w, d } = ST[id];
  if (side === "+x") return [cx + w / 2, cy + offset, TUBE_Z];
  if (side === "-x") return [cx - w / 2, cy + offset, TUBE_Z];
  if (side === "+y") return [cx + offset, cy + d / 2, TUBE_Z];
  return [cx + offset, cy - d / 2, TUBE_Z];
};

// ---------- Stations ----------
function desk() {
  const { cx, cy, front } = deck("user");
  const back0 = cy - 30;
  const front0 = Math.min(cy + 16, front);
  const top = T + 25;
  [[-42, -14], [14, 42]].forEach(([x0, x1], index) => {
    const a = [cx + x0, back0];
    const b = [cx + x1, front0];
    const plan = planOf(a, b, 0.6);
    box(`pedestal${index}`, [a[0], a[1], T], [b[0], b[1], top], {}, { r: 0.6, steps: 2, bevel: 0, inner: [T + 8.3, T + 16.6].map((z) => frontSeam(plan, z, 2)).join("") });
    [T + 4, T + 12.5, T + 21].forEach((z, row) => box(`pull${index}${row}`, [cx + (x0 + x1) / 2 - 4, front0, z - 0.6], [cx + (x0 + x1) / 2 + 4, front0 + 1.2, z + 0.6], { tone: "hi" }, { r: 0.3, steps: 2, bevel: 0 }));
  });
  box("desktop", [cx - 46, back0 - 2, top], [cx + 46, front0 + 3, top + 3], { tone: "hi", crease: "lo" }, { r: 1.2, steps: 3, bevel: 0.6 });
  const dz = top + 3;
  // In-tray: the report lands here.
  const tray = { x: cx - 38, y: back0 + 3, w: 34, d: 26, r: 0.8 };
  box("tray", [tray.x, tray.y, dz], [tray.x + tray.w, tray.y + tray.d, dz + 0.8], { tone: "lo" }, { r: 0.8, steps: 2, bevel: 0 });
  box("tray.far", [tray.x, tray.y, dz + 0.8], [tray.x + tray.w, tray.y + 1.2, dz + 5], {}, { r: 0.2, steps: 2, bevel: 0 });
  box("tray.side", [tray.x, tray.y + 1.2, dz + 0.8], [tray.x + 1.2, tray.y + tray.d, dz + 5], {}, { r: 0.2, steps: 2, bevel: 0 });
  GEOM.tray = { x: tray.x + 4, y: tray.y + 4, w: 24, d: 18, z: dz + 0.8 };
  for (let i = 0; i < 3; i++) box(`sheet${i}`, [tray.x + 4, tray.y + 4, dz + 0.8 + i * 0.7], [tray.x + 28, tray.y + 22, dz + 1.5 + i * 0.7], { tone: "lo" }, { r: 0.2, steps: 2, bevel: 0 });
  box("report", [tray.x + 4, tray.y + 4, dz + 0.8 + 3 * 0.7], [tray.x + 28, tray.y + 22, dz + 2.6 + 3 * 0.7], { tone: "hi", lit: true }, { r: 0.2, steps: 2, bevel: 0.2, attrs: ' data-part="report"' });
  // Keyboard with its rows of keys.
  const board = { x: cx + 6, y: back0 + 8, w: 34, d: 17, r: 0.9 };
  box("keyboard", [board.x, board.y, dz], [board.x + board.w, board.y + board.d, dz + 1.4], {}, { r: 0.9, steps: 2, bevel: 0.3, extra: Dots(k.dotGrid(board.x + 3, board.y + 3.2, 13, 5, 2.35, dz + 1.4, P), { size: 0.45, tone: "lo" }) });
  // Desk lamp.
  const lamp = [cx + 2, back0 + 1.5];
  cyl("lamp.base", lamp[0], lamp[1], 4, dz, dz + 1.2, {}, { bevel: 0.3 });
  cyl("lamp.stem", lamp[0], lamp[1], 0.9, dz + 1.2, dz + 15, {}, { bevel: 0 });
  cyl("lamp.head", lamp[0], lamp[1], 4.4, dz + 15, dz + 18.5, { tone: "hi" }, { bevel: 0.4 });
}

function lock() {
  const { cx, cy, front } = deck("entra");
  const y0 = cy - 22;
  const y1 = Math.min(cy + 10, front - 8);
  const plan = planOf([cx - 30, y0], [cx + 30, y1], 1.2);
  box("case", [cx - 30, y0, T], [cx + 30, y1, T + 28], {}, { r: 1.2, steps: 3, bevel: 0, inner: frontSeam(plan, T + 23, 3) });
  box("lid", [cx - 31, y0 - 1, T + 28], [cx + 31, y1 + 1, T + 30.5], { tone: "hi", crease: "lo" }, { r: 1.5, steps: 3, bevel: 0.5, extra: ringed(k.corners(plan, 4), T + 30.5, 1.4) + screwsOn(k.corners(plan, 4), T + 30.5, 0.45) });
  // Key cylinder on the front face, and the key in it.
  const F = G.frameOf([cx - 9, y1, T + 12], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  turned("escutcheon", F, [[0, 8.6], [1.2, 8.6], [1.2, 6.6], [2.6, 6.6]], {}, { extra: Ln(G.circleOf(F, 2.6, 3.8, P, 24), { tone: "faint" }) });
  box("key.blade", [cx - 9.8, y1 + 2.6, T + 8.6], [cx - 8.2, y1 + 9, T + 15.4], { tone: "hi" }, { r: 0.2, steps: 2, bevel: 0 });
  // Five tumblers on top, and a lamp that shows the session is signed in.
  for (let i = 0; i < 5; i++) {
    const x = cx - 18 + i * 7;
    cyl(`tumbler${i}`, x, cy - 6, 2.1, T + 30.5, T + 34 + (i % 3), { tone: "hi" }, { bevel: 0.3 });
  }
  cyl("lamp", cx + 18, y1 - 6, 3.4, T + 30.5, T + 32.5, { tone: "hi" }, { bevel: 0.4, attrs: ' data-part="entra-lamp"' });
  box("reader", [cx + 2, y1, T + 6], [cx + 22, y1 + 2, T + 18], { tone: "hi" }, {
    r: 0.5, steps: 2, bevel: 0,
    extra: Ln(k.segment([cx + 5, y1 + 2, T + 15], [cx + 19, y1 + 2, T + 15], P), { tone: "mid", free: true }) + Dots(Array.from({ length: 5 }, (_, i) => at([cx + 6 + i * 3, y1 + 2, T + 10])), { size: 0.45, tone: "mid" }),
  });
}

function consoleDesk() {
  const { cx, cy, front } = deck("app");
  const y0 = cy - 30;
  const y1 = Math.min(cy + 14, front);
  const plan = planOf([cx - 52, y0], [cx + 52, y1], 1);
  box("body", [cx - 52, y0, T], [cx + 52, y1, T + 11], {}, { r: 1, steps: 3, bevel: 0, inner: frontSeam(plan, T + 3, 3) });
  const top = T + 11;
  // Upright panel at the back, with the live count on its face.
  const panelFront = y0 + 12;
  box("panel", [cx - 52, y0, top], [cx + 52, panelFront, top + 26], { tone: "hi", crease: "lo" }, { r: 0.8, steps: 3, bevel: 0.5, inner: frontSeam(planOf([cx - 52, y0], [cx + 52, panelFront], 0.8), top + 22.5, 3) });
  const win = { w: 54, h: 15, x: cx - 27, z: top + 19.5 };
  const m = k.sideMatrix([win.x, panelFront], win.z, P, "left");
  const tiny = `<g transform="${m}"><rect class="cva-screen" x="0" y="0" width="${win.w}" height="${win.h}" rx="1"/><rect class="cva-screen-edge" x="0" y="0" width="${win.w}" height="${win.h}" rx="1"/><text class="cva-digits" data-part="count" x="${win.w - 3}" y="${win.h - 3.6}" font-size="11" text-anchor="end">40,000</text></g>`;
  R.put({ name: nm("display"), at: [cx, panelFront + 0.2, top + 12], bias: 0.1, svg: tiny, shapes: [record(A.slab({ x: win.x, y: panelFront, w: win.w, d: 0.2, r: 0 }, win.z - win.h, win.h, { name: nm("display.glass") }, 1))], piece: "fig", attrs: ` data-st="app"` });
  box("speaker", [cx - 46, panelFront, top + 6], [cx - 34, panelFront + 0.8, top + 19], { tone: "lo" }, { r: 0.3, steps: 1, bevel: 0, extra: Dots(Array.from({ length: 4 }, (_, c) => Array.from({ length: 5 }, (_, r) => at([cx - 43.6 + c * 2.4, panelFront + 0.8, top + 8 + r * 2.3]))).flat(), { size: 0.4, tone: "mid" }) });
  box("tag", [cx + 33, panelFront, top + 6], [cx + 46, panelFront + 0.8, top + 19], { tone: "lo" }, { r: 0.3, steps: 1, bevel: 0, extra: Ln([15, 12, 9].map((z) => k.segment([cx + 35, panelFront + 0.8, top + z], [cx + 44, panelFront + 0.8, top + z], P)).join(""), { tone: "mid", free: true }) });
  // Five filter knobs: Sectors, Industries, Countries, Market Cap min, Market Cap max.
  for (let i = 0; i < M.FILTERS; i++) {
    const x = cx - 40 + i * 15;
    const y = panelFront + 11;
    cyl(`knob${i}.collar`, x, y, 5.6, top, top + 1, { tone: "lo" }, { bevel: 0 });
    cyl(`knob${i}`, x, y, 4.2, top + 1, top + 5, {}, { bevel: 0.3, knurl: 26, extra: Ln(k.lineOnTop([x, y], [x + 3.2 * Math.sin(i * 1.1), y - 3.2 * Math.cos(i * 1.1)], top + 5, P), { tone: "hi", free: "start" }) });
  }
  // Submit plunger, the part that fires the Valuation Request.
  const sx = cx + 40;
  const sy = panelFront + 11;
  cyl("submit.collar", sx, sy, 7, top, top + 1.4, { tone: "lo" }, { bevel: 0.3 });
  cyl("submit", sx, sy, 5, top + 1.4, top + 5.2, { tone: "hi" }, { bevel: 0.5, attrs: ' data-part="submit"' });
  GEOM.submit = [sx, sy];
  // Vent slots run the full front of the body.
  const slots = [0, 1, 2, 3].map((i) => k.planOutline({ x: cx - 44 + i * 6, y: y1 - 7, w: 3.6, d: 1.2, r: 0.5 }, top, P, 2)).join("");
  box("vent", [cx - 46, y1 - 9, top], [cx - 20, y1 - 4, top + 0.4], { tone: "lo", crease: "none" }, { r: 0.4, steps: 2, bevel: 0, extra: Ln(slots, { tone: "mid" }) });
}

function canisters() {
  const { cx, cy, front } = deck("search");
  const barY = cy - 12;
  const plan = planOf([cx - 54, barY - 13], [cx + 22, barY + 13], 2);
  box("bar", [plan.x, plan.y, T], [plan.x + plan.w, plan.y + plan.d, T + 6], {}, { r: 2, steps: 3, bevel: 0.5, inner: frontSeam(plan, T + 2, 3) });
  const z0 = T + 6;
  M.SEARCH_OPS.forEach((op, index) => {
    const x = cx - 40 + index * 26;
    const F = UP(x, barY, z0);
    const body = [[0, 11], [24, 11]];
    const seam = Ln(G.arcOf(F, 6, 11, P), { tone: "faint" }) + Ln(G.arcOf(F, 19, 11, P), { tone: "faint" });
    turned(`can${index}`, F, body, { tone: index === 1 ? "hi" : "mid" }, { inner: seam });
    cyl(`cap${index}`, x, barY, 12, z0 + 24, z0 + 28, {}, { bevel: 0.4, knurl: 58, attrs: ` data-part="cap${index}"` });
    cyl(`lever${index}`, x, barY, 4, z0 + 28, z0 + 31, { tone: "hi" }, { bevel: 0.4, attrs: ` data-part="plunger${index}"` });
  });
  // Pressure gauge on the bar's front.
  const gx = cx + 36;
  const gy = Math.min(barY + 22, front - 8);
  cyl("gauge.stem", gx, gy, 1.2, T, T + 2.5, {}, { bevel: 0 });
  cyl("gauge", gx, gy, 6.4, T + 2.5, T + 5.5, { tone: "hi", crease: "lo" }, { bevel: 0.3 });
  const ticks = k.radialTicks(gx, gy, 5.2, 12, 3, T + 5.5, [0.7, 1.4], P, -2.2, 4.4);
  R.put({ name: nm("gauge.face"), at: [gx, gy, T + 5.6], bias: 0.1, svg: Ln(ticks.minor, { tone: "lo", free: true }) + Ln(ticks.major, { tone: "mid", free: true }) + Ln(k.lineOnTop([gx, gy], [gx + 3.4, gy - 2.6], T + 5.6, P), { tone: "hi", free: true }), shapes: [A.cylinder(gx, gy, 5.8, T + 5.5, 0.1, { name: "search.gauge.face", owner: "search.gauge" })], piece: "fig", attrs: ` data-st="search"` });
  const hx = cx - 30;
  box("label", [hx - 8, gy - 4, T], [hx + 24, gy + 4, T + 0.5], { tone: "lo", crease: "none" }, { r: 0.6, steps: 2, bevel: 0, extra: Ln(k.lineOnTop([hx - 5, gy - 1.4], [hx + 20, gy - 1.4], T + 0.5, P) + k.lineOnTop([hx - 5, gy + 1.4], [hx + 13, gy + 1.4], T + 0.5, P), { tone: "lo", free: true }) });
}

function cabinet() {
  const { cx, cy, front } = deck("dv");
  const y0 = cy - 32;
  const y1 = Math.min(cy + 20, front);
  const plan = planOf([cx - 58, y0], [cx + 58, y1], 1);
  box("plinth", [cx - 58, y0, T], [cx + 58, y1, T + 4], { tone: "lo" }, { r: 1, steps: 3, bevel: 0 });
  const z0 = T + 4;
  const H_ = 46;
  box("case", [cx - 56, y0 + 1, z0], [cx + 56, y1 - 1, z0 + H_], {}, {
    r: 0.8, steps: 3, bevel: 0,
    inner: Ln([y0 + 14, y0 + 27, y0 + 40].map((y) => k.segment([cx + 56, y, z0], [cx + 56, y, z0 + H_], P)).join(""), { tone: "faint" }),
    extra: Dots([y0 + 7.5, y0 + 20.5, y0 + 33.5, y0 + 46].flatMap((y) => [z0 + 4, z0 + 42].map((z) => at([cx + 56, y, z]))), { size: 0.45 }),
  });
  box("cornice", [cx - 58, y0, z0 + H_], [cx + 58, y1, z0 + H_ + 3], { tone: "hi", crease: "lo" }, { r: 1, steps: 3, bevel: 0.6, extra: ringed(k.corners(plan, 5), z0 + H_ + 3, 1.5) + screwsOn(k.corners(plan, 5), z0 + H_ + 3, 0.45) });
  const topZ = z0 + H_ + 3;
  // Top: a lamp for each table, and an index rail.
  M.TABLES.forEach((_, i) => cyl(`lamp${i}`, cx - 38 + i * 15, y0 + 9, 2.6, topZ, topZ + 1.6, { tone: "hi" }, { bevel: 0.3 }));
  box("index", [cx - 46, y0 + 18, topZ], [cx + 46, y1 - 8, topZ + 1], { tone: "lo", crease: "none" }, {
    r: 0.6, steps: 2, bevel: 0,
    extra: (() => {
      const t = k.topTicks(cx - 42, cx + 42, 4, 5, y0 + 18, topZ + 1, [1.6, 3.2], P);
      return Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" });
    })(),
  });
  // Six drawers, six tables. Each drawer is rebuilt as it opens, so its sides stretch out of the case.
  const face = y1 - 1;
  const drawers = [];
  M.TABLES.forEach((table, index) => {
    const col = index % 3;
    const row = index < 3 ? 1 : 0;
    const x0 = cx - 53.5 + col * 36;
    const x1 = x0 + 35;
    const z1 = z0 + 2 + row * 21;
    const z2 = z1 + 20;
    drawers.push({ x0, x1, y: face, z: z1, h: z2 - z1, table });
    const plate = planOf([x0, face], [x1, face + 1.6], 0.5);
    const id = nm(`drawer${index}`);
    const pull = S(k.slabOf({ x: (x0 + x1) / 2 - 6, y: face + 1.6, w: 12, d: 1.4, r: 0.5 }, z1 + 5, 2, P, 2), { tone: "hi", crease: "none" });
    const holderX = (x0 + x1) / 2 - 8;
    const holder = Ln(k.segment([holderX, face + 1.6, z2 - 4], [holderX + 16, face + 1.6, z2 - 4], P) + k.segment([holderX + 16, face + 1.6, z2 - 4], [holderX + 16, face + 1.6, z2 - 10], P) + k.segment([holderX + 16, face + 1.6, z2 - 10], [holderX, face + 1.6, z2 - 10], P) + k.segment([holderX, face + 1.6, z2 - 10], [holderX, face + 1.6, z2 - 4], P), { tone: "lo" });
    const rule = Ln(k.segment([holderX + 2.4, face + 1.6, z2 - 7], [holderX + 13, face + 1.6, z2 - 7], P), { tone: "mid", free: true });
    const parts = `<g data-part="drawer-body${index}">${S(k.slabOf(plate, z1, z2 - z1, P, 2, 0.3), { tone: "mid" })}</g><g data-part="drawer-front${index}">${pull}${holder}${rule}</g>`;
    R.put({ name: id, at: [(x0 + x1) / 2, face + 0.8, (z1 + z2) / 2], svg: parts, shapes: [record(A.slab(plate, z1, z2 - z1, { name: id }, 2))], piece: "fig", attrs: ` data-st="dv"` });
  });
  GEOM.drawers = drawers;
}

function calendar() {
  const { cx, cy, front } = deck("dataflow");
  // Stand and 12-month wheel, face up.
  const wx = cx + 20;
  const wy = cy - 8;
  const z0 = T;
  cyl("stand", wx, wy, 9, z0, z0 + 12, {}, { bevel: 0, inner: Ln(k.sideArc(wx, wy, 9, z0 + 4, P, 24), { tone: "faint" }) });
  const top = z0 + 18;
  const r = 22;
  const face = S(k.cylinder(wx, wy, r, z0 + 12, 6, P, 72, 0.8), { tone: "hi", crease: "lo", inner: Ln(k.knurl(wx, wy, r, top - 3, top, 84, P, 0.3), { tone: "lo" }) + Ln(k.sideArc(wx, wy, r, top - 3, P, 40), { tone: "faint" }) });
  const ticks = k.radialTicks(wx, wy, r - 2, M.MONTHS, 1, top, [1, 3], P);
  const dial = Ln(k.ring(wx, wy, r - 1.2, top, P, 64), { tone: "lo" }) + Ln(ticks.major + ticks.minor, { tone: "mid" }) + Ln(k.ring(wx, wy, 2, top, P, 16), { tone: "mid" });
  const id = nm("wheel");
  R.put({ name: id, at: [wx, wy, top - 3], svg: face + dial, shapes: [record(A.cylinder(wx, wy, r, z0 + 12, 6, { name: id }))], piece: "fig", attrs: ` data-st="dataflow"` });
  GEOM.calendar = { x: wx, y: wy, r: r - 5, z: top + 0.2 };
  R.put({ name: nm("wheel.pointer"), at: [wx, wy, top + 0.3], bias: 0.3, svg: `<path data-part="month-needle" class="iso-line cva-needle" data-tone="lit" data-free="start" d="${k.lineOnTop([wx, wy], [wx, wy - (r - 5)], top + 0.2, P)}"/>`, shapes: [A.tube([[wx, wy, top + 0.2], [wx, wy - (r - 5), top + 0.2]], 0.3, { name: "dataflow.pointer", owner: "dataflow.wheel" })], piece: "fig", attrs: ` data-st="dataflow"` });
  // Ribbed Power Query filter and its hopper.
  const fx = cx - 28;
  const fy = cy - 8;
  const F = UP(fx, fy, T);
  const ribs = G.ribsOf(F, 4, 22, 11, 44, P, { fade: [0.1, 0.55], seams: true });
  turned("filter", F, [[0, 11], [26, 11]], {}, { inner: k.fadedSvg(ribs, { tone: "lo" }) });
  turned("hopper", UP(fx, fy, T + 26), [[0, 11], [3, 11], [14, 16], [14, 14.6]], { tone: "hi" }, {});
}

function crate() {
  const { cx, cy } = deck("vendor");
  const y0 = cy - 28;
  const y1 = cy + 16;
  // Pallet: three runners, four boards.
  for (const x of [-42, -3, 36]) box(`runner${x}`, [cx + x, y0, T], [cx + x + 6, y1, T + 2.6], { tone: "lo" }, { r: 0.2, steps: 1, bevel: 0 });
  const zb = T + 2.6;
  const boards = [0, 1, 2, 3, 4];
  const bw = (y1 - y0 - 8) / 5;
  boards.forEach((i) => box(`board${i}`, [cx - 44, y0 + i * (bw + 2), zb], [cx + 44, y0 + i * (bw + 2) + bw, zb + 1.2], { tone: "lo" }, { r: 0.2, steps: 1, bevel: 0 }));
  const zc = zb + 1.2;
  const plan = planOf([cx - 40, y0 + 1], [cx + 40, y1 - 1], 0.6);
  const slatLines = [10, 20, 30].map((h) => k.sideSeam(plan, zc + h, P, 1)).join("");
  box("crate", [plan.x, plan.y, zc], [plan.x + plan.w, plan.y + plan.d, zc + 38], {}, { r: 0.6, steps: 1, bevel: 0, inner: Ln(slatLines, { tone: "faint" }) });
  for (const x of [-30, 30]) box(`strap${x}`, [cx + x - 1.4, y1 - 1, zc], [cx + x + 1.4, y1 - 0.5, zc + 38], { tone: "hi", crease: "none" }, { r: 0.1, steps: 1, bevel: 0 });
  box("lid", [plan.x - 1, plan.y - 1, zc + 38], [plan.x + plan.w + 1, plan.y + plan.d + 1, zc + 41], { tone: "hi", crease: "lo" }, {
    r: 0.8, steps: 2, bevel: 0.5,
    extra: Ln([1, 2, 3].map((i) => k.lineOnTop([plan.x - 1, plan.y - 1 + (i * (plan.d + 2)) / 4], [plan.x + plan.w + 1, plan.y - 1 + (i * (plan.d + 2)) / 4], zc + 41, P)).join(""), { tone: "faint" })
      + screwsOn([0, 1, 2, 3].flatMap((i) => [plan.x + 2.4, plan.x + plan.w - 2.4].map((x) => [x, plan.y + (i + 0.5) * (plan.d / 4)])), zc + 41, 0.45),
  });
}

function programmer() {
  const { cx, cy, front } = deck("orch");
  // Cam drum along x on two pillow blocks, driven by a motor. It is the subject, so it is the brightest part.
  const dy = cy - 18;
  const dz = T + 18;
  const xa = cx - 44;
  const xb = cx + 36;
  const F = G.frameOf([xa, dy, dz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  // Separate sections and cams, so each cam stands proud of the drum on screen and shades on its own.
  let along = 0;
  M.STATUSES.forEach((_, i) => {
    const s = 6 + i * 15;
    turned(`drum${i}`, F, [[along, 12], [s, 12]], { tone: "hi", crease: "lo" }, { steps: 96 });
    turned(`cam${i}`, F, [[s, 15], [s + 5, 15]], { tone: "hi", crease: "lo" }, { steps: 96 });
    along = s + 5;
  });
  turned("drum.end", F, [[along, 12], [xb - xa, 12]], { tone: "hi", crease: "lo" }, { steps: 96 });
  for (const [name, x] of [["bearing.a", xa - 8], ["bearing.b", xb]]) {
    box(name, [x, dy - 9, T], [x + 8, dy + 9, dz + 7], {}, { r: 1, steps: 2, bevel: 0.4, extra: screwsOn([[x + 4, dy - 6], [x + 4, dy + 6]], dz + 7, 0.45) });
  }
  // Motor and coupling beyond the far bearing.
  const FM = G.frameOf([xb + 8, dy, dz], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  turned("motor", FM, [[0, 5], [3, 5], [3, 10], [20, 10]], {}, { inner: k.fadedSvg(G.ribsOf(FM, 5, 18, 10, 30, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
  box("motor.foot", [xb + 12, dy - 8, T], [xb + 27, dy + 8, dz - 10], { tone: "lo" }, { r: 0.6, steps: 2, bevel: 0 });
  GEOM.drum = { xa, y: dy, z: dz, r: 15, pegs: Array.from({ length: M.STATUSES.length }, (_, i) => xa + 8.5 + i * 15) };
  // Status rail at the front: one stop per lifecycle status. The shuttle on it is the Request's status.
  const ry = Math.min(cy + 15, front - 8);
  const rail = { x: cx - 60, y: ry - 2, w: 120, d: 10, r: 0.8 };
  box("rail", [rail.x, rail.y, T], [rail.x + rail.w, rail.y + rail.d, T + 2.4], { tone: "lo" }, {
    r: 0.8, steps: 2, bevel: 0.2,
    extra: Ln(k.lineOnTop([rail.x + 2, rail.y + 4], [rail.x + rail.w - 2, rail.y + 4], T + 2.4, P), { tone: "faint", free: true }),
  });
  const stops = M.STATUSES.map((_, i) => rail.x + 12 + (i * (rail.w - 24)) / (M.STATUSES.length - 1));
  stops.forEach((x, i) => {
    box(`stop${i}`, [x - 1, rail.y + rail.d, T], [x + 1, rail.y + rail.d + 3, T + 1], { tone: i === M.STATUSES.length - 1 ? "hi" : "mid" }, { r: 0.1, steps: 1, bevel: 0 });
  });
  GEOM.status = { stops, y: rail.y, d: rail.d, z: T + 2.4 };
  // Service account key: flows run under a service identity.
  const kx = cx + 58;
  const ky = cy - 34;
  cyl("key.collar", kx, ky, 5.4, T, T + 3, {}, { bevel: 0.3 });
  cyl("key.plug", kx, ky, 3.2, T + 3, T + 4, { tone: "hi" }, { bevel: 0 });
  box("key.bow", [kx - 0.7, ky - 3, T + 4], [kx + 0.7, ky + 3, T + 9], { tone: "hi" }, { r: 0.2, steps: 1, bevel: 0 });
  // Control box beside the drum.
  const plan = planOf([cx - 66, cy - 40], [cx - 54, cy + 4], 0.6);
  box("control", [plan.x, plan.y, T], [plan.x + plan.w, plan.y + plan.d, T + 15], {}, { r: 0.6, steps: 2, bevel: 0.3, extra: Dots(k.dotGrid(plan.x + 3, plan.y + 4, 3, 6, 3, T + 15, P), { size: 0.45, tone: "lo" }) });
}

function gauge() {
  const { cx, cy, front } = deck("aoai");
  // Finned base.
  const fx0 = cx - 44;
  const fy0 = cy - 28;
  const baseH = 6;
  const plan = planOf([fx0, fy0], [fx0 + 50, fy0 + 42], 1);
  box("base", [plan.x, plan.y, T], [plan.x + plan.w, plan.y + plan.d, T + 2], { tone: "lo" }, { r: 1, steps: 2, bevel: 0 });
  for (let i = 0; i < 12; i++) box(`fin${i}`, [plan.x + 2 + i * 3.9, plan.y + 1, T + 2], [plan.x + 3.1 + i * 3.9, plan.y + plan.d - 1, T + 2 + baseH], { tone: "mid" }, { r: 0.1, steps: 1, bevel: 0 });
  box("seat", [plan.x, plan.y, T + 2 + baseH], [plan.x + plan.w, plan.y + plan.d, T + 2 + baseH + 2], { tone: "hi", crease: "lo" }, { r: 1, steps: 2, bevel: 0.4 });
  const bz = T + 2 + baseH + 2;
  const bx = plan.x + plan.w / 2;
  const by = plan.y + plan.d / 2;
  // Bell jar: where the scoring happens, sealed off from everything but its connector.
  const Rb = 16;
  const Hb = 28;
  const F = UP(bx, by, bz);
  cyl("collar", bx, by, Rb + 2, bz, bz + 2.4, {}, { bevel: 0.3, knurl: 60 });
  const FB = UP(bx, by, bz + 2.4);
  const dome = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const h = Hb * t;
    const rr = t < 0.5 ? Rb : Rb * Math.sqrt(Math.max(0, 1 - ((t - 0.5) / 0.5) ** 2));
    return [h, Math.max(rr, 0.01), 1];
  });
  const slope = (s) => {
    const t = s / Hb;
    if (t < 0.5) return 0;
    const u = Math.min(0.995, (t - 0.5) / 0.5);
    return (-Rb * u) / (Math.sqrt(1 - u * u) * (Hb * 0.5));
  };
  const radius = (s) => {
    const t = s / Hb;
    return t < 0.5 ? Rb : Rb * Math.sqrt(Math.max(1e-4, 1 - ((t - 0.5) / 0.5) ** 2));
  };
  turned("jar", FB, dome, { tone: "hi", crease: "none" }, { smooth: { slope, radius }, inner: Ln(G.arcOf(FB, 4, Rb, P), { tone: "faint" }), steps: 64 });
  cyl("finial", bx, by, 2.2, bz + 2.4 + Hb - 0.2, bz + 2.4 + Hb + 3, {}, { bevel: 0.3 });
  void F;
  // Dial: the Match Score that just came back, 0 to 100 percent.
  const dx = cx + 30;
  const dy = cy - 12;
  const dr = 19;
  cyl("dial.stand", dx, dy, 7, T, T + 8, {}, { bevel: 0, inner: Ln(k.sideArc(dx, dy, 7, T + 3, P, 20), { tone: "faint" }) });
  const top = T + 13;
  const ticks = k.radialTicks(dx, dy, dr - 3, 50, 5, top, [1.1, 2.6], P, -Math.PI * 0.75, Math.PI * 1.5);
  const id = nm("dial");
  const dial = S(k.cylinder(dx, dy, dr, T + 8, 5, P, 72, 0.8), { tone: "hi", crease: "lo", inner: Ln(k.knurl(dx, dy, dr, top - 2.6, top, 72, P, 0.3), { tone: "lo" }) + Ln(k.sideArc(dx, dy, dr, top - 2.6, P, 40), { tone: "faint" }) });
  R.put({ name: id, at: [dx, dy, top - 2.5], svg: dial + Ln(k.ring(dx, dy, dr - 2, top, P, 64), { tone: "lo" }) + Ln(ticks.minor, { tone: "lo" }) + Ln(ticks.major, { tone: "mid" }) + Ln(k.ring(dx, dy, 1.6, top, P, 14), { tone: "mid" }), shapes: [record(A.cylinder(dx, dy, dr, T + 8, 5, { name: id }))], piece: "fig", attrs: ` data-st="aoai"` });
  GEOM.dial = { x: dx, y: dy, r: dr - 4, z: top + 0.2, start: -Math.PI * 0.75, span: Math.PI * 1.5 };
  R.put({ name: nm("dial.needle"), at: [dx, dy, top + 0.3], bias: 0.3, svg: `<path data-part="score-needle" class="iso-line cva-needle" data-tone="lit" data-free="start" d="${k.lineOnTop([dx, dy], [dx - (dr - 4) * Math.sin(Math.PI * 0.75), dy - (dr - 4) * Math.cos(Math.PI * 0.75)], top + 0.2, P)}"/>`, shapes: [A.tube([[dx, dy, top + 0.2], [dx - (dr - 4) * Math.sin(Math.PI * 0.75), dy - (dr - 4) * Math.cos(Math.PI * 0.75), top + 0.2]], 0.3, { name: "aoai.needle", owner: "aoai.dial" })], piece: "fig", attrs: ` data-st="aoai"` });
  void front;
}

function press() {
  const { cx, cy, front } = deck("excel");
  const y0 = cy - 30;
  const y1 = Math.min(cy + 18, front);
  const bed = planOf([cx - 50, y0], [cx + 50, y1], 1);
  box("bed", [bed.x, bed.y, T], [bed.x + bed.w, bed.y + bed.d, T + 3], {}, { r: 1, steps: 2, bevel: 0.4 });
  // Ledger: seven ruled columns; the strip along its edge has one tick per row, 50 in all.
  const sheet = { x: cx - 36, y: y0 + 3, w: 66, d: y1 - y0 - 6, r: 0.3 };
  const zs = T + 3.4;
  let rules = "";
  for (let i = 0; i <= M.COLUMNS; i++) {
    const x = sheet.x + (i * sheet.w) / M.COLUMNS;
    rules += k.lineOnTop([x, sheet.y], [x, sheet.y + sheet.d], zs, P);
  }
  for (let i = 0; i <= 10; i++) {
    const y = sheet.y + (i * sheet.d) / 10;
    rules += k.lineOnTop([sheet.x, y], [sheet.x + sheet.w, y], zs, P);
  }
  box("ledger", [sheet.x, sheet.y, T + 3], [sheet.x + sheet.w, sheet.y + sheet.d, zs], { tone: "lo", crease: "none" }, { r: 0.3, steps: 1, bevel: 0, extra: Ln(rules, { tone: "faint" }) });
  const strip = { x: sheet.x - 7, y: sheet.y, w: 5, d: sheet.d, r: 0.3 };
  box("ruler", [strip.x, strip.y, T + 3], [strip.x + strip.w, strip.y + strip.d, zs], { tone: "lo", crease: "none" }, {
    r: 0.3, steps: 1, bevel: 0,
    extra: (() => { const t = k.topTicks(strip.y, strip.y + strip.d, strip.d / M.SHORTLIST, 5, strip.x, zs, [1.4, 2.8], P, "y"); return Ln(t.minor, { tone: "lo" }) + Ln(t.major, { tone: "mid" }); })(),
  });
  // Two rails either side and the gantry that rides them.
  const railZ = T + 3;
  for (const x of [cx - 47, cx + 42]) box(`rail${x}`, [x, y0 + 1, railZ], [x + 5, y1 - 1, railZ + 2.4], { tone: "mid" }, { r: 0.4, steps: 2, bevel: 0.2 });
  GEOM.press = { y0: sheet.y + 1, y1: sheet.y + sheet.d - 1 };
  const Gz = railZ + 2.4;
  const parts = [];
  const shapes = [];
  const add = (name, [x0, y, z0], [x1, y2, z1], style, opts = {}) => {
    const plan = planOf([x0, y], [x1, y2], opts.r ?? 0.4);
    parts.push(S(k.slabOf(plan, z0, z1 - z0, P, 2, opts.bevel ?? 0.3), { tone: "mid", ...style }));
    shapes.push(record(A.slab(plan, z0, z1 - z0, { name: nm(`gantry.${name}`), owner: "excel.gantry" }, 2)));
  };
  const gy = 0;
  add("foot.far", [cx - 48, gy - 5, Gz], [cx - 41, gy + 5, Gz + 16], {});
  add("bridge", [cx - 48, gy - 3, Gz + 16], [cx + 48, gy + 3, Gz + 21], { tone: "hi", crease: "lo" });
  add("foot.near", [cx + 41, gy - 5, Gz], [cx + 48, gy + 5, Gz + 16], {});
  add("head", [cx - 6, gy - 5, Gz + 21], [cx + 6, gy + 5, Gz + 27], {});
  parts.push(screwsOn([[cx - 4, gy - 3], [cx + 4, gy - 3], [cx - 4, gy + 3], [cx + 4, gy + 3]], Gz + 27, 0.4));
  const startY = GEOM.press.y0;
  R.put({ name: nm("gantry"), at: [cx, startY, Gz + 14], bias: 0.2, svg: `<g data-part="gantry" transform="${k.translateAlong(P, [0, startY, 0])}">${parts.join("")}</g>`, shapes: shapes.map((s) => A.moved(s, [0, startY, 0])), piece: "fig", attrs: ` data-st="excel"` });
  // Remove the unmoved records of the gantry: they stand at y = 0, nowhere near the bench station.
  for (const s of shapes) R.solids.splice(R.solids.indexOf(s), 1);
  for (const s of R.items[R.items.length - 1].shapes) R.solids.push(s);
}

function rack() {
  const { cx, cy, front } = deck("sharepoint");
  const y0 = cy - 30;
  const shelf = planOf([cx - 52, y0], [cx + 52, cy + 6], 1);
  box("shelf", [shelf.x, shelf.y, T], [shelf.x + shelf.w, shelf.y + shelf.d, T + 3], {}, { r: 1, steps: 2, bevel: 0.4 });
  const z0 = T + 3;
  box("end.far", [shelf.x, shelf.y, z0], [shelf.x + 2, shelf.y + shelf.d, z0 + 26], { tone: "hi", crease: "lo" }, { r: 0.3, steps: 1, bevel: 0.2 });
  box("back", [shelf.x + 2, shelf.y, z0], [shelf.x + shelf.w - 2, shelf.y + 2, z0 + 26], {}, { r: 0.2, steps: 1, bevel: 0 });
  box("end.near", [shelf.x + shelf.w - 2, shelf.y, z0], [shelf.x + shelf.w, shelf.y + shelf.d, z0 + 7], { tone: "mid" }, { r: 0.3, steps: 1, bevel: 0.2 });
  // Workbooks standing in a row. The template is the one the flow copies from, so it stands out.
  const heights = [19, 16, 20, 15, 25, 17, 19, 14, 18];
  const bw = 8.4;
  heights.forEach((h, i) => {
    const x = shelf.x + 4 + i * (bw + 1);
    const isTemplate = i === 4;
    const plan = planOf([x, shelf.y + 3], [x + bw, shelf.y + shelf.d - 3], 0.3);
    box(isTemplate ? "template" : `book${i}`, [plan.x, plan.y, z0], [plan.x + plan.w, plan.y + plan.d, z0 + h], { tone: isTemplate ? "hi" : "mid" }, {
      r: 0.3, steps: 1, bevel: 0,
      inner: frontSeam(plan, z0 + h - 3, 1),
      attrs: isTemplate ? ' data-part="template"' : "",
    });
  });
  // Per-request copies pile up in the tray on the deck.
  const tray = { x: cx + 10, y: cy + 10, w: 36, d: Math.max(6, front - cy - 10) };
  box("tray", [tray.x, tray.y, T], [tray.x + tray.w, tray.y + tray.d, T + 1.2], { tone: "lo" }, { r: 0.5, steps: 1, bevel: 0.2 });
  const padX = cx - 46;
  box("pad", [padX, tray.y, T], [padX + 40, tray.y + tray.d, T + 1.2], { tone: "lo" }, { r: 0.5, steps: 1, bevel: 0.2, extra: Dots(k.dotGrid(padX + 3, tray.y + 1.5, 13, 2, 2.8, T + 1.2, P), { size: 0.4, tone: "lo" }) });
}

function franker() {
  const { cx, cy, front } = deck("outlook");
  const y0 = cy - 26;
  const y1 = Math.min(cy + 14, front);
  // Body with its roller, and the feed bed the envelope rides on.
  const plan = planOf([cx - 46, y0], [cx + 2, y1], 1);
  box("body", [plan.x, plan.y, T], [plan.x + plan.w, plan.y + plan.d, T + 22], {}, { r: 1, steps: 2, bevel: 0, inner: frontSeam(plan, T + 5, 2) + frontSeam(plan, T + 18, 2) });
  box("cap", [plan.x - 1, plan.y - 1, T + 22], [plan.x + plan.w + 1, plan.y + plan.d + 1, T + 25], { tone: "hi", crease: "lo" }, { r: 1.2, steps: 2, bevel: 0.5, extra: screwsOn(k.corners(plan, 4), T + 25, 0.45) });
  const F = G.frameOf([cx - 37, y1 + 0, T + 30], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  void F;
  const Fr = G.frameOf([cx - 38, cy - 6, T + 30], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  box("cheek.far", [cx - 40, cy - 11, T + 25], [cx - 38, cy - 1, T + 33], {}, { r: 0.2, steps: 1, bevel: 0 });
  box("cheek.near", [cx - 8, cy - 11, T + 25], [cx - 6, cy - 1, T + 33], {}, { r: 0.2, steps: 1, bevel: 0 });
  turned("roller", Fr, [[0, 3.4], [30, 3.4]], { tone: "hi" }, { inner: k.fadedSvg(G.ribsOf(Fr, 0, 30, 3.4, 26, P, { fade: [0.1, 0.55] }), { tone: "lo" }) });
  const bed = planOf([cx + 2, y0 + 4], [cx + 48, y1 - 3], 0.6);
  box("bed", [bed.x, bed.y, T], [bed.x + bed.w, bed.y + bed.d, T + 5], {}, { r: 0.6, steps: 2, bevel: 0.3 });
  box("guide", [bed.x, bed.y, T + 5], [bed.x + bed.w, bed.y + 1.6, T + 7.4], { tone: "mid" }, { r: 0.2, steps: 1, bevel: 0 });
  // Envelope, flap lines drawn on its top.
  const env = { x: 0, y: bed.y + 4, w: 28, d: bed.d - 9, z: T + 5 };
  const ex = bed.x + 7;
  const flap = k.lineOnTop([ex, env.y], [ex + env.w / 2, env.y + env.d / 2], env.z + 0.7, P) + k.lineOnTop([ex + env.w / 2, env.y + env.d / 2], [ex + env.w, env.y], env.z + 0.7, P);
  const id = nm("envelope");
  const envPlan = { x: ex, y: env.y, w: env.w, d: env.d, r: 0.3 };
  R.put({ name: id, at: [ex + env.w / 2, env.y + env.d / 2, env.z + 0.4], bias: 0.2, svg: `<g data-part="envelope">${S(k.slabOf(envPlan, env.z, 0.7, P, 1, 0), { tone: "hi", crease: "none" })}${Ln(flap, { tone: "mid" })}</g>`, shapes: [record(A.slab(envPlan, env.z, 0.7, { name: id }, 1))], piece: "fig", attrs: ` data-st="outlook"` });
  GEOM.envelope = { travel: bed.w - env.w - 12 };
  // Stamp lever and ink pot.
  const lx = cx - 20;
  const ly = y1 + 1.6;
  box("lever.hub", [lx - 3, y1, T + 11], [lx + 3, y1 + 2, T + 17], {}, { r: 0.3, steps: 1, bevel: 0 });
  const Fl = G.frameOf([lx, y1 + 2, T + 14], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  turned("lever.arm", Fl, [[0, 1], [9, 1]], {});
  const knob = [lx, y1 + 2 + 9 + 2.6, T + 14];
  const kname = nm("lever.knob");
  R.put({ name: kname, at: knob, svg: S(G.sphereOf(knob, 3, P, { steps: 32 }), { tone: "hi" }), shapes: [record(A.ball(knob, 3, { name: kname }))], piece: "fig", attrs: ' data-st="outlook"' });
  cyl("ink", cx + 40, y0 - 2, 3.6, T, T + 5, { tone: "hi" }, { bevel: 0.3 });
  void ly;
}

// ---------- Tubes ----------
const TUBES = {};
const STYLE = {
  emphasis: { r: 3, tone: "hi", flange: 4.8 },
  plain: { r: 2.2, tone: "mid", flange: 3.8 },
  security: { r: 1.5, tone: "mid", flange: 2.9, rings: { pitch: 2.4, twist: 1.2, cross: true } },
  dashed: { r: 2.6, tone: "mid", flange: 4.4, rings: { pitch: 3 } },
};
const floorAt = (x, y) => {
  for (const plate of Object.values(PLATE_PLANS)) if (x > plate.x + 6 && x < plate.x + plate.w - 6 && y > plate.y + 6 && y < plate.y + plate.d - 6) return PLATE_TOP;
  for (const plate of Object.values(PLATE_PLANS)) if (x > plate.x - 6 && x < plate.x + plate.w + 6 && y > plate.y - 6 && y < plate.y + plate.d + 6) return null;
  return 0;
};

function tube(id, control, { clamps = 0 } = {}) {
  const line = M.LINES.find((entry) => entry.id === id);
  const style = STYLE[line.variant ?? "plain"];
  const { r, tone, flange, rings } = style;
  const route = G.fillet(control, Math.max(r * 3, 6), 12, { P, tube: r });
  const total = G.pathLength(route);
  const thick = 1.1;
  const name = `line.${id}`;
  const collars = [];
  [[0, 1], [total, -1]].forEach(([along, sign]) => {
    const tangent = G.tangentAlong(route, along);
    collars.push({ kind: "flange", centre: G.add3(G.pointAlong(route, along), G.mul3(tangent, (sign * thick) / 2)), tangent, radius: flange, thick, gap: sign > 0 ? [0, thick] : [total - thick, total] });
  });
  // Clamps on posts along the straight runs, gapped through.
  const posts = [];
  for (let i = 1; i <= clamps; i++) {
    let along = (total * i) / (clamps + 1);
    for (let tries = 0; tries < 40; tries++) {
      const t = G.tangentAlong(route, along);
      const p = G.pointAlong(route, along);
      const straight = Math.max(Math.abs(t[0]), Math.abs(t[1])) > 0.9995;
      if (straight && floorAt(p[0], p[1]) !== null) break;
      along += 3;
    }
    const thickC = 2.4;
    collars.push({ kind: "clamp", centre: G.pointAlong(route, along), tangent: G.tangentAlong(route, along), radius: r + 1.1, thick: thickC, gap: [along - thickC / 2, along + thickC / 2] });
    posts.push(along);
  }
  const gaps = collars.map((c) => c.gap).sort((a, b) => a[0] - b[0]);
  const a = GEOM_STATION(line.from);
  void a;
  R.route(name, route, r, { gaps, rims: [flange, flange], owner: name });
  const pieces = tubePieces(route, r, P, { maxLength: 26, spacing: Math.min(2, r), gaps, ...(rings ? { rings } : {}) });
  pieces.forEach((piece, index) => {
    const pts = piece.points.map(at);
    const d = `M${pts.map(([x, y]) => `${f2(x)} ${f2(y)}`).join("L")}`;
    const pulse = `<path class="cva-pulse" data-line="${id}" data-from="${f2(piece.from)}" data-to="${f2(piece.to)}" pathLength="${f2(piece.to - piece.from)}" d="${d}" style="stroke-width:${f2(r * KS * 1.25)}"/>`;
    R.put({ name: `${name}:${index}`, at: piece.mid, bias: 0.05, route: name, chunk: index, svg: tubeSvg(piece, { tone }) + pulse, shapes: [A.tube(piece.points, piece.radii, { name: `${name}:${index}`, owner: name })], piece: "fig", attrs: ` data-line="${id}"` });
  });
  for (const collar of collars) {
    const F = G.frameAlong(collar.centre, collar.tangent);
    const cname = R.nameFor(`${name}.${collar.kind}`);
    const paths = G.disc(-collar.thick / 2, collar.thick / 2, collar.radius, F, P, { steps: 28 });
    R.put({ name: cname, at: collar.centre, bias: 0.1, svg: S(paths, { tone: collar.kind === "flange" ? tone : "mid" }), shapes: [record(A.disc(F, -collar.thick / 2, collar.thick / 2, collar.radius, { name: cname, owner: name }))], piece: "fig", attrs: ` data-line="${id}"` });
    if (collar.kind === "clamp") {
      const [px, py] = [collar.centre[0], collar.centre[1]];
      const floor = floorAt(px, py) ?? PLATE_TOP;
      const top = TUBE_Z - collar.radius + 0.05;
      const pname = R.nameFor(`${name}.post`);
      R.put({ name: pname, at: [px, py, (floor + top) / 2], bias: 0.08, svg: S(k.cylinder(px, py, 2.2, floor, 0.8, P, 16, 0), { tone: "lo" }) + S(k.cylinder(px, py, 1.1, floor + 0.8, top - floor - 0.8, P, 14, 0), { tone: "mid", crease: "none" }), shapes: [record(A.cylinder(px, py, 2.2, floor, 0.8, { name: `${pname}.foot`, owner: name })), record(A.cylinder(px, py, 1.1, floor + 0.8, top - floor - 0.8, { name: pname, owner: name }))], piece: "fig", attrs: ` data-line="${id}"` });
    }
  }
  TUBES[id] = { points: route.map((p) => p.map(f2)), total: f2(total), from: line.from, to: line.to, label: line.label };
  return route;
}
const GEOM_STATION = (id) => GEOM[id];

desk();
lock();
consoleDesk();
canisters();
cabinet();
calendar();
crate();
programmer();
gauge();
press();
rack();
franker();

// Routes keep to the diagram's own topology, so no line has to cross another.
const zz = TUBE_Z;
tube("sign-in", [faceOf("user", "-y", 42), faceOf("entra", "+y", 42)]);
tube("enter-criteria", [faceOf("user", "+x", 0), faceOf("app", "-x", 0)]);
tube("search-ops", [faceOf("app", "+y", 36), faceOf("search", "-y", 36)]);
tube("query-companies", [faceOf("search", "+x", 0), faceOf("dv", "-x", 0)]);
tube("submit-request", [faceOf("app", "+x", 0), [ST.dv.c[0], ST.app.c[1], zz], faceOf("dv", "-y", 0)], { clamps: 1 });
tube("monthly-pull", [faceOf("vendor", "+y", 0), faceOf("dataflow", "-y", 0)], { clamps: 1 });
tube("upsert", [faceOf("dataflow", "-x", 0), faceOf("dv", "+x", 0)]);
tube("row-added", [faceOf("dv", "+y", -13), faceOf("orch", "-y", -13)]);
tube("update-request", [faceOf("orch", "-y", 13), faceOf("dv", "+y", 13)]);
tube("score-entries", [faceOf("orch", "+x", 12), [ST.aoai.c[0] - 14, ST.orch.c[1] + 12, zz], faceOf("aoai", "-y", -14)], { clamps: 1 });
tube("return-scores", [faceOf("aoai", "-y", 14), [ST.aoai.c[0] + 14, ST.orch.c[1] - 12, zz], faceOf("orch", "+x", -12)], { clamps: 1 });
tube("copy-template", [faceOf("orch", "+y", -13), faceOf("sharepoint", "-y", -13)]);
tube("return-workbook", [faceOf("sharepoint", "-y", 13), faceOf("orch", "+y", 13)]);
tube("fill-rows", [faceOf("orch", "-x", 12), [ST.excel.c[0], ST.orch.c[1] + 12, zz], faceOf("excel", "-y", 0)], { clamps: 1 });
tube("write-workbook", [faceOf("excel", "+x", 0), faceOf("sharepoint", "-x", 0)]);
tube("send-email", [faceOf("orch", "-x", -12), [ST.outlook.c[0] + 20, ST.orch.c[1] - 12, zz], faceOf("outlook", "-y", 20)], { clamps: 2 });
tube("deliver-report", [faceOf("outlook", "-y", -20), [ST.outlook.c[0] - 20, faceOf("user", "+y", 0)[1], zz]], { clamps: 3 });

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const groups = R.items.map((item) => `<g class="it" data-name="${item.name}"${item.attrs ?? ""}>${item.svg}</g>`);

// Peg dots on the drum turn with the run. They sit in a slot right after the drum.
const drumIndex = Math.max(...R.items.map((item, i) => (item.name.startsWith("orch.drum") || item.name.startsWith("orch.cam") ? i : -1)));
groups[drumIndex] += `<g data-part="pegs" data-st="orch"></g>`;
// The status shuttle rides the rail; its slot is right after the last stop on the rail.
const railIndex = Math.max(...R.items.map((item, i) => (item.name.startsWith("orch.rail") || item.name.startsWith("orch.stop") ? i : -1)));
const shuttlePlan = { x: -10, y: GEOM.status.y + 0.5, w: 20, d: GEOM.status.d - 1, r: 1.2 };
const shuttle = S(k.slabOf(shuttlePlan, GEOM.status.z, 7, P, 2, 0.6), { tone: "hi", lit: true }) + Dots([[-6, 1], [6, 1]].map(([x, u]) => at([x, GEOM.status.y + GEOM.status.d / 2 * u, GEOM.status.z + 7])), { size: 0.5, tone: "hi" });
groups[railIndex] += `<g data-part="shuttle" data-st="orch" transform="${k.translateAlong(P, [GEOM.status.stops[0], 0, 0])}">${shuttle}</g>`;

const LABEL =
  "The Client Valuation Automation system built as a pneumatic-tube exchange on a workbench. Twelve machine stations stand where the architecture diagram puts them, on three raised plates for Power Platform, Microsoft 365 and Azure, with the User, Microsoft Entra ID and the Market Data Vendor on the bench itself. Seventeen glass tubes join them, one for each connection in the diagram, so a call and its reply are two separate lines.";
const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...back, `<g class="cva-fig">${groups.join("")}</g>`] });

const CSS = `
.cva-stage{cursor:default;outline:none}
.iso-plate .iso-svg{touch-action:pan-y}
.cva-pulse{fill:none;stroke:var(--cva-capsule);stroke-linecap:round;visibility:hidden;pointer-events:none}
.cva-needle{stroke-width:1.2px}
.cva-screen{fill:var(--cva-screen)}
.cva-screen-edge{fill:none;stroke:var(--anatomy-mid);stroke-width:.6;vector-effect:non-scaling-stroke}
.cva-digits{fill:var(--cva-digits);font-family:var(--anatomy-mono);letter-spacing:.06em}
.iso{--cva-capsule:#0f6cbd;--cva-screen:#1d2a30;--cva-digits:#d9f4ff}
.iso[data-theme="dark"]{--cva-capsule:#6cb8f6;--cva-screen:#081014;--cva-digits:#bfeaff}
.cva-focus .it:not(.on) .iso-line,.cva-focus g[data-part="shuttle"]:not(.on) .iso-line{stroke:var(--anatomy-faint)}
.cva-focus .it:not(.on) .iso-face-text{fill:var(--anatomy-faint)}
.cva-focus .it:not(.on) .tb-shine,.cva-focus .it:not(.on) .tb-shade{opacity:.45}
.cva-focus .it:not(.on) .cva-screen,.cva-focus .it:not(.on) .cva-digits{opacity:.3}
.it.on .iso-edge,.it.on .tb-edge{stroke:var(--anatomy-lit)}
.cva-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:2px 16px;margin:14px 0 0;padding:0;list-style:none;font-size:13px}
.cva-list button{all:unset;display:block;width:100%;padding:3px 6px;border-radius:4px;color:var(--anatomy-text);cursor:pointer}
.cva-list button b{color:var(--anatomy-strong);font-weight:600}
.cva-list button:hover,.cva-list button:focus-visible,.cva-list button[aria-pressed="true"]{background:var(--anatomy-face);box-shadow:0 0 0 1px var(--anatomy-lo)}
.cva-note{display:inline-block;margin:0 0 14px;font-size:12px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--anatomy-muted)}
.cva-back{display:inline-block;margin:0 0 14px 12px;font-size:13px;color:var(--anatomy-text)}
`;

const DATA = {
  P,
  tubes: TUBES,
  drawers: GEOM.drawers,
  status: GEOM.status,
  dial: GEOM.dial,
  calendar: GEOM.calendar,
  press: GEOM.press,
  envelope: GEOM.envelope,
  drum: GEOM.drum,
  view: V,
  stations: M.STATIONS,
};
const modelSource = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const LIVE = `${modelSource}\nconst D = ${JSON.stringify(DATA)};\n${readFileSync(join(HERE, "live.js"), "utf8")}`;

const list = `<ul class="cva-list" aria-label="Stations">${Object.entries(M.STATIONS).map(([id, s]) => `<li><button type="button" data-pick="${id}"><b>${s.name}</b> · ${s.role}</button></li>`).join("")}</ul>`;
const body =
  `<style>${CSS}</style><span class="cva-note">Experimental diagram</span><a class="cva-back" href="../../index.html">← All diagrams</a>` +
  k.plateHtml({
    fig: "Fig 1",
    title: "CVA as a tube exchange",
    hint: "Hover a station · ← → steps · space pauses",
    readout: M.statusText(M.STEPS[0]),
    keys: [
      { mark: "lit", label: "Capsule: one call running down one line, source to target" },
      { mark: "raised", label: "Heavy tube: main path. Light tube: ordinary call or return" },
      { mark: "dotted", label: "Ribbed hose: monthly import. Braided line: sign-in" },
    ],
    caption:
      "The Power Platform architecture diagram built as a machine. Stations stand where the diagram puts them, and each of its 17 connections is one tube, so a request and its reply are separate lines. Plates are its three boundaries. The Dataverse cabinet has one drawer per table, the programmer's rail one stop per status (the fifth is Failed), the press 7 columns and 50 rows. A whole-stage failure, which sets Failed and sends a failure notice down the same line as the report, is not shown running. Search counts and Match Scores are illustrative, and one Shortlist Entry is left not scored to show that this doesn't fail the request.",
    body: `<div class="iso-stage cva-stage" tabindex="0" role="group" aria-label="Tube exchange. Left and right arrows step through one run; space pauses; hovering a station shows its lines.">${svg}</div>`,
  }) + list;

const page = k.pageHtml({ title: "Tube exchange", theme: THEME, body, script: kitScript() + LIVE, width: 1180 });
const name = THEME === "light" ? "cva-exchange.html" : "cva-exchange-dark.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${R.items.length} items`, `${R.solids.length} solids`, `${page.match(/<path/g).length} paths`, `scale ${KS.toFixed(3)}`, `${Object.keys(TUBES).length} lines`);

A.auditOrExit(R, P, {});
