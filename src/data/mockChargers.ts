export interface Charger {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  power: number;
  pricePerKwh: number;
  availability: string;
  rating: number;
  reviewCount: number;
  images: string[];
}

export const mockChargers: Charger[] = [
  {
    id: "1",
    hostId: "h1",
    hostName: "Rahul M.",
    title: "Home Charger – HSR Layout",
    address: "123 HSR Layout, Bangalore",
    latitude: 12.9141,
    longitude: 77.6507,
    power: 7.4,
    pricePerKwh: 10,
    availability: "8 AM – 10 PM",
    rating: 4.8,
    reviewCount: 24,
    images: [],
  },
  {
    id: "2",
    hostId: "h2",
    hostName: "Priya S.",
    title: "Fast Charger – Koramangala",
    address: "456 Koramangala, Bangalore",
    latitude: 12.9352,
    longitude: 77.6245,
    power: 22,
    pricePerKwh: 15,
    availability: "24/7",
    rating: 4.6,
    reviewCount: 18,
    images: [],
  },
  {
    id: "3",
    hostId: "h3",
    hostName: "Arun K.",
    title: "Standard Outlet – Indiranagar",
    address: "789 Indiranagar, Bangalore",
    latitude: 12.9784,
    longitude: 77.6408,
    power: 3.3,
    pricePerKwh: 8,
    availability: "6 AM – 11 PM",
    rating: 4.9,
    reviewCount: 31,
    images: [],
  },
  {
    id: "4",
    hostId: "h4",
    hostName: "Meena R.",
    title: "Garage Charger – Whitefield",
    address: "321 Whitefield, Bangalore",
    latitude: 12.9698,
    longitude: 77.7500,
    power: 7.4,
    pricePerKwh: 12,
    availability: "9 AM – 9 PM",
    rating: 4.5,
    reviewCount: 12,
    images: [],
  },
  {
    id: "5",
    hostId: "h5",
    hostName: "Vikram D.",
    title: "Solar-Powered – Electronic City",
    address: "555 Electronic City, Bangalore",
    latitude: 12.8456,
    longitude: 77.6603,
    power: 11,
    pricePerKwh: 9,
    availability: "7 AM – 8 PM",
    rating: 4.7,
    reviewCount: 22,
    images: [],
  },
];
