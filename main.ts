import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createNotionPage } from "./notion.ts";

const NOTION_DATABASE_ID = Deno.env.get("NOTION_DATABASE_ID");

const kv = await Deno.openKv();

const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME");
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("ADMIN_USERNAME and ADMIN_PASSWORD must be set as environment variables.");
}

serve(async (req, conn) => {
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

  if (
    url.pathname === "/xmas/santa-stamp-150-200.png" && req.method === "GET"
  ) {
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

  if (url.pathname === "/" && req.method === "POST") {
    try {
      const ip = (conn.remoteAddr as Deno.NetAddr).hostname;
      const ipKey = ["rate_limit", ip];
      let ipCount = (await kv.get<number>(ipKey)).value ?? 0;

      if (ipCount >= 5) {
        return new Response("Too Many Requests", { status: 429 });
      }

      const data = await req.json();

      // Store data in Notion
      await createNotionPage(NOTION_DATABASE_ID, {
        "Recipient Full Name": {
          title: [
            {
              text: {
                content: data.recipient_name || "N/A",
              },
            },
          ],
        },
        "Recipient Address Line 1": {
          rich_text: [
            {
              text: {
                content: data.recipient_address_1 || "N/A",
              },
            },
          ],
        },
        "Recipient Address Line 2": {
          rich_text: [
            { 
              text: {
                content: data.recipient_address_2 || "N/A",
              },
            },
          ],
        },
        "Recipient State": {
          rich_text: [
            {
              text: {
                content: data.recipient_state || "N/A",
              },
            },
          ],
        },
        "Recipient PIN Code": {
          rich_text: [
            {
              text: {
                content: data.pin || "N/A",
              },
            },
          ],
        },
        "Submission Date": {
          date: {
            start: new Date().toISOString(),
          },
        },
        "Sender Name": {
          rich_text: [
            {
              text: {
                content: data.sender_name || "N/A",
              },
            },
          ],
        },
        "Sender IP Address": {
          rich_text: [
            {
              text: {
                content: ip,
              },
            },
          ],
        },
      });

      // Increment IP count
      ipCount++;
      await kv.set(ipKey, ipCount);

      // Store submission count in Deno KV
      const countKey = ["submissions_count"];
      let count = (await kv.get<number>(countKey)).value ?? 0;
      count++;
      await kv.set(countKey, count);

      console.log(`New submission: ${ipCount}`, data);

      return new Response(JSON.stringify({ totalSubmissions: count }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } catch (error) {
      console.error("Error processing form data:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  if (url.pathname === "/xmas/reset-rate-limit" && req.method === "GET") {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Xmas App"' },
      });
    }

    const decodedCreds = atob(authHeader.substring(6));
    const [username, password] = decodedCreds.split(":");

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Xmas App"' },
      });
    }

    try {
      const iter = kv.list({ prefix: ["ip"] });
      for await (const res of iter) {
        await kv.delete(res.key);
      }
      return new Response("Rate limits for all IPs have been reset.", { status: 200 });
    } catch (error) {
      console.error("Error resetting rate limits:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
});
