import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ---- Native VAPID / Web Push helpers (no npm web-push) ----

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  const raw = atob(base64 + "=".repeat(pad));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubRaw = base64UrlDecode(publicKeyB64);
  const privRaw = base64UrlDecode(privateKeyB64);

  const publicKey = await crypto.subtle.importKey(
    "raw",
    pubRaw,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    []
  );

  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(pubRaw.slice(1, 33)),
    y: base64UrlEncode(pubRaw.slice(33, 65)),
    d: base64UrlEncode(privRaw),
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  return { publicKey, privateKey, publicKeyRaw: pubRaw };
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
) {
  const { privateKey, publicKeyRaw } = await importVapidKeys(vapidPublicKey, vapidPrivateKey);

  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = { typ: "JWT", alg: "ES256" };
  const payload = { aud, exp, sub: subject };

  const encHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encHeader}.${encPayload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes[0] === 0x30) {
    // DER encoded
    const rLen = sigBytes[3];
    const rStart = 4;
    const rBytes = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigBytes.slice(sStart, sStart + sLen);

    r = new Uint8Array(32);
    s = new Uint8Array(32);
    r.set(rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes, 32 - Math.min(rBytes.length, 32));
    s.set(sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes, 32 - Math.min(sBytes.length, 32));
  } else {
    // Already raw
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const jwt = `${unsignedToken}.${base64UrlEncode(rawSig)}`;
  const p256ecdsa = base64UrlEncode(publicKeyRaw);

  return {
    authorization: `vapid t=${jwt}, k=${p256ecdsa}`,
  };
}

// Encrypt payload using aes128gcm (RFC 8291)
async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payloadText: string
) {
  const clientPubRaw = base64UrlDecode(clientPublicKeyB64);
  const clientAuth = base64UrlDecode(clientAuthB64);
  const payload = new TextEncoder().encode(payloadText);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientPubKey = await crypto.subtle.importKey(
    "raw",
    clientPubRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPubKey },
      localKeyPair.privateKey,
      256
    )
  );

  // HKDF to derive auth_info → PRK
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...clientPubRaw,
    ...localPubRaw,
  ]);

  const prkKey = await crypto.subtle.importKey("raw", clientAuth, "HKDF", false, ["deriveBits"]);
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: authInfo },
      prkKey,
      256
    )
  );

  // Salt for content encryption
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive content encryption key (CEK) and nonce
  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);

  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: salt,
        info: new Uint8Array([
          ...new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
        ]),
      },
      ikmKey,
      128
    )
  );

  const nonceBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: salt,
        info: new Uint8Array([
          ...new TextEncoder().encode("Content-Encoding: nonce\0"),
        ]),
      },
      ikmKey,
      96
    )
  );

  // Pad payload: add 2-byte padding length prefix + delimiter
  const paddedPayload = new Uint8Array(payload.length + 2);
  paddedPayload.set(new Uint8Array([0, 0])); // padding length = 0
  paddedPayload[2 - 1] = 2; // delimiter (actually: record padding)
  // Correct RFC 8188 padding: payload + \x02 delimiter
  const record = new Uint8Array(payload.length + 1);
  record.set(payload);
  record[payload.length] = 2; // delimiter byte

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonceBits },
      aesKey,
      record
    )
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = payload.length + 1 + 16 + 1; // record size (at least)
  const header = new Uint8Array(16 + 4 + 1 + 65);
  header.set(salt, 0);
  const rsView = new DataView(header.buffer, 16, 4);
  rsView.setUint32(0, 4096); // record size
  header[20] = 65; // key id length (uncompressed public key)
  header.set(localPubRaw, 21);

  // Final body = header + encrypted
  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);

  return body;
}

async function sendWebPush(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payloadText: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const { authorization } = await createVapidAuthHeader(
    sub.endpoint,
    vapidPublicKey,
    vapidPrivateKey,
    "mailto:admin@recaste.com"
  );

  const encryptedBody = await encryptPayload(
    sub.keys.p256dh,
    sub.keys.auth,
    payloadText
  );

  const response = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body: encryptedBody,
  });

  if (!response.ok) {
    const text = await response.text();
    throw { statusCode: response.status, message: `Push failed (${response.status}): ${text}` };
  }

  return response;
}

// ---- Main handler ----

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
            await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
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
        const { senderId, senderName, messageContent, contextType, contextId } = body;

        if (!vapidPublicKey || !vapidPrivateKey) {
          console.error("VAPID keys not configured");
          return new Response(
            JSON.stringify({ error: "VAPID keys not configured" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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

        const title = senderName || "New message";
        const notifBody = messageContent
          ? (messageContent.length > 100 ? messageContent.substring(0, 100) + "..." : messageContent)
          : "Sent a file";

        let notifUrl = "/chat";
        if (contextType === "board") {
          notifUrl = `/projects?board=${contextId}`;
        } else if (contextType === "project") {
          notifUrl = `/projects?project=${contextId}`;
        }

        const payload = JSON.stringify({ title, body: notifBody, url: notifUrl });

        console.log(`Broadcasting to ${allSubscriptions.length} subscriptions`);

        let sent = 0;
        let failed = 0;
        for (const sub of allSubscriptions) {
          try {
            await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);
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
