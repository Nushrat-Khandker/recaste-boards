import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const teamMembers = [
      "Farah",
      "Inaya",
      "Mahedi",
      "Musfera",
      "Naomi",
      "Nasir",
      "Nushrat",
      "Oishorjo",
      "Sabih"
    ];

    const results = [];

    for (const name of teamMembers) {
      const email = `${name.toLowerCase()}@recaste.com`;
      
      // Create or update user with confirmed email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          full_name: name
        }
      });

      if (userError && userError.code !== 'email_exists') {
        results.push({ name, email, error: userError.message });
      } else {
        results.push({ name, email, success: true });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Team profiles setup complete",
        results 
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
