import type { SVGProps } from "react";

// QRコードのアイコン。lucide の QrCode は抽象的で QR と分かりにくいため、
// 3つの角の四角（位置検出パターン）が見える形で自作する。線の太さ・角の丸みは lucide に合わせる
export function QrIcon({ strokeWidth = 1.5, ...props }: SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* 位置検出パターン */}
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="5.5" y="5.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="16.5" y="5.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      <rect x="5.5" y="16.5" width="2" height="2" rx="0.4" fill="currentColor" stroke="none" />
      {/* データ部分 */}
      <rect x="14" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="18.5" y="14" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="16.25" y="16.25" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="14" y="18.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="18.5" y="18.5" width="2.5" height="2.5" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
