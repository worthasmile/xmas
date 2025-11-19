import { Hono } from "hono";
import { getConnInfo } from "hono/deno";
import { serve } from "https://deno.land/std@0.140.0/http/server.ts";
import { createNotionPage, queryNotionDatabase } from "./notion.ts";
import { rateLimitValidation } from "./middlewares/rate-limit-middleware.ts";
import { validateBasicAuth } from "./middlewares/basic-auth-middleware.ts";

const NOTION_DATABASE_ID = Deno.env.get("NOTION_DATABASE_ID");

const kv = await Deno.openKv();

if (!Deno.env.get("ADMIN_USERNAME") || !Deno.env.get("ADMIN_PASSWORD")) {
  console.error(
    "ADMIN_USERNAME and ADMIN_PASSWORD must be set as environment variables.",
  );
}

const app = new Hono();

// Serve static files
app.get("/xmas", (c) => c.html(Deno.readTextFileSync("index.html")));
app.get(
  "/xmas/santa-stamp-150-200.png",
  (c) => c.body(Deno.readFileSync("santa-stamp-150-200.png")),
);

// Handle form submission
app.post("/api/xmas-cards", rateLimitValidation("xmas_postcard_submissions"), async (c) => {
  try {
    const ip = getConnInfo(c)?.remote?.address || "unknown";

    const data = await c.req.json();

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

    console.log(`New submission:`, data);
    const totalSubmissions = await incrementTrackerCount([
      "xmas_post_cards_total_submissions_count",
    ]);

    return c.json({ totalSubmissions });
  } catch (error) {
    console.error("Error processing form data:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.get("/xmas/stats", validateBasicAuth, async (c) => {
  try {
    const notionData = await queryNotionDatabase(NOTION_DATABASE_ID);
    const count = notionData.results.length;

    const countKey = ["submissions_count"];
    await kv.set(countKey, count);

    return c.json({ totalSubmissions: count });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.text("Internal Server Error", 500);
  }
});

// Reset rate limit
app.get("/api/xmas/reset-rate-limit", validateBasicAuth, async (c) => {
  try {
    const iter = kv.list({ prefix: ["rate_limit"] });

    for await (const res of iter) {
      await kv.delete(res.key);
    }

    return c.text("Rate limits for all IPs have been reset.");
  } catch (error) {
    console.error("Error resetting rate limits:", error);
    return c.text("Internal Server Error", 500);
  }
});

app.notFound((c) => {
  return c.html(Deno.readTextFileSync("404.html"), 404);
});

async function incrementTrackerCount(trackerKey: string[]): Promise<number> {
  let newCount = ((await kv.get<number>(trackerKey)).value ?? 0) + 1;
  await kv.set(trackerKey, newCount);

  return newCount;
}

serve(app.fetch);
