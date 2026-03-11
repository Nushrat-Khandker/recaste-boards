import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { action, ...body } = await req.json();

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Helper: send push to a single subscription
    async function sendToSubscription(sub: any, payload: string) {
      const webPush = await import("https://esm.sh/web-push@3.6.7");
      webPush.setVapidDetails(
        `mailto:admin@recaste.com`,
        vapidPublicKey!,
        vapidPrivateKey!
      );
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      );
    }

    switch (action) {
      case "get_vapid_key": {
        return new Response(
          JSON.stringify({ vapidPublicKey: vapidPublicKey || "" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "subscribe": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { subscription } = body;
        const { error } = await supabase
          .from("push_subscriptions")
          .upsert(
            {
              user_id: userId,
              endpoint: subscription.endpoint,
              keys: subscription.keys,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "endpoint" }
          );
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "unsubscribe": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "Unauthorized" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { endpoint } = body;
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", endpoint)
          .eq("user_id", userId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send": {
        // Send to a single user (used by notification trigger)
        const { userId: targetUserId, title, message, url } = body;

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.error("VAPID keys not configured");
          return new Response(
            JSON.stringify({ error: "VAPID keys not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", targetUserId);

        if (!subscriptions?.length) {
          return new Response(
            JSON.stringify({ sent: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const payload = JSON.stringify({ title, body: message, url });
        let sent = 0;
        for (const sub of subscriptions) {
          try {
            await sendToSubscription(sub, payload);
            sent++;
          } catch (e: any) {
            console.error("Push send error:", e);
            if (e.statusCode === 410 || e.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        return new Response(
          JSON.stringify({ sent }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "broadcast": {
        // Send push to ALL subscribed users except the sender
        // Called by the chat_messages trigger
        const { senderId, senderName, messageContent, contextType, contextId } = body;

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.error("VAPID keys not configured");
          return new Response(
            JSON.stringify({ error: "VAPID keys not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get ALL push subscriptions except the sender's
        const { data: allSubscriptions, error: subError } = await supabase
          .from("push_subscriptions")
          .select("*")
          .neq("user_id", senderId);

        if (subError) {
          console.error("Error fetching subscriptions:", subError);
          throw subError;
        }

        if (!allSubscriptions?.length) {
          console.log("No subscriptions found for broadcast");
          return new Response(
            JSON.stringify({ sent: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Build notification content
        const title = senderName || "New message";
        const notifBody = messageContent
          ? (messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent)
          : "Sent a file";
        
        // Build the URL to navigate to
        let notifUrl = "/chat";
        if (contextType === "board") {
          notifUrl = `/projects?board=${contextId}`;
        } else if (contextType === "project") {
          notifUrl = `/projects?project=${contextId}`;
        }

        const payload = JSON.stringify({
          title,
          body: notifBody,
          url: notifUrl,
        });

        console.log(`Broadcasting to ${allSubscriptions.length} subscriptions`);

        let sent = 0;
        let failed = 0;
        for (const sub of allSubscriptions) {
          try {
            await sendToSubscription(sub, payload);
            sent++;
          } catch (e: any) {
            failed++;
            console.error(`Push send error for sub ${sub.id}:`, e.statusCode || e.message);
            if (e.statusCode === 410 || e.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        }

        console.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
        return new Response(
          JSON.stringify({ sent, failed }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
