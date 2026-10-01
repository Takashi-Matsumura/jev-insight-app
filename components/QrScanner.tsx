"use client";

import jsQR from "jsqr";
import { X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";

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
          detect(code.data);
          return;
        }
      }
      frame = requestAnimationFrame(scan);
    };

    // HTTPS でないページでは mediaDevices 自体が無い
    const request = navigator.mediaDevices
      ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
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
