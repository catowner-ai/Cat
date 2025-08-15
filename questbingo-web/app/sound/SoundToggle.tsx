"use client";

import { useSoundPref } from '../useSoundPref';

export default function SoundToggle() {
  const { muted, toggle } = useSoundPref();
  return (
    <button
      aria-label="Toggle sound"
      aria-pressed={!muted}
      className="px-3 py-1.5 rounded-full border text-xs"
      onClick={toggle}
      title={muted ? 'Enable sounds' : 'Mute sounds'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}