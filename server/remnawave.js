export async function getUserSubscriptions(telegramId) {
  const baseUrl = process.env.REMNAWAVE_API_URL;
  const apiKey = process.env.REMNAWAVE_API_KEY;

  if (!baseUrl || !apiKey) {
    return { configured: false, subscriptions: [] };
  }

  const url = new URL("/users", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("telegramId", String(telegramId));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Remnawave API error: ${response.status}`);
  }

  const data = await response.json();
  const subscriptions = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];

  return { configured: true, subscriptions };
}
