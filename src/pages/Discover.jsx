import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadFeed } from '@/lib/discoverApi';

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
        src={video.video_url}
        poster={video.poster_url || undefined}
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
        {video.description && <p className="mt-1 text-sm text-white/85">{video.description}</p>}
        {video.places && (
          <Link
            to={`/place/${video.places.id}`}
            className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            <MapPin size={16} /> {video.places.name}
          </Link>
        )}
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
  const [videos, setVideos] = useState(null);

  useEffect(() => {
    loadFeed().then(setVideos);
  }, []);

  if (videos === null) {
    return (
      <div className="flex h-[calc(100dvh-9rem)] min-h-[420px] items-center justify-center bg-black">
        <Loader2 className="animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[420px] w-full snap-y snap-mandatory overflow-y-scroll bg-black">
      {videos.length === 0 && <p className="p-8 text-center text-white/80">עוד אין סרטונים כאן. תחזרו בקרוב.</p>}
      {videos.map((video) => (
        <VideoSlide key={video.id} video={video} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ))}
    </div>
  );
}
