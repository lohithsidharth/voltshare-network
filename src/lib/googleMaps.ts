export const GOOGLE_MAPS_API_KEY = "AIzaSyAosQUR5rbG9obfNZJ-14IyAcFF8lgoeWs";

export const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry" | "drawing")[] = ["places", "geometry"];

export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0a0f1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#556677" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a2535" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#141e2e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a2535" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a2a40" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f3350" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060d18" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#334455" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0d1520" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#445566" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0a1a15" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#101825" }] },
];

export const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
export const DEFAULT_ZOOM = 12;
