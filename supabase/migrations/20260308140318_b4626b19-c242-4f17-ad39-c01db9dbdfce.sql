
-- OTP codes table for phone authentication
CREATE TABLE public.otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- No direct client access - only edge functions use this via service role
-- Clean up expired OTPs automatically
CREATE INDEX idx_otp_phone_expires ON public.otp_codes (phone, expires_at);

-- Function to clean expired OTPs
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.otp_codes WHERE expires_at < now();
$$;
