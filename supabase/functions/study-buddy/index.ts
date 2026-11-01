import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Sign in to use the study buddy." }, 401);
  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!projectUrl || !anonKey || !apiKey) return json({ error: "AI is not configured yet." }, 503);

  // Validate the student's session before spending the project's free AI quota.
  const userCheck = await fetch(`${projectUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userCheck.ok) return json({ error: "Please sign in again." }, 401);

  let message: unknown;
  try { ({ message } = await req.json()); } catch { return json({ error: "Send a valid question." }, 400); }
  if (typeof message !== "string" || message.trim().length < 1 || message.length > 2000) {
    return json({ error: "Questions must be between 1 and 2,000 characters." }, 400);
  }

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "You are StudyConnect, a patient and encouraging study partner for college students. Help students understand course concepts, practise active recall, and plan study time. Explain clearly at an appropriate level, ask a follow-up question when it would help, and encourage the student to think for themselves. Do not provide answers to active exams or help with cheating. Do not request personal or sensitive information. Keep responses concise and point out uncertainty." }] },
      contents: [{ role: "user", parts: [{ text: message.trim() }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.65 },
    }),
  });
  if (!response.ok) return json({ error: "The study buddy is busy. Please try again in a moment." }, 502);
  const result = await response.json();
  const reply = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
  if (!reply) return json({ error: "No answer came back. Try asking another way." }, 502);
  return json({ reply }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
