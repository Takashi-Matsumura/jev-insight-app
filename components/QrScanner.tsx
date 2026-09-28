"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

// 背面カメラの映像からQRコードを読み取る。iOS Safari は BarcodeDetector 非対応のため jsQR を使う。
export function QrScanner({ onDetect, onClose }: { onDetect: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

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
        // 処理を軽くするため縮小して読む
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (code?.data) {
          stopped = true;
          navigator.vibrate?.(50);
          onDetect(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (s) => {
        stream = s;
        if (stopped || !videoRef.current) return;
        videoRef.current.srcObject = s;
        await videoRef.current.play();
        scan();
      })
      .catch(() => setError("カメラを使用できません。ブラウザの設定でカメラを許可してください。"));

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video ref={videoRef} playsInline muted className="min-h-0 flex-1 object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="size-60 rounded-2xl border-4 border-white/80" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <p className="text-center text-sm text-white">{error ?? "来場者バッジのQRコードを枠に合わせてください"}</p>
        <button onClick={onClose} className="rounded-xl bg-white py-3 font-semibold text-zinc-900">
          閉じる
        </button>
      </div>
    </div>
  );
}
