import type { SVGProps } from "react";

// QRコードの読み取りを表すアイコン（塗りつぶし）。
// 外側の四隅が読み取り枠、内側が 2×2 に並べた位置検出パターン3つと、右下のデータ部分（×字）
const FINDER_SIZE = 5.8;
const RING = 1.3;
const DOT = 1.6;

function finder(x: number, y: number) {
  const inner = FINDER_SIZE - RING * 2;
  // 外枠（中を抜いた四角）と中央の四角
  return (
    `M${x} ${y}h${FINDER_SIZE}v${FINDER_SIZE}h-${FINDER_SIZE}z` +
    `M${x + RING} ${y + RING}v${inner}h${inner}v-${inner}z` +
    `M${x + (FINDER_SIZE - DOT) / 2} ${y + (FINDER_SIZE - DOT) / 2}h${DOT}v${DOT}h-${DOT}z`
  );
}

const CELL = FINDER_SIZE / 3;
const DATA_X = 12.2;
const DATA_Y = 12.2;
// 3×3 のうち四隅と中央を塗って×字にする
const DATA = [
  [0, 0],
  [2, 0],
  [1, 1],
  [0, 2],
  [2, 2],
]
  .map(([c, r]) => `M${DATA_X + c * CELL} ${DATA_Y + r * CELL}h${CELL}v${CELL}h-${CELL}z`)
  .join("");

// 四隅の L 字（太さ 1.6、腕の長さ 4.5）
const CORNERS =
  "M2 2h4.5v1.6H3.6v2.9H2z" +
  "M22 2h-4.5v1.6h2.9v2.9H22z" +
  "M2 22h4.5v-1.6H3.6v-2.9H2z" +
  "M22 22h-4.5v-1.6h2.9v-2.9H22z";

export function QrIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d={CORNERS} />
      <path fillRule="evenodd" d={finder(6, 6) + finder(12.2, 6) + finder(6, 12.2)} />
      <path d={DATA} />
    </svg>
  );
}
