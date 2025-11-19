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

export async function queryNotionDatabase(databaseId: string) {
  if (!NOTION_API_KEY) {
    console.error("NOTION_API_KEY must be set as an environment variable.");
    return { results: [] };
  }

  let results: any[] = [];
  let next_cursor: string | undefined = undefined;

  do {
    const url = `${NOTION_API_BASE_URL}/databases/${databaseId}/query`;
    const headers = {
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
      Authorization: `Bearer ${NOTION_API_KEY}`,
    };

    const body: any = { page_size: 100 };
    if (next_cursor) {
      body.start_cursor = next_cursor;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to query Notion database: ${error.message}`);
    }

    const data = await response.json();
    results = results.concat(data.results);
    next_cursor = data.next_cursor;
  } while (next_cursor);

  return { results };
}
