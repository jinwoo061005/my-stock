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
    { symbol: "SKHY", shares: 3, htmlId: "SK" },
    { symbol: "SPMO", shares: 1.336567, htmlId: "SPMO" },
    { symbol: "VIG", shares: 0.651781, htmlId: "VIG" }
];


// =====================================================
// 전역 변수
// =====================================================

let totalAssetUSD = 0;
let totalYesterdayUSD = 0;
let todayProfitUSD = 0;
let usdKrw = 0;


// =====================================================
// 미국주식 시세 가져오기
// =====================================================

// =====================================================
// Yahoo Finance (Vercel API)
// =====================================================

async function getPrice(symbol) {

    const response = await fetch(
        `/api/quote?symbol=${symbol}`
    );

    if (!response.ok) {

        throw new Error(symbol + " API 오류");

    }

    const data = await response.json();

    if (
        data.c === undefined ||
        data.c === null
    ) {

        throw new Error(symbol + " 현재가 없음");

    }

    return data;

}


// =====================================================
// 환율
// =====================================================

async function getExchangeRate() {

    try {

        const response =
            await fetch(
                "https://open.er-api.com/v6/latest/USD"
            );

        const data =
            await response.json();

        return data.rates.KRW;

    } catch (e) {

        console.log("환율 오류", e);

        return null;

    }

}

// =====================================================
// 미국주식 불러오기
// =====================================================

async function loadStocks() {

    totalAssetUSD = 0;
    totalYesterdayUSD = 0;
    todayProfitUSD = 0;

    for (const stock of stocks) {

        try {

            const quote = await getPrice(stock.symbol);

            const price = quote.c;
            const prevPrice = quote.pc;

            const value = price * stock.shares;
            const yesterday = prevPrice * stock.shares;

            totalAssetUSD += value;
            totalYesterdayUSD += yesterday;
            todayProfitUSD += (value - yesterday);

            const htmlId = stock.htmlId;

            const priceEl =
                document.getElementById(htmlId + "-price");

            const valueEl =
                document.getElementById(htmlId + "-value");

            if (priceEl) {
                priceEl.textContent =
                    "$" + price.toFixed(2);
            }

            if (valueEl) {
                valueEl.textContent =
                    "$" + value.toFixed(2);
            }

        } catch (e) {

            console.error(stock.symbol, e);

        }

    }

    usdKrw = await getExchangeRate();
    const exchangeElement = document.getElementById("USD-KRW-price");

if (exchangeElement && usdKrw) {
    exchangeElement.innerHTML =
    `<span style="font-size:0.75rem;opacity:.7;">1 USD</span>
     <br>
     <span style="font-size:1.15rem;font-weight:700;">
        ₩${usdKrw.toLocaleString("ko-KR",{
            minimumFractionDigits:2,
            maximumFractionDigits:2
        })}
     </span>`;
}

    updateTotalAsset();

}



// =====================================================
// 총 평가금
// =====================================================

function updateTotalAsset() {

    const totalEl =
        document.getElementById("totalAsset");

    const profitEl =
        document.getElementById("todayProfit");

    const dollarEl =
        document.getElementById("todayDollar");

    const wonEl =
        document.getElementById("todayWon");

    if (!totalEl) return;

    if (usdKrw) {

        const totalKRW =
            totalAssetUSD * usdKrw;

        totalEl.innerHTML =

            `₩${Math.round(totalKRW).toLocaleString()}
            <br>
            <span style="font-size:0.55em;opacity:.8">
            $${totalAssetUSD.toFixed(2)}
            </span>`;

        const todayWon =
            todayProfitUSD * usdKrw;

        const rate =
            totalYesterdayUSD === 0
            ? 0
            : todayProfitUSD /
              totalYesterdayUSD *
              100;

        if (profitEl) {

            const arrow = rate >= 0 ? "▲" : "▼";

profitEl.textContent =
`${arrow} ${rate>=0?"+":""}${rate.toFixed(2)}%`;

            profitEl.style.color =
                rate >= 0
                ? "#00d26a"
                : "#ff4d4f";

        }

        if (dollarEl) {

            const dollarArrow =
todayProfitUSD >= 0 ? "▲" : "▼";

dollarEl.textContent =
`${dollarArrow} ${todayProfitUSD>=0?"+":""}$${Math.abs(todayProfitUSD).toFixed(2)}`;

            dollarEl.style.color =
                todayProfitUSD >= 0
                ? "#00d26a"
                : "#ff4d4f";

        }

        if (wonEl) {

            const wonArrow =
todayWon >= 0 ? "▲" : "▼";

wonEl.textContent =
`${wonArrow} ${todayWon>=0?"+":""}₩${Math.abs(Math.round(todayWon)).toLocaleString()}`;
            

            wonEl.style.color =
                todayWon >= 0
                ? "#00d26a"
                : "#ff4d4f";

        }

    }

}

// =====================================================
// 코스피 / 코스닥
// =====================================================

async function loadKoreaIndex() {

    try {

        const url =
            "https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex?serviceKey=여기에_공공데이터_API_인증키&pageNo=1&numOfRows=500&resultType=json";

        const res = await fetch(url);

        const data = await res.json();

        const items = data.response.body.items.item;

        // 실제 API에서 오는 이름에 맞게 찾기
        const kospi =
            items.find(i => i.idxNm === "코스피") ||
            items.find(i => i.idxNm === "KOSPI");

        const kosdaq =
            items.find(i => i.idxNm === "코스닥") ||
            items.find(i => i.idxNm === "KOSDAQ");

        if (kospi) {

            const el =
                document.getElementById("KOSPI-price");

            if (el)
                el.textContent =
                    Number(kospi.clpr).toLocaleString();

        }

        if (kosdaq) {

            const el =
                document.getElementById("KOSDAQ-price");

            if (el)
                el.textContent =
                    Number(kosdaq.clpr).toLocaleString();

        }

    } catch (e) {

        console.error("코스피/코스닥 오류", e);

    }

}

// =====================================================
// 미국 시장 (S&P500 / Nasdaq100)
// =====================================================

async function loadUSIndex() {

    try {

        const sp500 = await getPrice("SPY");
        const nasdaq = await getPrice("QQQ");

        // S&P500
        const spPrice = sp500.c;
        const spRate =
            ((sp500.c - sp500.pc) / sp500.pc) * 100;

        const spEl = document.getElementById("SP500-price");

        if (spEl) {

            spEl.innerHTML = `
                $${spPrice.toFixed(2)}
                <br>
                <span style="
                    font-size:0.8rem;
                    color:${spRate >= 0 ? "#e53935" : "#2563eb"};
                    font-weight:600;
                ">
                    ${spRate >= 0 ? "▲" : "▼"}
                    ${Math.abs(spRate).toFixed(2)}%
                </span>
            `;

        }


        // Nasdaq100
        const ndqPrice = nasdaq.c;
        const ndqRate =
            ((nasdaq.c - nasdaq.pc) / nasdaq.pc) * 100;

        const ndqEl = document.getElementById("NASDAQ-price");

        if (ndqEl) {

            ndqEl.innerHTML = `
                $${ndqPrice.toFixed(2)}
                <br>
                <span style="
                    font-size:0.8rem;
                    color:${ndqRate >= 0 ? "#e53935" : "#2563eb"};
                    font-weight:600;
                ">
                    ${ndqRate >= 0 ? "▲" : "▼"}
                    ${Math.abs(ndqRate).toFixed(2)}%
                </span>
            `;

        }

    } catch (e) {

        console.log("미국 시장 오류:", e);

    }

}

// =====================================================
// 새로고침 버튼
// =====================================================

const refreshBtn =
    document.getElementById("refreshBtn");

if (refreshBtn) {

    refreshBtn.addEventListener("click", async () => {

        refreshBtn.disabled = true;
        refreshBtn.textContent = "🔄 불러오는 중...";

        try {

            
            await Promise.all([
    loadStocks(),
    loadKoreaIndex(),
    loadUSIndex()
]);

            refreshBtn.textContent = "✅ 완료";

        } catch (e) {

            console.error(e);

            refreshBtn.textContent = "❌ 오류";

        } finally {

            setTimeout(() => {

                refreshBtn.textContent =
                    "🔄 새로고침";

                refreshBtn.disabled = false;

            }, 1000);

        }

    });

}



// =====================================================
// 시작
// =====================================================

async function init() {

    await Promise.all([
        loadStocks(),
        loadKoreaIndex(),
        loadUSIndex()
    ]);

}

init();



// =====================================================
// 1분마다 자동 갱신
// =====================================================

setInterval(init, 600000);