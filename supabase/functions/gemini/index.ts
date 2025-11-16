// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std/http/server.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

interface GeminiRequestBody {
  fileUrl: string;
  fileName?: string;
  prompt?: string;
}

const DEFAULT_PROMPT = `You are helping populate an event flyer submission form. Read the attached document and respond with a single JSON object using the following schema:
{
  "title": string,
  "description": string,
  "eventDate": string, // ISO 8601 datetime, include timezone if present
  "location": string,
  "organization": string,
  "category": string, // Primary category, choose the best match from: Academic, Party, Club, Sports, Performances, Food, Social, Other
  "categories": string[] // Additional categories (1-3 total) using the same list as above, include the primary category as the first item
}
Only provide the JSON object with no additional commentary. If information is missing, use an empty string. Infer the best matching category from the list.`;

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: GeminiRequestBody;
  try {
    payload = (await req.json()) as GeminiRequestBody;
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!payload?.fileUrl) {
    return new Response(JSON.stringify({ error: "fileUrl is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const flyerResponse = await fetch(payload.fileUrl);
    if (!flyerResponse.ok) {
      throw new Error(`Failed to fetch flyer from storage (${flyerResponse.status})`);
    }

    const mimeType = flyerResponse.headers.get("content-type") ?? "application/pdf";
    const flyerBuffer = new Uint8Array(await flyerResponse.arrayBuffer());
    const inlineData = encodeBase64(flyerBuffer);

    const promptText = payload.prompt?.trim().length
      ? payload.prompt
      : DEFAULT_PROMPT;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType,
                    data: inlineData,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error (${geminiResponse.status}): ${errorText}`);
    }

    const generation = await geminiResponse.json();
    const candidate = generation?.candidates?.[0];
    const rawText = Array.isArray(candidate?.content?.parts)
      ? candidate.content.parts
          .map((part: { text?: string }) => part?.text ?? "")
          .join("")
          .trim()
      : "";
    if (!rawText) {
      throw new Error("Gemini returned an empty response");
    }

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini did not return a JSON object");
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error("Unable to parse Gemini JSON response");
    }

    return new Response(JSON.stringify({ parsed, raw: rawText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Gemini function error", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/gemini' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
