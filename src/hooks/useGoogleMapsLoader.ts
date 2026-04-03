import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_LIBRARIES } from "@/lib/googleMaps";

const MAPS_RELOAD_KEY = "google-maps-loader-signature";

export function useGoogleMapsLoader() {
  const [stableOptions] = useState(() => ({
    id: "script-loader",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  }));

  useEffect(() => {
    const librariesChanged =
      stableOptions.libraries.length !== GOOGLE_MAPS_LIBRARIES.length ||
      stableOptions.libraries.some((library, index) => library !== GOOGLE_MAPS_LIBRARIES[index]);

    if (!librariesChanged && stableOptions.googleMapsApiKey === GOOGLE_MAPS_API_KEY) {
      sessionStorage.removeItem(MAPS_RELOAD_KEY);
      return;
    }

    const nextSignature = `${GOOGLE_MAPS_API_KEY}|${GOOGLE_MAPS_LIBRARIES.join(",")}`;

    if (sessionStorage.getItem(MAPS_RELOAD_KEY) !== nextSignature) {
      sessionStorage.setItem(MAPS_RELOAD_KEY, nextSignature);
      window.location.reload();
    }
  }, [stableOptions]);

  return useJsApiLoader(stableOptions);
}
