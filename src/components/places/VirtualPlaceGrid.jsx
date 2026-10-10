import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';

// Mirrors the grid-cols-1 / md:grid-cols-2 / lg:grid-cols-3 breakpoints (Tailwind md=768, lg=1024).
function useColumnCount() {
  const get = () => {
    if (typeof window === 'undefined') return 1;
    if (window.matchMedia('(min-width: 1024px)').matches) return 3;
    if (window.matchMedia('(min-width: 768px)').matches) return 2;
    return 1;
  };
  const [cols, setCols] = useState(get);
  useEffect(() => {
    const onChange = () => setCols(get());
    const queries = [window.matchMedia('(min-width: 768px)'), window.matchMedia('(min-width: 1024px)')];
    queries.forEach((q) => q.addEventListener('change', onChange));
    return () => queries.forEach((q) => q.removeEventListener('change', onChange));
  }, []);
  return cols;
}

const GAP = 24; // gap-6

/** Renders only the rows near the viewport, so the DOM stays small however many places there are. */
export default function VirtualPlaceGrid({ items, getKey, renderItem }) {
  const cols = useColumnCount();
  const listRef = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const rowCount = Math.ceil(items.length / cols);

  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.getBoundingClientRect().top + window.scrollY);
    }
  }, [items.length, cols]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => 360 + GAP,
    overscan: 8, // ~3000px of rows kept on each side of the viewport, so fast scrolling never reveals an unrendered gap
    scrollMargin,
  });

  return (
    <div ref={listRef} style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
      {virtualizer.getVirtualItems().map((row) => {
        const start = row.index * cols;
        const rowItems = items.slice(start, start + cols);
        return (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtualizer.measureElement}
            className="absolute left-0 top-0 w-full grid gap-6"
            style={{
              transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              paddingBottom: GAP,
            }}
          >
            {rowItems.map((item) => (
              <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
            ))}
          </div>
        );
      })}
    </div>
  );
}
