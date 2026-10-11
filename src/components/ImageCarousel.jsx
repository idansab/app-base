import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { commonsFilePage, licenseUrl } from '@/lib/commonsImages';

export default function ImageCarousel({ images, title, credits, placeholder }) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  if ((!images || images.length === 0) && placeholder) {
    return (
      <div className="relative w-full h-64 overflow-hidden rounded-2xl bg-muted">
        <img src={placeholder} alt="" className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
          *התמונה להמחשה בלבד*
        </span>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-gradient-to-br from-muted to-muted rounded-2xl flex items-center justify-center">
        <span className="text-muted-foreground text-sm">אין תמונות זמינות</span>
      </div>
    );
  }

  const slideVariants = {
    enter: (dir) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir) => ({
      zIndex: 0,
      x: dir < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  const credit = credits?.[images[current]];
  const fileUrl = credit ? commonsFilePage(images[current]) : null;
  const licUrl = credit ? licenseUrl(credit.license) : null;

  const paginate = (newDirection) => {
    setDirection(newDirection);
    setCurrent((prev) => (prev + newDirection + images.length) % images.length);
  };

  return (
    <div className="relative w-full bg-gradient-to-br from-muted to-muted rounded-2xl overflow-hidden group">
      {/* Main Image */}
      <div className="relative h-64 overflow-hidden bg-black/5">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.img
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            src={images[current]}
            alt={`${title} - תמונה ${current + 1}`}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => paginate(-1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-card/80 text-foreground rounded-full hover:bg-card transition-all opacity-0 group-hover:opacity-100 shadow-lg"
              aria-label="תמונה הקודמת"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => paginate(1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 bg-card/80 text-foreground rounded-full hover:bg-card transition-all opacity-0 group-hover:opacity-100 shadow-lg"
              aria-label="תמונה הבאה"
            >
              <ChevronLeft size={20} />
            </button>
          </>
        )}

        {/* Indicator */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > current ? 1 : -1);
                  setCurrent(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === current ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`תמונה ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {credit && (
        <p className="px-3 py-1.5 text-[11px] text-muted-foreground bg-muted/50" dir="ltr">
          Photo:{' '}
          {fileUrl ? <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="underline">{credit.author}</a> : credit.author}
          {' · '}
          {licUrl ? <a href={licUrl} target="_blank" rel="noopener noreferrer" className="underline">{credit.license}</a> : credit.license}
          {' · Wikimedia Commons'}
        </p>
      )}

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="px-2 py-3 flex gap-2 overflow-x-auto bg-muted/50 backdrop-blur-sm">
          {images.map((img, i) => (
            <motion.button
              key={i}
              onClick={() => {
                setDirection(i > current ? 1 : -1);
                setCurrent(i);
              }}
              className={`flex-shrink-0 h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === current
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent opacity-70 hover:opacity-100'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <img
                src={img}
                alt={`thumbnail ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
