export async function validateBasicAuth(c, next) {
  const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME");
  const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");

  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error(
      "ADMIN_USERNAME and ADMIN_PASSWORD must be set as environment variables.",
    );
    return c.text("Internal Server Error", 500);
  }

  const authHeader = c.req.header("authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return c.text("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="Worth A Smile"',
    });
  }

  const decodedCreds = atob(authHeader.substring(6));
  const [username, password] = decodedCreds.split(":");

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return c.text("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="Worth A Smile"',
    });
  }

  await next();
}
