import qrcode from "qrcode-generator";

// QR のまわりに必要な余白（セル数）
export const QR_MARGIN = 4;

// QR を SVG の path にする（1 セル = 1 単位。viewBox は呼ぶ側で余白を足して作る）
export function qrModules(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { size, path };
}
