import { serve } from "https://deno.land/std@0.140.0/http/server.ts";

const kv = await Deno.openKv();

serve(async (req) => {
  const url = new URL(req.url);

  if (url.pathname === "/xmas" && req.method === "GET") {
    try {
      const fileContent = await Deno.readTextFile("index.html");
      return new Response(fileContent, {
        headers: { "Content-Type": "text/html" },
      });
    } catch (error) {
      console.error("Error reading index.html:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (url.pathname === "/xmas/santa-stamp-150-200.png" && req.method === "GET") {
    try {
      const fileContent = await Deno.readFile("santa-stamp-150-200.png");
      return new Response(fileContent, {
        headers: { "Content-Type": "image/png" },
      });
    } catch (error) {
      console.error("Error reading santa-stamp-150-200.png:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (url.pathname === "/xmas" && req.method === "POST") {
    try {
      const data = await req.json();
      const key = ["submissions", Date.now()];
      await kv.set(key, data);

      const countKey = ["total_submissions"];
      let count = (await kv.get<number>(countKey)).value ?? 0;
      count++;
      await kv.set(countKey, count);
      
      console.log("New submission:", data);
      return new Response(JSON.stringify({ totalSubmissions: count }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error processing form data:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
