import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name } = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Please enter a valid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const normalizedEmail = email.toLowerCase().trim();
    const emailPrefix = normalizedEmail.split('@')[0];
    const displayName = full_name?.trim() || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));

    // Look up existing user by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let existingUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      // Update name if provided and different
      if (full_name?.trim() && existingUser.user_metadata?.full_name !== displayName) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { full_name: displayName },
        });
        await supabaseAdmin.from("profiles").update({ full_name: displayName }).eq("id", existingUser.id);
      }
    } else {
      const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { full_name: displayName },
      });

      if (userError || !created?.user) {
        console.error("User creation error:", userError);
        return new Response(
          JSON.stringify({ error: userError?.message || "Failed to create user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      existingUser = created.user;
    }

    // Generate a fresh magic link token every call.
    // Returning the hashed_token + email lets the client call verifyOtp with type=email,
    // which works reliably even after cache refresh (each call creates a new token).
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
    });

    if (error || !data?.properties?.hashed_token) {
      console.error("Link generation error:", error);
      return new Response(
        JSON.stringify({ error: error?.message || "Failed to generate sign-in link" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        token_hash: data.properties.hashed_token,
        email: normalizedEmail,
        type: "email",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
