export default async function handler(req, res) {

  const API_KEY =
    process.env.FINNHUB_API_KEY;


  if (!API_KEY) {

    return res.status(500).json({
      error: "FINNHUB_API_KEY 없음"
    });
  }


  const symbols = [
    "NVDY",
    "QQQM",
    "SCHD",
    "SPMO",
    "VIG",
    "SKHY"
  ];


  const indexSymbols = {
    SP500: "^GSPC",
    NASDAQ: "^IXIC",
    KOSPI: "^KS11",
    KOSDAQ: "^KQ11"
  };


  try {

    const result = {};


    // =========================
    // 미국 주식
    // =========================

    for (const symbol of symbols) {

      const url =
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;


      const response =
        await fetch(url);


      if (!response.ok) {
        continue;
      }


      const data =
        await response.json();


      result[symbol] =
        Number(data.c || 0);
    }


    // =========================
    // 주요 지수
    // =========================

    for (
      const [name, symbol]
      of Object.entries(indexSymbols)
    ) {

      const url =
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;


      const response =
        await fetch(url);


      if (!response.ok) {
        result[name] = 0;
        continue;
      }


      const data =
        await response.json();


      result[name] =
        Number(data.c || 0);
    }


    // =========================
    // 환율
    // =========================

    const exchangeResponse =
      await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=KRW"
      );


    if (exchangeResponse.ok) {

      const exchangeData =
        await exchangeResponse.json();


      result.USD_KRW =
        Number(
          exchangeData.rates?.KRW || 0
        );

    } else {

      result.USD_KRW = 0;
    }


    return res.status(200).json(result);


  } catch (error) {

    console.error(error);


    return res.status(500).json({
      error: error.message
    });
  }
}