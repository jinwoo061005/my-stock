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

    // 미국 주식
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

    // USD/KRW 환율
    const fxResponse = await fetch(
      "https://open.er-api.com/v6/latest/USD"
    );

    if (fxResponse.ok) {
      const fxData = await fxResponse.json();

      if (fxData.rates && fxData.rates.KRW) {
        result.USD_KRW = fxData.rates.KRW;
      }
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json(result);

  } catch (error) {
    console.error("API ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}