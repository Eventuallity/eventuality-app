// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req: Request) => {
  try {
    const apiKey = Deno.env.get("LLAMA_CLOUD_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 500,
      });
    }

    // Parse incoming form-data (React Native will send the file here)
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Expected form-data" }), {
        status: 400,
      });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = formData.get("language") || "en";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file uploaded" }), {
        status: 400,
      });
    }

    // Prepare the form data to send to Llama Cloud
    const llamaForm = new FormData();
    llamaForm.append("file", file);
    llamaForm.append("language", language.toString());

    // Forward to Llama Cloud API
    const llamaResponse = await fetch(
      "https://api.cloud.llamaindex.ai/api/v1/parsing/upload",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          // "Content-Type" automatically handled for multipart form-data
          "accept": "application/json",
        },
        body: llamaForm,
      },
    );

    const result = await llamaResponse.json();

    return new Response(JSON.stringify(result), {
      status: llamaResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function Error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error", details: err.message }),
      { status: 500 },
    );
  }
});

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/parser' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
