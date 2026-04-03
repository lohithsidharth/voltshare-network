import { useEffect, useMemo, useState } from "react";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMaps";

declare global {
  interface Window {
    __googleMapsScriptLoadingPromise?: Promise<void>;
  }
}

const SCRIPT_ID = "google-maps-script";
const CALLBACK_NAME = "__voltshareGoogleMapsInit";

function buildGoogleMapsUrl() {
  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    loading: "async",
    callback: CALLBACK_NAME,
    libraries: GOOGLE_MAPS_LIBRARIES.join(","),
  });

  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

function loadGoogleMapsScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (window.__googleMapsScriptLoadingPromise) {
    return window.__googleMapsScriptLoadingPromise;
  }

  const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

  if (existingScript) {
    existingScript.remove();
  }

  window.__googleMapsScriptLoadingPromise = new Promise<void>((resolve, reject) => {
    (window as typeof window & Record<string, unknown>)[CALLBACK_NAME] = () => {
      resolve();
      delete (window as typeof window & Record<string, unknown>)[CALLBACK_NAME];
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = buildGoogleMapsUrl();
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      window.__googleMapsScriptLoadingPromise = undefined;
      reject(new Error("Failed to load Google Maps"));
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsScriptLoadingPromise;
}

export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(() => Boolean(typeof window !== "undefined" && window.google?.maps));
  const [loadError, setLoadError] = useState<Error | null>(null);
  const scriptKey = useMemo(() => `${GOOGLE_MAPS_API_KEY}|${GOOGLE_MAPS_LIBRARIES.join(",")}`, []);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMapsScript()
      .then(() => {
        if (!cancelled) {
          setIsLoaded(true);
          setLoadError(null);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error);
          setIsLoaded(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [scriptKey]);

  return { isLoaded, loadError };
}
