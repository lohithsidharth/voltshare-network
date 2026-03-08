-- Add parking_available and charger_type columns to chargers
ALTER TABLE public.chargers 
ADD COLUMN IF NOT EXISTS charger_type text DEFAULT 'Type 2',
ADD COLUMN IF NOT EXISTS parking_available boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS peak_price_per_kwh double precision DEFAULT NULL,
ADD COLUMN IF NOT EXISTS off_peak_price_per_kwh double precision DEFAULT NULL;

-- Create access_codes table for secure access
CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  valid_until timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own access codes
CREATE POLICY "Drivers can view own access codes" ON public.access_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.id = access_codes.booking_id 
      AND bookings.driver_id = auth.uid()
    )
  );

-- Hosts can view access codes for their chargers
CREATE POLICY "Hosts can view charger access codes" ON public.access_codes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      JOIN public.chargers ON chargers.id = bookings.charger_id
      WHERE bookings.id = access_codes.booking_id 
      AND chargers.host_id = auth.uid()
    )
  );

-- Function to generate access code on booking confirmation
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    INSERT INTO public.access_codes (booking_id, code, valid_until)
    VALUES (
      NEW.id,
      LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0'),
      (NEW.booking_date::text || ' ' || NEW.end_time::text)::timestamptz + interval '30 minutes'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for auto access code generation
DROP TRIGGER IF EXISTS on_booking_confirmed ON public.bookings;
CREATE TRIGGER on_booking_confirmed
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_access_code();