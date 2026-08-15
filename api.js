const API_URL = "/api/quote";

export async function loadQuotes() {
  const response = await fetch(API_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}