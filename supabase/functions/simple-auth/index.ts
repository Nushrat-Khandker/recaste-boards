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

    // Derive a display name: use provided name, or capitalize email prefix
    const displayName = full_name?.trim() || email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);

    // Create user with confirmed email (or ignore if exists)
    const { error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: { full_name: displayName },
    });

    if (userError && userError.code !== 'email_exists') {
      console.error("User creation error:", userError);
      return new Response(
        JSON.stringify({ error: userError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user already exists, update their name if a new one was provided
    if (userError?.code === 'email_exists' && full_name?.trim()) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = listData?.users?.find(u => u.email === email.toLowerCase());
      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUser(existingUser.id, {
          user_metadata: { full_name: displayName },
        });
      }
    }

    // Generate magic link token for instant sign-in
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase(),
    });

    if (error) {
      console.error("Link generation error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        token_hash: data.properties.hashed_token,
        type: 'magiclink'
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
