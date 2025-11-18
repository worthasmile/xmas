const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");

export async function createNotionPage(
  databaseId: string,
  properties: any,
) {
  if (!NOTION_API_KEY) {
    console.error(
      "NOTION_API_KEY and NOTION_DATABASE_ID must be set as environment variables.",
    );
    return;
  }

  const url = `${NOTION_API_BASE_URL}/pages`;
  const headers = {
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
    Authorization: `Bearer ${NOTION_API_KEY}`,
  };

  const body = JSON.stringify({
    parent: { database_id: databaseId },
    properties,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Notion page: ${error.message}`);
  }

  return await response.json();
}
