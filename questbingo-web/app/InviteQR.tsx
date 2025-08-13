"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function InviteQR({ link, onClose }: { link: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { width: 320, margin: 2 })
      .then((url) => { if (alive) setDataUrl(url); })
      .catch(() => {});
    return () => { alive = false; };
  }, [link]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white dark:bg-black rounded-2xl border border-black/10 dark:border-white/10 p-4 w-[360px] max-w-[92vw]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Invite to room</div>
          <button className="px-2 py-1 rounded border text-xs" onClick={onClose} aria-label="Close">Close</button>
        </div>
        <div className="text-xs opacity-70 break-all mb-2">{link}</div>
        <div className="flex items-center justify-center">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR" className="rounded-lg border" />
          ) : (
            <div className="text-sm opacity-70">Generating…</div>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="px-3 py-1.5 rounded-md border text-sm"
            onClick={async () => { try { await navigator.clipboard.writeText(link); } catch {} }}
          >Copy link</button>
          {dataUrl && (
            <a href={dataUrl} download="invite-qr.png" className="px-3 py-1.5 rounded-md border text-sm">Download QR</a>
          )}
        </div>
      </div>
    </div>
  );
}