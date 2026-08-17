import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Throwaway probe: verifies that `npm:web-push` resolves and boots on the
// self-hosted edge runtime. Delete once the answer is known.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const hasSetVapidDetails = typeof webpush?.setVapidDetails === "function";
    const hasSendNotification = typeof webpush?.sendNotification === "function";

    return new Response(
      JSON.stringify({
        ok: hasSetVapidDetails && hasSendNotification,
        hasSetVapidDetails,
        hasSendNotification,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ ok: false, error: error?.message ?? String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
