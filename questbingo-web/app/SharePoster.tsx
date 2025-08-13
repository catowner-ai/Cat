"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export type PosterData = {
  title: string;
  nickname: string;
  foundCount: number;
  lineCount: number;
  roomId: string;
  inviteLink: string;
};

export default function SharePoster({ data, onClose }: { data: PosterData; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;

    const draw = async () => {
      // background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      // title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
      ctx.fillText(data.title, 40, 80);

      // nickname
      ctx.font = '28px system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial';
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(`@${data.nickname || 'guest'}`, 40, 120);

      // progress card
      const cardY = 160;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(ctx, 40, cardY, width - 80, 220, 20);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px system-ui';
      ctx.fillText('Progress', 70, cardY + 60);
      ctx.font = '28px system-ui';
      ctx.fillText(`${data.foundCount} / 25 tiles`, 70, cardY + 110);
      ctx.fillText(`${data.lineCount} lines`, 70, cardY + 150);

      // QR section
      const qrText = data.inviteLink;
      const qrDataUrl = await QRCode.toDataURL(qrText, { width: 280, margin: 1, color: { dark: '#000000ff', light: '#ffffffff' } });
      const qrImg = await loadImage(qrDataUrl);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px system-ui';
      ctx.fillText('Join my room', 40, 460);
      ctx.font = '24px system-ui';
      ctx.fillStyle = '#d1d5db';
      ctx.fillText(`Room: ${data.roomId}`, 40, 500);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('Scan to play', 40, 540);

      ctx.drawImage(qrImg, 40, 560, 320, 320);

      // footer
      ctx.fillStyle = '#9ca3af';
      ctx.font = '20px system-ui';
      ctx.fillText('QuestBingo — Walk · Snap · Play', 40, height - 40);

      setReady(true);
    };

    draw();
  }, [data]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-black rounded-2xl border border-black/10 dark:border-white/10 p-4 w-[880px] max-w-[96vw]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Share poster</div>
          <button className="px-2 py-1 rounded border text-xs" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="overflow-auto max-h-[80vh]">
          <canvas ref={canvasRef} className="rounded-lg border" />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-1.5 rounded-md border text-sm"
            disabled={!ready}
            onClick={async () => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const url = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.href = url;
              a.download = 'questbingo-poster.png';
              a.click();
            }}
          >Download PNG</button>
        </div>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}