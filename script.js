// =====================================================
// API KEY
// =====================================================

const API_KEY = "d9s2vo9r01qoo7o6ib30d9s2vo9r01qoo7o6ib3g";


// =====================================================
// 보유 미국주식
// =====================================================

const stocks = [
    { symbol: "NVDY", shares: 14, htmlId: "NVDY" },
    { symbol: "QQQM", shares: 0.759174, htmlId: "QQQM" },
    { symbol: "SCHD", shares: 5, htmlId: "SCHD" },

    // SK하이닉스 ADR
    { symbol: "SKHY", shares: 3, htmlId: "SK" },

    { symbol: "SPMO", shares: 1.336567, htmlId: "SPMO" },
    { symbol: "VIG", shares: 0.651781, htmlId: "VIG" }
];


// =====================================================
// 평가금
// =====================================================

let totalAssetUSD = 0;
let usdKrw = 0;


// =====================================================
// 미국주식 현재가
// =====================================================

async function getPrice(symbol) {

    const url =
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(symbol + " API 오류");
    }

    const data = await response.json();

    console.log(symbol, data);

    if (
        data.c === undefined ||
        data.c === null ||
        data.c === 0
    ) {
        throw new Error(symbol + " 현재가 없음");
    }

    return data.c;
}


// =====================================================
// 환율 가져오기
// =====================================================

async function getExchangeRate() {

    try {

        const response = await fetch(
            "https://open.er-api.com/v6/latest/USD"
        );

        if (!response.ok) {
            throw new Error("환율 API 오류");
        }

        const data = await response.json();

        if (
            !data.rates ||
            !data.rates.KRW
        ) {
            throw new Error("USD/KRW 데이터 없음");
        }

        return data.rates.KRW;

    } catch (error) {

        console.log("환율 오류:", error);

        return null;
    }
}


// =====================================================
// 미국주식 화면 업데이트
// =====================================================

async function loadStocks() {

    totalAssetUSD = 0;

    for (const stock of stocks) {

        try {

            const price =
                await getPrice(stock.symbol);

            const value =
                price * stock.shares;

            totalAssetUSD += value;


            const htmlId =
                stock.htmlId || stock.symbol;


            const priceElement =
                document.getElementById(
                    htmlId + "-price"
                );

            const valueElement =
                document.getElementById(
                    htmlId + "-value"
                );


            if (priceElement) {

                priceElement.innerHTML =
                    "$" + price.toFixed(2);

            }


            if (valueElement) {

                valueElement.innerHTML =
                    "$" + value.toFixed(2);

            }


        } catch (error) {

            console.log(
                stock.symbol + " 오류:",
                error
            );

        }

    }


    // 환율 가져오기
    usdKrw = await getExchangeRate();


    // 총 평가금 표시
    updateTotalAsset();

}


// =====================================================
// 총 평가금 업데이트
// =====================================================

function updateTotalAsset() {

    const totalElement =
        document.getElementById("totalAsset");


    if (!totalElement) {
        return;
    }


    // 환율이 정상적으로 받아졌을 때
    if (usdKrw) {

        const totalKRW =
            totalAssetUSD * usdKrw;


        totalElement.innerHTML =

            "₩" +
            totalKRW.toLocaleString(
                "ko-KR",
                {
                    maximumFractionDigits: 0
                }
            ) +

            "<br>" +

            "<span style='font-size: 0.55em; opacity: 0.8;'>" +

            "$" +
            totalAssetUSD.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ) +

            "</span>";

    }

    // 환율을 못 가져왔을 경우
    else {

        totalElement.innerHTML =

            "$" +
            totalAssetUSD.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }

}


// =====================================================
// 시작
// =====================================================

loadStocks();