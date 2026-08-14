export default async function handler(req, res) {
  try {
    const API_KEY = process.env.FINNHUB_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "FINNHUB_API_KEY missing"
      });
    }

    const symbols = [
      "NVDY",
      "QQQM",
      "SCHD",
      "SPMO",
      "SKHY",
      "VIG"
    ];

    const result = {};

    for (const symbol of symbols) {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.c > 0) {
        result[symbol] = data.c;
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message
    });
  }
}