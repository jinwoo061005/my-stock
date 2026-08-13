import yahooFinance from "yahoo-finance2";

export default async function handler(req, res) {

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({
      error: "symbol is required"
    });
  }

  try {

    const quote = await yahooFinance.quote(symbol);

    return res.status(200).json({

      symbol: quote.symbol,

      c: quote.regularMarketPrice,

      pc: quote.regularMarketPreviousClose,

      h: quote.regularMarketDayHigh,

      l: quote.regularMarketDayLow,

      o: quote.regularMarketOpen,

      t: quote.regularMarketTime

    });

  } catch (e) {

    return res.status(500).json({

      error: e.message

    });

  }

}
