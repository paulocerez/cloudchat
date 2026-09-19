import { useMemo, useRef, useState } from 'react';
import { Mic, Pause, Play } from 'lucide-react';

// Deterministic waveform heights (0..1) seeded off the audio URL, so each memo
// gets a distinct-but-stable shape without decoding the audio.
function makeWaveform(seed: string, count = 42): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: count }, () => 0.28 + rand() * 0.72);
}

function fmtDuration(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// WhatsApp-style voice player: round play/pause control, an interactive
// waveform with a draggable scrubber, and an elapsed/total time readout.
export function VoicePlayer({ src, time }: { src: string; time: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const bars = useMemo(() => makeWaveform(src), [src]);

  const fraction = duration > 0 ? Math.min(current / duration, 1) : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const seekToClientX = (clientX: number) => {
    const track = trackRef.current;
    const a = audioRef.current;
    if (!track || !a || !Number.isFinite(duration) || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(ratio * duration);
  };

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="shrink-0 w-10 h-10 rounded-sm bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition-all"
      >
        {playing ? (
          <Pause size={16} strokeWidth={2.5} className="fill-current" />
        ) : (
          <Play size={16} strokeWidth={2.5} className="fill-current translate-x-[1px]" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          ref={trackRef}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setScrubbing(true);
            seekToClientX(e.clientX);
          }}
          onPointerMove={(e) => {
            if (scrubbing) seekToClientX(e.clientX);
          }}
          onPointerUp={() => setScrubbing(false)}
          onPointerCancel={() => setScrubbing(false)}
          className="relative flex items-center gap-[2px] h-8 cursor-pointer touch-none"
        >
          {bars.map((v, i) => {
            const played = fraction >= (i + 0.5) / bars.length;
            return (
              <span
                key={i}
                className={`flex-1 rounded-sm transition-colors ${played ? 'bg-gray-900' : 'bg-gray-300'}`}
                style={{ height: `${Math.round(v * 100)}%` }}
              />
            );
          })}
          <span
            className="absolute top-1/2 w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gray-900 shadow-sm ring-2 ring-gray-50"
            style={{ left: `${fraction * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] font-medium text-gray-400 tabular-nums">
            {fmtDuration(playing || current > 0 ? current : duration)}
          </span>
          <span className="text-[11px] text-gray-300">{time}</span>
        </div>
      </div>

      <span className="shrink-0 w-7 h-7 rounded-sm bg-violet-100 text-violet-500 flex items-center justify-center self-start">
        <Mic size={13} strokeWidth={2.5} />
      </span>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
    </div>
  );
}
