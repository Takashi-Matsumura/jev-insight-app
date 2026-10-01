"use client";

import jsQR from "jsqr";
import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

// 解析する映像の幅の上限。小さく写った QR や情報量の多い QR を読むため、縮小しすぎない
const MAX_SCAN_WIDTH = 1280;

// QR の中身を文字列にする。日本の名刺やバッジには Shift_JIS のものがあり、
// jsQR は UTF-8 として読めないと data を空にするので、そのときはバイト列から読み直す
function qrText(code: { data: string; binaryData: number[] }) {
  if (code.data || code.binaryData.length === 0) return code.data;
  const bytes = new Uint8Array(code.binaryData);
  for (const encoding of ["utf-8", "shift_jis"]) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(bytes);
    } catch {}
  }
  return "";
}

// 背面カメラの映像からQRコードを読み取る。iOS Safari は BarcodeDetector 非対応のため jsQR を使う。
export function QrScanner({
  onDetect,
  onClose,
  hint = "来場者バッジのQRコードを枠に合わせてください",
}: {
  onDetect: (value: string) => void;
  onClose: () => void;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  // 親の再描画で onDetect が変わっても、カメラを起動し直さない
  const detect = useEffectEvent(onDetect);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const scan = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const scale = Math.min(1, MAX_SCAN_WIDTH / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // 黒地に白の QR も読む
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
        const text = code ? qrText(code) : "";
        if (text) {
          stopped = true;
          navigator.vibrate?.(50);
          detect(text);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };

    // HTTPS でないページでは mediaDevices 自体が無い
    const request = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({
          // 解像度を指定しないと 640x480 になる端末があり、細かい QR が読めない
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      : Promise.reject(new Error("mediaDevices unavailable"));

    request
      .then(async (s) => {
        // カメラの準備が終わる前に閉じられた場合は、ここで止める
        if (stopped || !videoRef.current) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        scan();
      })
      .catch(() => {
        if (!stopped) setError("カメラを使用できません。ブラウザの設定でカメラを許可してください。");
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="min-h-0 flex-1 object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-60 rounded-2xl border-4 border-white/80" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="text-center text-sm text-white">{error ?? hint}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center gap-2 rounded-xl bg-white py-3 font-semibold text-zinc-900"
        >
          <X className="size-5" aria-hidden />
          閉じる
        </button>
      </div>
    </div>
  );
}
