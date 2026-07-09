import { useEffect, useState } from 'react';
import { isMuted, subscribeMuted, toggleMuted, playSelect } from '../fx/sound';

/** Floating mute toggle, fixed to the top-right of the viewport. */
export function SoundToggle() {
  const [muted, setMuted] = useState(isMuted());

  useEffect(() => subscribeMuted(setMuted), []);

  return (
    <button
      type="button"
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => {
        const nowMuted = toggleMuted();
        if (!nowMuted) playSelect();
      }}
      className="kg-glass fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full text-lg transition hover:scale-110"
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
