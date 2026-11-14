// Generates the gravel fill pattern's tile for src/sketch/fillPatterns.js.
//
//   node utils/gravelPattern.cjs [cells per side] [seed] [Lloyd steps] > gravel.txt
//
// Prints the tile's content: the markup that goes in fillPatterns.gravel.content.
// Defaults (5, 1, 4) reproduce the tile in fillPatterns.js; its width and height are
// 40 * cells per side. Statistics go to stderr.
//
// Gravel is modeled on ghiaia2.pat ("ghiaia" = gravel). That file is periodic on a
// 1 x 1 cell: its line families, split at their T-junctions, tile the plane with
// 15 large stones per cell, plus 18 small wedge stones where three large stones meet.
// Tiled faithfully, the cell repeat makes an obvious grid. So this script makes a new
// tiling of a periodic block of cells, with the file's statistics:
//   1. Large stones: a periodic power diagram of 15 sites per cell. Each site gets a
//      target area, log-uniform over the file's range (0.016 - 0.11 of a cell), scaled
//      so that the stones fill the tile. The sites start at random, take a few Lloyd
//      steps (each site moves to its stone's centroid), and the weights are relaxed
//      until each stone's area matches its target. With no Lloyd steps the stones look
//      like shattered glass; with many they become a honeycomb.
//   2. Wedges: at a random selection of three-way corners (as many per cell as the
//      file has), a small triangle is cut in, its corners on the three edges, with an
//      area log-uniform over the file's wedge range (0.001 - 0.009 of a cell).
//   3. Output: edges and wedge sides chained into polylines, each drawn once, plus
//      copies across the tile edges it crosses. Coordinates are integers in 0.2 px
//      units, under a scale(.2) transform, which keeps the markup small.
//
// The script that made Sketch's first gravel tile (10 x 10 cells, 117 KB) was lost;
// this one was rebuilt from notes on how it worked.

const CELLS = +process.argv[2] || 5
const SEED = +process.argv[3] || 1
const LLOYD = process.argv[4] === undefined ? 4 : +process.argv[4]
const CELL = 40                // px per ghiaia2 cell
const SIZE = CELLS * CELL
const N = 15 * CELLS * CELLS   // large stones
const NW = Math.round(20.16 * CELLS * CELLS) // wedges per cell, as in the 10 x 10 tile
const U = 5                    // coordinate units per px; the path is scaled by 1/U

// Seeded PRNG (mulberry32), so a given seed always gives the same tile.
let state = SEED >>> 0
const rand = () => {
  state = (state + 0x6D2B79F5) >>> 0
  let t = state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const logUniform = (lo, hi) => Math.exp(Math.log(lo) + rand() * (Math.log(hi) - Math.log(lo)))
const wrap = v => ((v % SIZE) + SIZE) % SIZE

// Target areas, in px²
const A = CELL * CELL
const wedgeAreas = Array.from({ length: NW }, () => logUniform(0.001 * A, 0.009 * A))
let targets = Array.from({ length: N }, () => logUniform(0.016 * A, 0.11 * A))
const tsum = targets.reduce((a, b) => a + b, 0)
// Wedges are cut out of the large stones, so the large stones fill the whole tile.
targets = targets.map(t => t * SIZE * SIZE / tsum)

const P = Array.from({ length: N }, () => [rand() * SIZE, rand() * SIZE]) // sites
const W = new Array(N).fill(0) // power-diagram weights

// Clip a convex polygon to the half-plane nx * x + ny * y <= c.
const clip = (poly, nx, ny, c) => {
  const out = []
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k]; const b = poly[(k + 1) % poly.length]
    const da = nx * a[0] + ny * a[1] - c; const db = nx * b[0] + ny * b[1] - c
    if (da <= 0) { out.push(a) }
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db)
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
  }
  return out
}

// Each site's stone: a square around the site, clipped by the power bisector with
// every neighbouring site, including the neighbours' copies in adjacent tiles.
const R = 32 // neighbour radius, px
const stones = () => {
  const B = 16; const nb = Math.ceil(SIZE / B)
  const buckets = Array.from({ length: nb * nb }, () => [])
  P.forEach((p, i) => {
    buckets[Math.floor(p[1] / B) % nb * nb + Math.floor(p[0] / B) % nb].push(i)
  })
  const reach = Math.ceil(R / B)
  return P.map((p, i) => {
    const h = 30
    let poly = [[p[0] - h, p[1] - h], [p[0] + h, p[1] - h], [p[0] + h, p[1] + h],
      [p[0] - h, p[1] + h]]
    const bx = Math.floor(p[0] / B); const by = Math.floor(p[1] / B)
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const cx = bx + dx; const cy = by + dy
        const ox = Math.floor(cx / nb) * SIZE; const oy = Math.floor(cy / nb) * SIZE
        for (const j of buckets[((cy % nb) + nb) % nb * nb + ((cx % nb) + nb) % nb]) {
          if (j === i && !ox && !oy) { continue }
          const q = [P[j][0] + ox, P[j][1] + oy]
          if ((q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 > R * R) { continue }
          // |x - p|² - Wi <= |x - q|² - Wj  <=>  2x·(q - p) <= |q|² - |p|² - Wj + Wi
          const c = q[0] ** 2 + q[1] ** 2 - p[0] ** 2 - p[1] ** 2 - W[j] + W[i]
          poly = clip(poly, 2 * (q[0] - p[0]), 2 * (q[1] - p[1]), c)
          if (poly.length === 0) { break }
        }
      }
    }
    return poly
  })
}
const areaCentroid = poly => {
  let a = 0; let cx = 0; let cy = 0
  for (let k = 0; k < poly.length; k++) {
    const p = poly[k]; const q = poly[(k + 1) % poly.length]
    const cr = p[0] * q[1] - q[0] * p[1]
    a += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr
  }
  a /= 2
  return a === 0 ? [0, 0, 0] : [a, cx / (6 * a), cy / (6 * a)]
}

// 1. Relax
const ITERATIONS = 400
let polys
let worst = 0
for (let it = 0; it < ITERATIONS; it++) {
  polys = stones()
  const ac = polys.map(areaCentroid)
  if (it < LLOYD) {
    ac.forEach((v, i) => { if (v[0] > 0) { P[i] = [wrap(v[1]), wrap(v[2])] } })
  }
  for (let i = 0; i < N; i++) { W[i] += 0.25 * (targets[i] - ac[i][0]) }
  worst = ac.reduce((m, v, i) => Math.max(m, Math.abs(v[0] - targets[i]) / targets[i]), 0)
}
polys = stones()

// Unique vertices and edges, keyed by position within the tile
const key = p => `${Math.round(wrap(p[0]) * 100)},${Math.round(wrap(p[1]) * 100)}`
const verts = new Map() // key -> { p, edges }
const edges = new Map() // midpoint key -> { a, b, ta, tb }; ta, tb: trims for wedges
for (const poly of polys) {
  for (let k = 0; k < poly.length; k++) {
    const a = poly[k]; const b = poly[(k + 1) % poly.length]
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-6) { continue }
    const ek = key([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
    if (edges.has(ek)) { continue }
    const e = { a, b, ta: 0, tb: 0 }
    edges.set(ek, e)
    for (const [kk, p, other, atA] of [[key(a), a, b, true], [key(b), b, a, false]]) {
      if (!verts.has(kk)) { verts.set(kk, { p: [wrap(p[0]), wrap(p[1])], edges: [] }) }
      verts.get(kk).edges.push({ e, atA, dir: [other[0] - p[0], other[1] - p[1]] })
    }
  }
}

// 2. Wedges, at a random selection of three-way corners
const corners = [...verts.values()].filter(v => v.edges.length === 3)
for (let k = corners.length - 1; k > 0; k--) {
  const j = Math.floor(rand() * (k + 1));
  [corners[k], corners[j]] = [corners[j], corners[k]]
}
const wedges = []
corners.slice(0, NW).forEach((v, n) => {
  const r = v.edges.map(() => 0.6 + 0.8 * rand()) // relative distance along each edge
  const u = v.edges.map(x => {
    const L = Math.hypot(...x.dir)
    return [x.dir[0] / L, x.dir[1] / L, L]
  })
  const q = u.map((d, k) => [d[0] * r[k], d[1] * r[k]])
  const unitArea = Math.abs((q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) -
    (q[2][0] - q[0][0]) * (q[1][1] - q[0][1])) / 2
  let sc = Math.sqrt(wedgeAreas[n] / unitArea)
  u.forEach((d, k) => { sc = Math.min(sc, 0.4 * d[2] / r[k]) }) // within 40% of each edge
  v.edges.forEach((x, k) => { if (x.atA) { x.e.ta = r[k] * sc } else { x.e.tb = r[k] * sc } })
  wedges.push(u.map((d, k) => [v.p[0] + d[0] * r[k] * sc, v.p[1] + d[1] * r[k] * sc]))
})

// 3. Segments (trimmed edges and wedge sides), chained into polylines
const segs = []
for (const e of edges.values()) {
  const L = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1])
  const ux = (e.b[0] - e.a[0]) / L; const uy = (e.b[1] - e.a[1]) / L
  segs.push([[e.a[0] + ux * e.ta, e.a[1] + uy * e.ta],
    [e.b[0] - ux * e.tb, e.b[1] - uy * e.tb]])
}
for (const t of wedges) { for (let k = 0; k < 3; k++) { segs.push([t[k], t[(k + 1) % 3]]) } }
const adj = new Map()
segs.forEach((sg, i) => {
  for (const end of [0, 1]) {
    const k = key(sg[end])
    if (!adj.has(k)) { adj.set(k, []) }
    adj.get(k).push({ i, end })
  }
})
const used = new Array(segs.length).fill(false)
const free = k => (adj.get(k) || []).filter(x => !used[x.i])
const polylines = []
// Start at points with an odd number of free segments; it gives fewer polylines.
const startKeys = [...adj.keys()].sort((p, q) => (free(q).length % 2) - (free(p).length % 2))
const MAXSPAN = 80 // keep each polyline small, so few need copies across the tile edges
for (const k0 of [...startKeys, ...adj.keys()]) {
  while (free(k0).length) {
    const first = free(k0)[0]
    let cur = segs[first.i][first.end]
    cur = [wrap(cur[0]), wrap(cur[1])]
    const pts = [cur]
    let k = k0
    let lo = [...cur]; let hi = [...cur]
    for (;;) {
      const nxt = free(k)[0]
      if (!nxt) { break }
      const sg = segs[nxt.i]
      const p = [cur[0] + sg[1 - nxt.end][0] - sg[nxt.end][0],
        cur[1] + sg[1 - nxt.end][1] - sg[nxt.end][1]]
      const nlo = [Math.min(lo[0], p[0]), Math.min(lo[1], p[1])]
      const nhi = [Math.max(hi[0], p[0]), Math.max(hi[1], p[1])]
      if (pts.length > 1 && (nhi[0] - nlo[0] > MAXSPAN || nhi[1] - nlo[1] > MAXSPAN)) { break }
      used[nxt.i] = true
      pts.push(p); cur = p; lo = nlo; hi = nhi
      k = key(sg[1 - nxt.end])
    }
    polylines.push(pts)
  }
}

// Path data. Subpaths start on new lines every 100 characters or so.
const subpaths = []
for (const pts of polylines) {
  const xs = pts.map(p => p[0]); const ys = pts.map(p => p[1])
  for (const ox of [0, -SIZE, SIZE]) {
    for (const oy of [0, -SIZE, SIZE]) {
      if (Math.max(...xs) + ox < -0.5 || Math.min(...xs) + ox > SIZE + 0.5) { continue }
      if (Math.max(...ys) + oy < -0.5 || Math.min(...ys) + oy > SIZE + 0.5) { continue }
      let x = Math.round((pts[0][0] + ox) * U); let y = Math.round((pts[0][1] + oy) * U)
      let s = `M${x} ${y}l`
      pts.slice(1).forEach((p, n) => {
        const nx = Math.round((p[0] + ox) * U); const ny = Math.round((p[1] + oy) * U)
        const dx = String(nx - x); const dy = String(ny - y)
        s += (n === 0 || dx.startsWith("-") ? "" : " ") + dx +
          (dy.startsWith("-") ? "" : " ") + dy
        x = nx; y = ny
      })
      subpaths.push(s)
    }
  }
}
const lines = [""]
for (const s of subpaths) {
  const last = lines[lines.length - 1]
  if (last.length > 0 && last.length + s.length > 100) { lines.push("") }
  lines[lines.length - 1] += s
}
const content = `<path fill="none" stroke="#000" stroke-width="2.5" stroke-linejoin="round" ` +
  `transform="scale(.2)" d="${lines.join("\n")}"/>`
process.stdout.write(content)
process.stderr.write(`Tile ${SIZE} x ${SIZE} px: ${N} large stones (worst area error ` +
  `${(100 * worst).toFixed(1)}%), ${wedges.length} wedges, ${polylines.length} polylines, ` +
  `${content.length} bytes\n`)
