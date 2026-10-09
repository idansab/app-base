import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Star, X } from 'lucide-react';
import { MAX_PLACE_IMAGES } from '@/lib/placeImages';
import { uploadPlaceImage, validateImageFile } from '@/lib/uploadPlaceImage';

/**
 * Ordered gallery of up to MAX_PLACE_IMAGES images. The first image is the cover
 * shown on cards. Order is changed with the arrow buttons (keyboard accessible).
 */
export default function GalleryEditor({ images, onChange, onError, onSuccess, allowUrl = true }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [urlOpen, setUrlOpen] = useState(false);
  const [url, setUrl] = useState('');

  const free = MAX_PLACE_IMAGES - images.length - uploading;

  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (index) => onChange(images.filter((_, i) => i !== index));

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    if (files.length > free) {
      onError?.(`אפשר להוסיף עוד ${Math.max(free, 0)} תמונות בלבד (מקסימום ${MAX_PLACE_IMAGES})`);
    }
    const accepted = files.slice(0, Math.max(free, 0));
    const valid = accepted.filter((file) => {
      const problem = validateImageFile(file);
      if (problem) onError?.(`${file.name}: ${problem}`);
      return !problem;
    });
    if (valid.length === 0) return;

    setUploading(valid.length);
    const uploaded = [];
    for (const file of valid) {
      try {
        uploaded.push(await uploadPlaceImage(file));
      } catch (e) {
        console.error('Image upload failed:', e);
        onError?.(`שגיאה בהעלאת ${file.name}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (uploaded.length > 0) {
      onChange([...images, ...uploaded].slice(0, MAX_PLACE_IMAGES));
      onSuccess?.(uploaded.length === 1 ? 'התמונה הועלתה' : `${uploaded.length} תמונות הועלו`);
    }
  };

  const addUrl = () => {
    const value = url.trim();
    if (!/^https?:\/\//i.test(value)) {
      onError?.('הכתובת חייבת להתחיל ב-https://');
      return;
    }
    if (images.length >= MAX_PLACE_IMAGES) {
      onError?.(`מקסימום ${MAX_PLACE_IMAGES} תמונות`);
      return;
    }
    onChange([...images, value]);
    setUrl('');
    setUrlOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground tabular-nums">
          {images.length + uploading}/{MAX_PLACE_IMAGES}
        </span>
        <span className="text-sm font-medium text-foreground">תמונות</span>
      </div>

      <ul className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {images.map((src, index) => (
          <li key={`${src}-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
            <img
              src={src}
              alt={`תמונה ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.opacity = '0.2';
              }}
            />
            {index === 0 && (
              <span className="absolute top-1 right-1 flex items-center gap-1 rounded-full bg-green-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Star size={10} /> ראשית
              </span>
            )}
            <button
              type="button"
              onClick={() => remove(index)}
              className="absolute top-1 left-1 rounded-full bg-black/60 p-1 text-white hover:bg-red-600"
              aria-label={`הסר תמונה ${index + 1}`}
            >
              <X size={12} />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1">
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === images.length - 1}
                className="rounded-full bg-white/90 p-1 text-slate-900 disabled:opacity-30"
                aria-label="הזז אחורה"
              >
                <ArrowLeft size={12} />
              </button>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => move(index, 0)}
                  className="rounded-full bg-white/90 px-1.5 text-[10px] font-medium text-slate-900"
                  aria-label="קבע כתמונה ראשית"
                >
                  ראשית
                </button>
              )}
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                className="rounded-full bg-white/90 p-1 text-slate-900 disabled:opacity-30"
                aria-label="הזז קדימה"
              >
                <ArrowRight size={12} />
              </button>
            </div>
          </li>
        ))}

        {Array.from({ length: uploading }).map((_, i) => (
          <li key={`up-${i}`} className="aspect-square rounded-xl bg-muted flex items-center justify-center">
            <Loader2 className="animate-spin text-muted-foreground" />
          </li>
        ))}

        {free > 0 && (
          <li>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square w-full rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-secondary flex flex-col items-center justify-center gap-1 text-xs"
            >
              <ImagePlus size={20} />
              הוסף
            </button>
          </li>
        )}
      </ul>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {!allowUrl ? null : urlOpen ? (
        <div className="flex gap-2">
          <button type="button" onClick={addUrl} className="px-3 rounded-xl bg-secondary text-sm hover:bg-secondary/80">
            הוסף
          </button>
          <input
            dir="ltr"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="https://..."
            aria-label="כתובת תמונה"
            className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
      ) : (
        free > 0 && (
          <button
            type="button"
            onClick={() => setUrlOpen(true)}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Link2 size={12} /> הוסף מכתובת אינטרנט
          </button>
        )
      )}
    </div>
  );
}
