
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column to chargers
ALTER TABLE public.chargers ADD COLUMN IF NOT EXISTS location GEOGRAPHY(Point, 4326);

-- Populate location from existing lat/lng
UPDATE public.chargers SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography WHERE location IS NULL;

-- Create trigger to auto-sync location from lat/lng on insert/update
CREATE OR REPLACE FUNCTION public.sync_charger_location() RETURNS TRIGGER AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER charger_location_sync BEFORE INSERT OR UPDATE OF latitude, longitude ON public.chargers FOR EACH ROW EXECUTE FUNCTION public.sync_charger_location();

-- Spatial index for fast nearby queries
CREATE INDEX IF NOT EXISTS chargers_location_gist ON public.chargers USING GIST(location);

-- Nearby chargers function (returns chargers within radius_m meters)
CREATE OR REPLACE FUNCTION public.nearby_chargers(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_m DOUBLE PRECISION DEFAULT 10000,
  max_results INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  host_id UUID,
  title TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  power DOUBLE PRECISION,
  price_per_kwh DOUBLE PRECISION,
  availability TEXT,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  distance_m DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.id, c.host_id, c.title, c.address, c.latitude, c.longitude,
    c.power, c.price_per_kwh, c.availability, c.rating, c.review_count,
    ST_Distance(c.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_m
  FROM public.chargers c
  WHERE c.is_active = true
    AND ST_DWithin(c.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_m)
  ORDER BY c.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  LIMIT max_results;
$$;

-- Charger density for heatmap (grid-based clustering)
CREATE OR REPLACE FUNCTION public.charger_clusters(
  min_lat DOUBLE PRECISION,
  min_lng DOUBLE PRECISION,
  max_lat DOUBLE PRECISION,
  max_lng DOUBLE PRECISION,
  grid_size DOUBLE PRECISION DEFAULT 0.01
) RETURNS TABLE (
  cluster_lat DOUBLE PRECISION,
  cluster_lng DOUBLE PRECISION,
  charger_count BIGINT,
  avg_price DOUBLE PRECISION,
  avg_power DOUBLE PRECISION
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROUND(c.latitude / grid_size) * grid_size AS cluster_lat,
    ROUND(c.longitude / grid_size) * grid_size AS cluster_lng,
    COUNT(*) AS charger_count,
    AVG(c.price_per_kwh) AS avg_price,
    AVG(c.power) AS avg_power
  FROM public.chargers c
  WHERE c.is_active = true
    AND c.latitude BETWEEN min_lat AND max_lat
    AND c.longitude BETWEEN min_lng AND max_lng
  GROUP BY cluster_lat, cluster_lng;
$$;
