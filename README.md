# ⚡ VoltShare — Decentralized EV Charging Marketplace

**VoltShare** connects EV drivers with homeowners who share their private charging outlets. Think of it as *Airbnb for EV charging* — hosts list their chargers, drivers discover and book them in real time.

> 🌐 **Live Preview**: [Open VoltShare](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Pages & Routes](#-pages--routes)
- [Backend Services](#-backend-services)
- [Database Schema](#-database-schema)
- [Data Sources](#-data-sources)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)

---

## ✨ Features

### For Drivers
- 🔍 **Explore Map** — Discover chargers on an interactive Google Map with clustering, search, and power filters
- 📍 **Multi-Source Data** — Aggregates chargers from VoltShare hosts, OpenStreetMap (Overpass API), and OpenChargeMap (OCM)
- 🗺️ **Trip Planner** — Plan routes between cities with automatic charging stop suggestions along the way
- 📅 **Booking System** — Book time slots, receive access codes, and manage reservations
- ⭐ **Reviews & Favorites** — Rate chargers and save favorites for quick access
- 📊 **Driver Dashboard** — View booking history, spending stats, and saved chargers

### For Hosts
- ➕ **List Chargers** — Add chargers with details (power, pricing, peak/off-peak rates, parking availability)
- 📈 **Host Dashboard** — Track revenue, energy delivered, and manage bookings (accept/reject)
- 🔄 **Live Availability** — Toggle chargers online/offline in real time
- 📊 **Earnings Chart** — 7-day revenue visualization

### General
- 🔐 **Authentication** — Email/password and phone OTP sign-up with role selection (driver/host)
- 📱 **Responsive Design** — Mobile-first UI with adaptive layouts
- ⚡ **Realtime Updates** — Charger availability changes broadcast instantly via WebSockets

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (SPA)                       │
│  React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │  Explore  │ │  Trip    │ │  Driver   │ │    Host      │  │
│  │  (Map)    │ │  Planner │ │  Dashboard│ │   Dashboard  │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬───────┘  │
│       │             │             │               │          │
│  ┌────┴─────────────┴─────────────┴───────────────┴──────┐  │
│  │           React Query (Data Layer + Cache)            │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
┌──────────────────┐ ┌──────────┐ ┌──────────────────┐
│   Supabase       │ │  Edge    │ │  Google Maps     │
│   (PostgreSQL +  │ │  Funcs   │ │  Platform        │
│    PostGIS +     │ │          │ │  - Maps JS API   │
│    Auth +        │ │          │ │  - Directions    │
│    Realtime)     │ │          │ │  - Geocoding     │
└──────────────────┘ └────┬─────┘ └──────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌────────┐ ┌──────────┐
        │ Overpass │ │  OCM   │ │ Phone    │
        │ API      │ │  API   │ │ OTP      │
        │ (OSM)    │ │        │ │ Service  │
        └──────────┘ └────────┘ └──────────┘
```

### Data Flow

1. **Charger Discovery**: The Explore page fetches VoltShare chargers from PostgreSQL (with PostGIS spatial queries) and simultaneously queries OSM/OCM via Edge Functions, then merges results client-side.
2. **Realtime**: Supabase Realtime listens to `chargers` table changes and invalidates React Query cache automatically.
3. **Booking Flow**: Driver selects date/time → checks availability against existing bookings → inserts booking → receives access code.
4. **Trip Planning**: Geocodes addresses via Nominatim → fetches Google Directions → queries Overpass for chargers within a buffer along the route polyline.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui (Radix primitives) |
| **Animation** | Framer Motion |
| **Maps** | Google Maps JavaScript API (`@react-google-maps/api`) |
| **State/Data** | TanStack React Query |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL + PostGIS + Auth + Realtime + Edge Functions) |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |

---

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── Navbar.tsx        # Global navigation bar
│   ├── Footer.tsx        # Site footer
│   ├── ChargerCard.tsx   # Charger list item card
│   └── NavLink.tsx       # Active-aware nav link
├── contexts/
│   └── AuthContext.tsx   # Auth state provider (session, user, role, profile)
├── hooks/
│   ├── useChargers.ts    # Fetches & merges VoltShare + OSM chargers
│   ├── useOCMChargers.ts # OpenChargeMap charger fetching
│   ├── useOverpassChargers.ts # OSM Overpass API charger fetching
│   └── useFavorites.ts   # Favorite charger management
├── pages/
│   ├── Index.tsx          # Landing page (hero, stats, CTA)
│   ├── Explore.tsx        # Map-based charger discovery
│   ├── ChargerDetail.tsx  # Single charger view + booking + reviews
│   ├── TripPlanner.tsx    # Route planning with charging stops
│   ├── DriverDashboard.tsx # Driver bookings & favorites
│   ├── HostDashboard.tsx  # Host charger & booking management
│   ├── Auth.tsx           # Login / signup (email + phone OTP)
│   └── NotFound.tsx       # 404 page
├── lib/
│   ├── googleMaps.ts     # Google Maps API key & loader config
│   └── utils.ts          # Tailwind merge utility
├── integrations/
│   └── supabase/
│       ├── client.ts     # Auto-generated Supabase client
│       └── types.ts      # Auto-generated database types
└── data/
    └── mockChargers.ts   # Fallback mock data

supabase/
└── functions/
    ├── overpass-chargers/ # Proxy for OSM Overpass API
    ├── ocm-chargers/      # Proxy for OpenChargeMap API
    ├── phone-otp/         # Phone OTP generation & verification
    └── seed-chargers/     # Demo data seeding
```

---

## 🧭 Pages & Routes

| Route | Page | Auth Required | Description |
|-------|------|:---:|-------------|
| `/` | Landing | ❌ | Hero search, stats, how-it-works |
| `/explore` | Explore | ❌ | Interactive map with charger discovery |
| `/charger/:id` | Charger Detail | ❌ (booking needs auth) | Charger info, booking, reviews |
| `/trip-planner` | Trip Planner | ❌ | Route planning with charging stops |
| `/driver` | Driver Dashboard | ✅ (driver) | Bookings, spending, favorites |
| `/host` | Host Dashboard | ✅ (host) | Charger management, revenue, bookings |
| `/auth` | Authentication | ❌ | Login / signup with role selection |

---

## ⚙️ Backend Services

### Edge Functions

| Function | Purpose | Auth |
|----------|---------|:----:|
| `overpass-chargers` | Queries OSM Overpass API for EV chargers within a bounding radius | Public |
| `ocm-chargers` | Queries OpenChargeMap API for EV charger POIs with normalization | Public |
| `phone-otp` | Generates & verifies 6-digit OTPs, creates auth users via magic link | Public |
| `seed-chargers` | Seeds 12 demo chargers for a demo host user | Public |

### Key Database Functions (PostgreSQL/PostGIS)

| Function | Purpose |
|----------|---------|
| `nearby_chargers(lat, lng, radius_m, max_results)` | Spatial proximity search using PostGIS geography |
| `charger_clusters(min_lat, min_lng, max_lat, max_lng, grid_size)` | Grid-based clustering for map zoom levels |
| `has_role(user_id, role)` | Security-definer role check (bypasses RLS recursion) |
| `cleanup_expired_otps()` | Removes expired OTP codes |

---

## 🗄 Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   profiles   │     │  user_roles  │     │  otp_codes   │
│──────────────│     │──────────────│     │──────────────│
│ user_id (FK) │     │ user_id (FK) │     │ phone        │
│ display_name │     │ role (enum)  │     │ code         │
│ avatar_url   │     │  driver|host │     │ expires_at   │
│ phone        │     └──────────────┘     │ verified     │
│ is_verified  │                          └──────────────┘
└──────┬───────┘
       │
       │  hosts chargers          books chargers
       │                    ┌──────────────────┐
┌──────┴───────┐            │    bookings      │
│   chargers   │◄───────────│──────────────────│
│──────────────│            │ driver_id        │
│ host_id      │            │ charger_id (FK)  │
│ title        │            │ booking_date     │
│ address      │            │ start/end_time   │
│ lat/lng      │            │ estimated_price  │
│ location     │  PostGIS   │ status (enum)    │
│ power (kW)   │  geography │ payment_status   │
│ price_per_kwh│            └────────┬─────────┘
│ peak/off-peak│                     │
│ charger_type │            ┌────────┴─────────┐
│ rating       │            │  access_codes    │
│ is_active    │            │──────────────────│
└──────┬───────┘            │ booking_id (FK)  │
       │                    │ code             │
  ┌────┴────┐               │ valid_until      │
  │         │               └──────────────────┘
┌─┴──┐  ┌──┴───────┐
│fav │  │ reviews  │
│────│  │──────────│
│user│  │driver_id │
│chrg│  │charger_id│
└────┘  │rating    │
        │comment   │
        └──────────┘
```

### Enums
- **`app_role`**: `driver` | `host`
- **`booking_status`**: `pending` | `confirmed` | `completed` | `cancelled`
- **`payment_status`**: `pending` | `paid` | `refunded` | `failed`

---

## 🌍 Data Sources

VoltShare aggregates charger data from three sources:

| Source | Type | Coverage | Details |
|--------|------|----------|---------|
| **VoltShare** | First-party | Host-listed chargers | Full booking, pricing, reviews |
| **OpenStreetMap** | Overpass API | Global crowd-sourced | Name, operator, power, sockets |
| **OpenChargeMap** | REST API | Global registry | Connections, status, usage type |

Chargers are merged client-side with VoltShare listings prioritized. OSM/OCM chargers are display-only (no booking).

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ & npm

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <PROJECT_DIR>

# Install dependencies
npm install

# Start dev server (http://localhost:8080)
npm run dev
```

### Seed Demo Data

Invoke the seed function to populate demo chargers:

```bash
curl -X POST https://<SUPABASE_PROJECT>.supabase.co/functions/v1/seed-chargers
```

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL (auto-configured) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (auto-configured) |
| `GOOGLE_MAPS_API_KEY` | Google Maps JS API key (in `src/lib/googleMaps.ts`) |

Edge function secrets (configured via Lovable Cloud):
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — auto-provided to Edge Functions

---

## 🚢 Deployment

Open the project in [Lovable](https://lovable.dev) and click **Share → Publish**. The app deploys automatically with Edge Functions.

For custom domains: **Project → Settings → Domains → Connect Domain**.

---

## 📄 License

This project is proprietary. All rights reserved.
