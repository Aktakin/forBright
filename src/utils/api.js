/**
 * Safely parse a Response body as JSON.
 * Avoids "Unexpected end of JSON input" when backend is down or returns empty/non-JSON.
 */
export async function parseJson(res) {
  const text = await res.text();
  if (!text || !text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
