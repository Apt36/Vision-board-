// Generates PWA icons (PNG) with no image dependencies: raw raster -> zlib -> PNG chunks.
// Icon: dark rounded field with a compass/steering ring + needle — "steer the ship".
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(root, { recursive: true })

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let c = -1
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function render(size, { rounded }) {
  const px = Buffer.alloc(size * size * 4)
  const c = size / 2
  const bgTop = [0x16, 0x1a, 0x24]
  const bgBot = [0x0e, 0x11, 0x18]
  const ring = [0xe8, 0xb4, 0x5f]      // warm amber ring
  const ringDim = [0x3a, 0x42, 0x52]   // inner tick ring
  const needle = [0xdd, 0xe4, 0xef]    // light needle
  const rOuter = size * 0.335
  const rInner = size * 0.26
  const ringW = size * 0.028
  const corner = rounded ? size * 0.22 : 0

  const put = (x, y, rgb, a) => {
    const i = (y * size + x) * 4
    const old = px.subarray(i, i + 4)
    const na = a + (old[3] / 255) * (1 - a)
    if (na <= 0) return
    for (let k = 0; k < 3; k++) old[k] = Math.round((rgb[k] * a + old[k] * (old[3] / 255) * (1 - a)) / na)
    old[3] = Math.round(na * 255)
  }

  for (let y = 0; y < size; y++) {
    const t = y / size
    const bg = bgTop.map((v, i) => Math.round(v + (bgBot[i] - v) * t))
    for (let x = 0; x < size; x++) {
      // rounded-rect mask
      let a = 1
      if (corner) {
        const dx = Math.max(corner - x, x - (size - 1 - corner), 0)
        const dy = Math.max(corner - y, y - (size - 1 - corner), 0)
        const d = Math.hypot(dx, dy)
        a = Math.min(1, Math.max(0, corner - d + 1))
      }
      if (a > 0) put(x, y, bg, a)

      const dist = Math.hypot(x - c, y - c)
      // outer ring
      const edge = Math.abs(dist - rOuter)
      if (edge < ringW) put(x, y, ring, Math.min(1, (ringW - edge) / (size * 0.006)) * a)
      // inner tick ring (dashed feel via angle)
      const ang = Math.atan2(y - c, x - c)
      const edge2 = Math.abs(dist - rInner)
      if (edge2 < ringW * 0.5 && Math.cos(ang * 8) > 0.15)
        put(x, y, ringDim, Math.min(1, (ringW * 0.5 - edge2) / (size * 0.005)) * a)
    }
  }

  // needle: two triangles pointing NE / SW
  const na = Math.PI / 4 // 45deg, pointing up-right
  const len = size * 0.21
  const wid = size * 0.045
  const tip1 = [c + Math.cos(-na) * len, c + Math.sin(-na) * len]
  const tip2 = [c - Math.cos(-na) * len * 0.62, c - Math.sin(-na) * len * 0.62]
  const perp = [Math.cos(-na + Math.PI / 2) * wid, Math.sin(-na + Math.PI / 2) * wid]
  const tri = (p0, p1, p2, rgb) => {
    const minX = Math.max(0, Math.floor(Math.min(p0[0], p1[0], p2[0])))
    const maxX = Math.min(size - 1, Math.ceil(Math.max(p0[0], p1[0], p2[0])))
    const minY = Math.max(0, Math.floor(Math.min(p0[1], p1[1], p2[1])))
    const maxY = Math.min(size - 1, Math.ceil(Math.max(p0[1], p1[1], p2[1])))
    const sign = (a, b, p) => (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1])
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const p = [x + 0.5, y + 0.5]
        const d1 = sign(p0, p1, p), d2 = sign(p1, p2, p), d3 = sign(p2, p0, p)
        const neg = d1 < 0 || d2 < 0 || d3 < 0
        const pos = d1 > 0 || d2 > 0 || d3 > 0
        if (!(neg && pos)) put(x, y, rgb, 1)
      }
  }
  const mid = [c, c]
  tri(tip1, [mid[0] + perp[0], mid[1] + perp[1]], [mid[0] - perp[0], mid[1] - perp[1]], needle)
  tri(tip2, [mid[0] + perp[0], mid[1] + perp[1]], [mid[0] - perp[0], mid[1] - perp[1]], ring)

  return png(size, size, px)
}

writeFileSync(join(root, 'icon-512.png'), render(512, { rounded: false }))
writeFileSync(join(root, 'icon-192.png'), render(192, { rounded: false }))
writeFileSync(join(root, 'apple-touch-icon.png'), render(180, { rounded: false }))
console.log('icons written to', root)
