let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function unlockAudioOnFirstClick() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  };
  document.addEventListener('click', unlock, { once: true });
}

export function playNewOrderSound() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.16);
    });
  } catch {
    // Audio tidak tersedia/diblokir — abaikan, alert visual tetap jalan.
  }
}
