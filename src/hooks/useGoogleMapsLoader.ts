import { useState, useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMaps";

let loaderPromise: Promise<void> | null = null;
let globalLoaded = false;

function getLoaderPromise() {
  if (!loaderPromise) {
    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      libraries: GOOGLE_MAPS_LIBRARIES as string[],
      version: "weekly",
    });
    loaderPromise = loader.importLibrary("maps").then(() => {
      return loader.importLibrary("places");
    }).then(() => {
      return loader.importLibrary("geometry");
    }).then(() => { /* void */ });
  }
  return loaderPromise;
}

export function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(globalLoaded);
  const [loadError, setLoadError] = useState<Error | undefined>();
  const started = useRef(false);

  useEffect(() => {
    if (globalLoaded || started.current) {
      if (globalLoaded) setIsLoaded(true);
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
