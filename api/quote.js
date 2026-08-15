export default async function handler(req, res) {
    const API_KEY = process.env.FINNHUB_API_KEY;

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

    try {
        const result = {};

        for (const symbol of symbols) {

            const url =
                `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

            const response =
                await fetch(url);

            const data =
                await response.json();

            result[symbol] =
                Number(data.c || 0);
        }

        const exchangeResponse =
            await fetch(
                "https://api.frankfurter.app/latest?from=USD&to=KRW"
            );

        const exchangeData =
            await exchangeResponse.json();

        result.USD_KRW =
            Number(exchangeData.rates?.KRW || 0);

        return res.status(200).json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: error.message
        });
    }
}