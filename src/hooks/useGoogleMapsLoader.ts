import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMaps";

let loaderPromise: Promise<typeof google> | null = null;
let globalLoaded = false;

function getLoaderPromise() {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      libraries: GOOGLE_MAPS_LIBRARIES as string[],
      version: "weekly",
    });
    loaderPromise = loader.load();
  }
  return loaderPromise;
}

export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(globalLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const started = useRef(false);

  useEffect(() => {
    if (globalLoaded || started.current) {
      setIsLoaded(true);
      return;
    }
    started.current = true;
    getLoaderPromise()
      .then(() => {
        globalLoaded = true;
        setIsLoaded(true);
      })
      .catch((err) => setLoadError(err));
  }, []);

  return { isLoaded, loadError };
}
