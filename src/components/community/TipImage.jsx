import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

/**
 * Tip photos live in private storage, so they are only reachable through a
 * short-lived signed link that we resolve on render.
 */
export default function TipImage({ fileUri, alt, className }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!fileUri) {
      setUrl(null);
      return () => {
        cancelled = true;
      };
    }
    base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 3600 })
      .then((result) => {
        if (cancelled) return;
        setUrl(result?.signed_url || result?.data?.signed_url || null);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fileUri]);

  if (!url) return null;
  return <Image src={url} alt={alt} className={className} />;
}