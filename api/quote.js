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
      "SKADR",
      "VIG"
    ];

    const result = {};

    for (const symbol of symbols) {
      const url =
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data.c && data.c > 0) {
        result[symbol] = data.c;
      }
    }

    const fxResponse = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${API_KEY}`
    );

    if (fxResponse.ok) {
      const fxData = await fxResponse.json();

      if (fxData.quote && fxData.quote.KRW) {
        result.USD_KRW = fxData.quote.KRW;
      }
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("QUOTE ERROR:", error);

    return res.status(500).json({
      error: error.message
    });
  }
}