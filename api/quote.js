const API_KEY = "d9s2vo9r01qoo7o6ib30d9s2vo9r01qoo7o6ib3g";

export default async function handler(req, res) {
  const symbols = (req.query.symbols || "")
    .split(",")
    .map(v => v.trim().toUpperCase())
    .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({
      error: "symbols required"
    });
  }

  const stocks = {};

  try {

    await Promise.all(
      symbols.map(async (symbol) => {

        const r = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
        );

        const q = await r.json();

        stocks[symbol] = {
          current: q.c,
          previousClose: q.pc
        };

      })
    );

    const fx = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${API_KEY}`
    );

    const fxData = await fx.json();

    const krw =
      fxData.quote?.KRW ??
      null;

    res.status(200).json({

      stocks,

      usdKrw: krw

    });

  } catch (e) {

    res.status(500).json({

      error: e.message

    });

  }
}