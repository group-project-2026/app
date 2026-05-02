// HEALPix NESTED-scheme pixel index for a sky position.
// Port of `ang2nest_z_phi` from healpix_bare.c (Górski et al. 2005, ApJ 622, 759).
// We only need the forward direction (ang → pixel) — coarser pixels are derived
// by right-shifting (`pixel >> (2 * delta)` in NESTED scheme).

const UTAB = new Uint32Array(256);
for (let m = 0; m < 256; m++) {
  UTAB[m] =
    (m & 0x1) |
    ((m & 0x2) << 1) |
    ((m & 0x4) << 2) |
    ((m & 0x8) << 3) |
    ((m & 0x10) << 4) |
    ((m & 0x20) << 5) |
    ((m & 0x40) << 6) |
    ((m & 0x80) << 7);
}

function xyfToNest(
  order: number,
  ix: number,
  iy: number,
  faceNum: number
): number {
  const part1 = UTAB[ix & 0xff] | (UTAB[(ix >>> 8) & 0xff] << 16);
  const part2 = (UTAB[iy & 0xff] | (UTAB[(iy >>> 8) & 0xff] << 16)) << 1;
  return faceNum * (1 << (2 * order)) + (part1 | part2);
}

export function ang2pixNest(
  order: number,
  raDeg: number,
  decDeg: number
): number {
  const nside = 1 << order;
  const phi = (raDeg * Math.PI) / 180;
  const z = Math.sin((decDeg * Math.PI) / 180);
  const za = Math.abs(z);
  const tt = (((phi / (Math.PI / 2)) % 4) + 4) % 4;

  let ix: number;
  let iy: number;
  let faceNum: number;

  if (za <= 2 / 3) {
    const temp1 = nside * (0.5 + tt);
    const temp2 = nside * z * 0.75;
    const jp = Math.floor(temp1 - temp2);
    const jm = Math.floor(temp1 + temp2);
    const ifp = Math.floor(jp / nside);
    const ifm = Math.floor(jm / nside);
    if (ifp === ifm) faceNum = ifp === 4 ? 4 : ifp + 4;
    else if (ifp < ifm) faceNum = ifp;
    else faceNum = ifm + 8;
    ix = jm & (nside - 1);
    iy = nside - (jp & (nside - 1)) - 1;
  } else {
    let ntt = Math.floor(tt);
    if (ntt >= 4) ntt = 3;
    const tp = tt - ntt;
    const tmp = nside * Math.sqrt(3 * (1 - za));
    const jp = Math.min(Math.floor(tp * tmp), nside - 1);
    const jm = Math.min(Math.floor((1 - tp) * tmp), nside - 1);
    if (z >= 0) {
      faceNum = ntt;
      ix = nside - jm - 1;
      iy = nside - jp - 1;
    } else {
      faceNum = ntt + 8;
      ix = jp;
      iy = jm;
    }
  }

  return xyfToNest(order, ix, iy, faceNum);
}

export function parentPixel(
  pixel: number,
  fromOrder: number,
  toOrder: number
): number {
  if (toOrder >= fromOrder) return pixel;
  return pixel >>> (2 * (fromOrder - toOrder));
}
