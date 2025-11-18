import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createNotionPage } from "./notion.ts";

const NOTION_DATABASE_ID = Deno.env.get("NOTION_DATABASE_ID");

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
                content: "123.123.123.123",
              },
            },
          ],
        },
      });

      // Store submission count in Deno KV
      const countKey = ["submissions_count"];
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
