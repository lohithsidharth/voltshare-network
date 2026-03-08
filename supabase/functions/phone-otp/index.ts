import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const jwtSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // reuse for signing

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function handleSendOTP(phone: string) {
  // Clean expired OTPs first
  await supabase.rpc("cleanup_expired_otps");

  // Invalidate any existing OTPs for this phone
  await supabase
    .from("otp_codes")
    .delete()
    .eq("phone", phone)
    .eq("verified", false);

  const code = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  const { error } = await supabase.from("otp_codes").insert({
    phone,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    return new Response(
      JSON.stringify({ error: "Failed to generate OTP" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // TODO: Integrate SMS provider (Twilio/MSG91) to send OTP
  // For now, return success. In dev, OTP is logged below.
  console.log(`[DEV] OTP for ${phone}: ${code}`);

  return new Response(
    JSON.stringify({
      success: true,
      message: "OTP sent successfully",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyOTP(phone: string, code: string, displayName?: string, role?: string) {
  const { data: otpRecord, error } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("code", code)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !otpRecord) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired OTP" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark OTP as verified
  await supabase
    .from("otp_codes")
    .update({ verified: true })
    .eq("id", otpRecord.id);

  // Check if user exists by phone
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("phone", phone)
    .single();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.user_id;
  } else {
    // Create a new auth user
    const email = `${phone.replace(/\+/g, "")}@phone.voltshare.local`;
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { display_name: displayName || phone },
    });

    if (createError || !newUser.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user account" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    userId = newUser.user.id;

    // Update profile with phone
    await supabase
      .from("profiles")
      .update({ phone, display_name: displayName || phone })
      .eq("user_id", userId);

    // Set role if provided
    if (role === "driver" || role === "host") {
      await supabase.from("user_roles").insert({ user_id: userId, role });
    }
  }

  // Generate a Supabase-compatible session
  const { data: sessionData, error: sessionError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: `${phone.replace(/\+/g, "")}@phone.voltshare.local`,
    });

  if (sessionError) {
    return new Response(
      JSON.stringify({ error: "Failed to create session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Use the OTP from generateLink to verify and create a session
  const tokenHash = sessionData?.properties?.hashed_token;

  return new Response(
    JSON.stringify({
      success: true,
      user_id: userId,
      verification_url: `${supabaseUrl}/auth/v1/verify?token=${tokenHash}&type=magiclink`,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, code, display_name, role } = await req.json();

    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Valid phone number required (e.g. +919876543210)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      return await handleSendOTP(phone);
    } else if (action === "verify") {
      if (!code || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "6-digit OTP code required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return await handleVerifyOTP(phone, code, display_name, role);
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "send" or "verify"' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
