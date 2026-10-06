import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mayhishpo:location";

function readCachedLocation() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat !== "number" || typeof parsed?.lng !== "number") return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

/**
 * Single source of truth for the visitor's coordinates, cached for the session
 * so every place card can show a distance without asking for permission again.
 * `request()` resolves with the coordinates, or null when unavailable/denied.
 */
export default function useUserLocation({ auto = false } = {}) {
  const [location, setLocation] = useState(readCachedLocation);
  const [status, setStatus] = useState("idle");

  const request = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus("unavailable");
          resolve(null);
          return;
        }
        setStatus("locating");
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const next = { lat: position.coords.latitude, lng: position.coords.longitude };
            setLocation(next);
            setStatus("granted");
            try {
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch (error) {
              // Caching is best effort only.
            }
            resolve(next);
          },
          () => {
            setStatus("denied");
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }),
    []
  );

  useEffect(() => {
    if (auto && !location) request();
  }, [auto, location, request]);

  return { location, status, request };
}
