export default async function handler(req, res) {

  const API_KEY =
    process.env.FINNHUB_API_KEY;


  if (!API_KEY) {

    return res.status(500).json({
      error:
        "FINNHUB_API_KEY 없음"
    });

  }


  const stockSymbols = [
    "NVDY",
    "QQQM",
    "SCHD",
    "SPMO",
    "VIG",
    "SKHY"
  ];


  const marketSymbols = {

    KOSPI:
      "^KS11",

    KOSDAQ:
      "^KQ11",

    SP500:
      "^GSPC",

    NASDAQ:
      "^IXIC"

  };


  try {

    const result = {};


    // =========================
    // 미국 주식
    // =========================

    for (
      const symbol
      of stockSymbols
    ) {

      try {

        const url =
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;


        const response =
          await fetch(
            url,
            {
              cache:
                "no-store"
            }
          );


        if (!response.ok) {

          console.error(
            `${symbol} HTTP ${response.status}`
          );

          result[symbol] =
            0;

          continue;
        }


        const data =
          await response.json();


        result[symbol] =
          Number(
            data.c || 0
          );

      } catch (error) {

        console.error(
          `${symbol} 오류:`,
          error
        );

        result[symbol] =
          0;
      }

    }


    // =========================
    // 주요 시장
    // =========================

    for (
      const [
        name,
        symbol
      ]
      of Object.entries(
        marketSymbols
      )
    ) {

      try {

        const url =
          `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${API_KEY}`;


        const response =
          await fetch(
            url,
            {
              cache:
                "no-store"
            }
          );


        if (!response.ok) {

          result[name] = {

            price: 0,
            change: 0,
            percent: 0

          };

          continue;
        }


        const data =
          await response.json();


        result[name] = {

          price:
            Number(
              data.c || 0
            ),

          change:
            Number(
              data.d || 0
            ),

          percent:
            Number(
              data.dp || 0
            )

        };

      } catch (error) {

        console.error(
          `${name} 오류:`,
          error
        );


        result[name] = {

          price: 0,
          change: 0,
          percent: 0

        };
      }

    }


    // =========================
    // USD / KRW
    // =========================

    try {

      const exchangeResponse =
        await fetch(
          "https://api.frankfurter.app/latest?from=USD&to=KRW",
          {
            cache:
              "no-store"
          }
        );


      if (
        exchangeResponse.ok
      ) {

        const exchangeData =
          await exchangeResponse.json();


        result.USD_KRW =
          Number(
            exchangeData
              .rates
              ?.KRW || 0
          );

      } else {

        result.USD_KRW =
          0;
      }

    } catch (error) {

      console.error(
        "환율 오류:",
        error
      );

      result.USD_KRW =
        0;
    }


    return res.status(200).json(
      result
    );


  } catch (error) {

    console.error(
      "QUOTE API ERROR:",
      error
    );


    return res.status(500).json({
      error:
        error.message
    });
  }
}