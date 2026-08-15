export default async function handler(req, res) {
    try {
        const symbols = [
            "NVDY",
            "QQQM",
            "SCHD",
            "SPMO",
            "VIG",
            "SKHY"
        ];

        const API_KEY = process.env.FINNHUB_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({
                error: "FINNHUB_API_KEY가 없습니다."
            });
        }

        const result = {};

        for (const symbol of symbols) {
            const response = await fetch(
                `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
            );

            if (!response.ok) {
                continue;
            }

            const data = await response.json();

            result[symbol] = Number(data.c || 0);
        }

        result.USD_KRW =
            await getExchangeRate();

        return res.status(200).json(result);

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            error: "주가를 불러오지 못했습니다."
        });
    }
}

async function getExchangeRate() {

    try {

        const response =
            await fetch(
                "https://api.frankfurter.app/latest?from=USD&to=KRW"
            );

        if (!response.ok) {
            return 0;
        }

        const data =
            await response.json();

        return Number(
            data.rates?.KRW || 0
        );

    } catch {

        return 0;

    }
}