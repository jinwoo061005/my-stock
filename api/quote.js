export default async function handler(req, res) {

  const API_KEY =
    process.env.FINNHUB_API_KEY;


  if (!API_KEY) {

    return res.status(500).json({
      error:
        "FINNHUB_API_KEY 없음"
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


  try {

    const result = {};


    /*
     * =========================
     * 미국 주식
     * =========================
     */

    for (
      const symbol of symbols
    ) {

      const url =
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;


      const response =
        await fetch(url);


      if (!response.ok) {

        console.error(
          symbol,
          response.status
        );

        result[symbol] = 0;

        continue;
      }


      const data =
        await response.json();


      result[symbol] =
        Number(
          data.c || 0
        );
    }


    /*
     * =========================
     * 미국 지수
     * =========================
     */

    const sp500Response =
      await fetch(
        `https://finnhub.io/api/v1/quote?symbol=SPY&token=${API_KEY}`
      );


    const sp500Data =
      await sp500Response.json();


    /*
     * 실제 S&P500 지수값 대신
     * SPY 가격을 넣지 않고,
     * 프론트가 최소한 정상 표시되도록
     * 별도 지수 API를 사용.
     */


    /*
     * =========================
     * 환율
     * =========================
     */

    const exchangeResponse =
      await fetch(
        "https://api.frankfurter.app/latest?from=USD&to=KRW"
      );


    const exchangeData =
      await exchangeResponse.json();


    result.USD_KRW =
      Number(
        exchangeData
          .rates
          ?.KRW || 0
      );


    /*
     * =========================
     * 시장지수
     * =========================
     *
     * Finnhub의 symbol 방식
     */

    const indexSymbols = {

      SP500:
        "^GSPC",

      NASDAQ:
        "^IXIC",

      KOSPI:
        "^KS11",

      KOSDAQ:
        "^KQ11"

    };


    for (
      const [name, symbol]
      of Object.entries(
        indexSymbols
      )
    ) {

      try {

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
          Number(
            data.c || 0
          );

      } catch {

        result[name] = 0;
      }
    }


    return res.status(200).json(
      result
    );


  } catch (error) {

    console.error(
      error
    );


    return res.status(500).json({

      error:
        error.message

    });

  }

}