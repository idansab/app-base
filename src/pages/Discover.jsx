import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { DISCOVER_VIDEOS } from '@/lib/discoverVideos';

function VideoSlide({ video, muted, onToggleMute }) {
  const ref = useRef(null);
  const slideRef = useRef(null);

  // play only the slide that is on screen
  useEffect(() => {
    const el = ref.current;
    const slide = slideRef.current;
    if (!el || !slide) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: [0, 0.6, 1] }
    );
    observer.observe(slide);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  return (
    <section ref={slideRef} className="relative h-full w-full snap-start snap-always bg-black">
      <video
        ref={ref}
        src={video.src}
        poster={video.poster}
        className="h-full w-full object-contain"
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={video.title}
        onClick={onToggleMute}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-5 text-right text-white">
        <h2 className="text-lg font-bold">{video.title}</h2>
        <p className="mt-1 text-sm text-white/85">{video.description}</p>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={muted ? 'הפעל קול' : 'השתק'}
        className="absolute left-3 top-3 rounded-full bg-black/50 p-2 text-white"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
    </section>
  );
}

/** "Discover": vertical, swipeable video feed. */
export default function Discover() {
  const [muted, setMuted] = useState(true);

  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[420px] w-full snap-y snap-mandatory overflow-y-scroll bg-black">
      {DISCOVER_VIDEOS.map((video) => (
        <VideoSlide key={video.id} video={video} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ))}
    </div>
  );
}
