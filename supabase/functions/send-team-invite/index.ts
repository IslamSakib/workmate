// Sends the team-invite email server-side via Resend, so the provider's API key
// never has to touch the browser. The frontend calls this via
// supabase.functions.invoke("send-team-invite", ...); if it's not deployed yet
// or fails, the app falls back to a mailto: link / clipboard copy instead.
//
// Deploy:
//   supabase functions deploy send-team-invite
// Configure:
//   supabase secrets set RESEND_API_KEY=re_your_key_here
//   supabase secrets set INVITE_FROM_EMAIL="WorkMate <invites@yourdomain.com>"   # optional, defaults to Resend's shared test address
import { createClient } from "npm:@supabase/supabase-js@2"

// Edge Functions run on a different origin than the app, so the browser sends an
// OPTIONS preflight before the real POST. Every response — including the preflight
// reply — needs these headers, or the browser blocks the request before our code
// even runs (this is what caused the CORS failure in production).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  let body: { email?: string; role?: string; signupUrl?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400)
  }

  const { email, role, signupUrl } = body
  if (!email || !role || !signupUrl) {
    return jsonResponse({ error: "Missing email, role, or signupUrl" }, 400)
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY")
  if (!resendApiKey) {
    return jsonResponse({ error: "RESEND_API_KEY is not configured" }, 500)
  }

  const fromAddress = Deno.env.get("INVITE_FROM_EMAIL") ?? "WorkMate <onboarding@resend.dev>"
  const article = role === "manager" ? "a" : "an"

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: email,
      subject: "You're invited to join our team on WorkMate",
      text:
        `Hi,\n\nYou've been invited to join our team on WorkMate as ${article} ${role}.\n\n` +
        `Please sign up using this exact email address (${email}) and you'll be added to the team automatically:\n${signupUrl}\n\nThanks!`,
    }),
  })

  if (!emailRes.ok) {
    const errText = await emailRes.text()
    return jsonResponse({ error: `Resend error: ${errText}` }, 502)
  }

  return jsonResponse({ ok: true })
})
