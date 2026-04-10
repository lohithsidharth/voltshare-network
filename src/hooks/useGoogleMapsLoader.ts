import { useState, useEffect, useRef } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY } from "@/lib/googleMaps";

let loaderPromise: Promise<void> | null = null;
let globalLoaded = false;
let optionsSet = false;

function getLoaderPromise() {
  if (!loaderPromise) {
    if (!optionsSet) {
      setOptions({ key: GOOGLE_MAPS_API_KEY, v: "weekly", libraries: ["places", "geometry"] });
      optionsSet = true;
    }
    loaderPromise = importLibrary("maps")
      .then(() => importLibrary("places"))
      .then(() => importLibrary("geometry"))
      .then(() => { /* void */ });
  }
  return loaderPromise;
}

export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(globalLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const started = useRef(false);

  useEffect(() => {
    if (globalLoaded) { setIsLoaded(true); return; }
    if (started.current) return;
    started.current = true;
    getLoaderPromise()
      .then(() => { globalLoaded = true; setIsLoaded(true); })
      .catch((err) => setLoadError(err));
  }, []);

  return { isLoaded, loadError };
}
