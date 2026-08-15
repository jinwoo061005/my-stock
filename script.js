const API_URL = "/api/quote";

const symbols = [
  "NVDY",
  "QQQM",
  "SCHD",
  "SPMO",
  "SKHY",
  "VIG"
];

let prices = {};
let marketData = {};
let usdKrw = 0;

let selectedSymbol = null;
let tradeType = null;


// =========================
// 거래내역
// =========================

function getTrades(symbol) {
  const saved = localStorage.getItem(`${symbol}_trades`);

  if (!saved) return [];

  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveTrades(symbol, trades) {
  localStorage.setItem(
    `${symbol}_trades`,
    JSON.stringify(trades)
  );
}


// =========================
// 날짜
// =========================

function getDateKey(date = new Date()) {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// =========================
// 종목 계산
// =========================

function calculateStock(symbol) {

  const trades = getTrades(symbol);

  let shares = 0;
  let costKRW = 0;

  let realizedKRW = 0;
  let realizedFXKRW = 0;

  let currentCostUSD = 0;
  let currentCostKRWByFX = 0;

  trades.forEach(trade => {

    const quantity = Number(trade.shares);
    const priceUSD = Number(trade.price);
    const exchangeRate = Number(trade.exchangeRate);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(priceUSD) ||
      quantity <= 0 ||
      priceUSD <= 0
    ) {
      return;
    }

    const rate =
      Number.isFinite(exchangeRate) &&
      exchangeRate > 0
        ? exchangeRate
        : usdKrw;


    // =========================
    // 매수
    // =========================

    if (trade.type === "buy") {

      shares += quantity;

      costKRW +=
        quantity *
        priceUSD *
        rate;

      currentCostUSD +=
        quantity *
        priceUSD;

      currentCostKRWByFX +=
        quantity *
        priceUSD *
        rate;
    }


    // =========================
    // 매도
    // =========================

    if (trade.type === "sell") {

      if (shares <= 0) return;

      const sellQuantity =
        Math.min(quantity, shares);

      const averageCostKRW =
        costKRW / shares;

      const averageCostUSD =
        currentCostUSD / shares;

      const averageFXKRW =
        currentCostKRWByFX / shares;


      const sellRevenueKRW =
        sellQuantity *
        priceUSD *
        rate;

      const soldCostKRW =
        averageCostKRW *
        sellQuantity;

      const soldCostUSD =
        averageCostUSD *
        sellQuantity;

      const soldFXCostKRW =
        averageFXKRW *
        sellQuantity;


      // 전체 실현손익
      realizedKRW +=
        sellRevenueKRW -
        soldCostKRW;


      // 매도 당시 환차익
      const realizedFX =
        sellQuantity *
        priceUSD *
        (rate - averageFXKRW);

      realizedFXKRW +=
        realizedFX;


      costKRW -=
        soldCostKRW;

      currentCostUSD -=
        soldCostUSD;

      currentCostKRWByFX -=
        soldFXCostKRW;

      shares -=
        sellQuantity;
    }

  });


  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  const marketValueUSD =
    currentPriceUSD *
    shares;


  const marketValueKRW =
    marketValueUSD *
    usdKrw;


  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  const evaluationProfitKRW =
    marketValueKRW -
    costKRW;


  // =========================
  // 보유분 환차익
  // =========================

  let holdingFXKRW = 0;

  if (
    shares > 0 &&
    usdKrw > 0 &&
    currentCostUSD > 0
  ) {

    holdingFXKRW =
      marketValueUSD *
      usdKrw -
      marketValueUSD *
      (
        currentCostKRWByFX /
        currentCostUSD
      );
  }


  const totalFXKRW =
    holdingFXKRW +
    realizedFXKRW;


  const totalProfitKRW =
    evaluationProfitKRW +
    realizedKRW;


  return {
    shares,
    costKRW,
    averageBuyKRW,

    currentPriceUSD,
    marketValueUSD,
    marketValueKRW,

    evaluationProfitKRW,
    realizedKRW,

    holdingFXKRW,
    realizedFXKRW,
    totalFXKRW,

    totalProfitKRW
  };
}


// =========================
// 전체 포트폴리오 계산
// =========================

function calculatePortfolio() {

  let totalValueKRW = 0;
  let totalCostKRW = 0;

  let totalEvaluationProfitKRW = 0;
  let totalRealizedKRW = 0;

  let totalFXKRW = 0;

  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    totalValueKRW +=
      stock.marketValueKRW;

    totalCostKRW +=
      stock.costKRW;

    totalEvaluationProfitKRW +=
      stock.evaluationProfitKRW;

    totalRealizedKRW +=
      stock.realizedKRW;

    totalFXKRW +=
      stock.totalFXKRW;
  });


  const totalProfitKRW =
    totalEvaluationProfitKRW +
    totalRealizedKRW;


  const totalReturn =
    totalCostKRW > 0
      ? (
          totalProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  return {
    totalValueKRW,
    totalCostKRW,
    totalEvaluationProfitKRW,
    totalRealizedKRW,
    totalFXKRW,
    totalProfitKRW,
    totalReturn
  };
}


// =========================
// 숫자 표시
// =========================

function formatUSD(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatKRW(value) {
  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}


// =========================
// 색상
// =========================

function applyProfitColor(element, value) {

  if (!element) return;

  element.classList.remove(
    "up",
    "down"
  );

  if (value > 0) {
    element.classList.add("up");
  }

  if (value < 0) {
    element.classList.add("down");
  }
}


// =========================
// 종목 카드
// =========================

function updateStockCard(symbol) {

  const stock =
    calculateStock(symbol);


  const sharesElement =
    document.getElementById(
      `${symbol}-shares-display`
    );

  const priceElement =
    document.getElementById(
      `${symbol}-price`
    );

  const valueElement =
    document.getElementById(
      `${symbol}-value`
    );

  const profitElement =
    document.getElementById(
      `${symbol}-profit`
    );


  if (sharesElement) {

    sharesElement.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  if (priceElement) {

    priceElement.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(stock.currentPriceUSD)
        : "--";
  }


  if (valueElement) {

    valueElement.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(stock.marketValueKRW)
        : "--";
  }


  if (profitElement) {

    const returnRate =
      stock.costKRW > 0
        ? (
            stock.totalProfitKRW /
            stock.costKRW
          ) * 100
        : 0;


    profitElement.textContent =
      stock.costKRW > 0
        ? formatPercent(returnRate)
        : "--";


    applyProfitColor(
      profitElement,
      stock.totalProfitKRW
    );
  }
}


// =========================
// 총 평가금
// =========================

function updateTotal() {

  const portfolio =
    calculatePortfolio();


  const totalValue =
    document.getElementById(
      "total-value"
    );

  if (totalValue) {

    totalValue.textContent =
      formatKRW(
        portfolio.totalValueKRW
      );
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollar) {

    const usd =
      usdKrw > 0
        ? portfolio.totalValueKRW /
          usdKrw
        : 0;

    totalDollar.textContent =
      formatUSD(usd);
  }


  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    if (portfolio.totalCostKRW > 0) {

      totalProfit.innerHTML =
        `
        ${portfolio.totalProfitKRW >= 0 ? "+" : ""}
        ${formatKRW(portfolio.totalProfitKRW)}
        (${formatPercent(portfolio.totalReturn)})
        <span class="fx-profit">
          환차익 ${portfolio.totalFXKRW >= 0 ? "+" : ""}
          ${formatKRW(portfolio.totalFXKRW)}
        </span>
        `;

    } else {

      totalProfit.textContent =
        "--";
    }


    applyProfitColor(
      totalProfit,
      portfolio.totalProfitKRW
    );
  }
}


// =========================
// 환율 표시
// =========================

function updateExchangeRate() {

  const element =
    document.getElementById(
      "usdkrw"
    );

  if (!element) return;


  element.textContent =
    usdKrw > 0
      ? usdKrw.toLocaleString(
          "ko-KR",
          {
            maximumFractionDigits: 2
          }
        )
      : "--";
}


// =========================
// 주요시장
// =========================

function updateMarket() {

  const kospi =
    document.getElementById("kospi");

  const kosdaq =
    document.getElementById("kosdaq");

  const sp500 =
    document.getElementById("sp500");

  const nasdaq =
    document.getElementById("nasdaq");


  if (kospi) {

    kospi.textContent =
      marketData.KOSPI
        ? Number(marketData.KOSPI).toLocaleString(
            "ko-KR",
            {
              maximumFractionDigits: 2
            }
          )
        : "--";
  }


  if (kosdaq) {

    kosdaq.textContent =
      marketData.KOSDAQ
        ? Number(marketData.KOSDAQ).toLocaleString(
            "ko-KR",
            {
              maximumFractionDigits: 2
            }
          )
        : "--";
  }


  if (sp500) {

    sp500.textContent =
      marketData.SP500
        ? Number(marketData.SP500).toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 2
            }
          )
        : "--";
  }


  if (nasdaq) {

    nasdaq.textContent =
      marketData.NASDAQ
        ? Number(marketData.NASDAQ).toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 2
            }
          )
        : "--";
  }
}


// =========================
// 일간 수익 기준값
// =========================

function getDailyBaseline() {

  const saved =
    localStorage.getItem(
      "daily_baseline"
    );

  if (!saved) return null;

  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}


function saveDailyBaseline(data) {

  localStorage.setItem(
    "daily_baseline",
    JSON.stringify(data)
  );
}


// =========================
// 일간 수익
// =========================

function updateDailyProfit() {

  const portfolio =
    calculatePortfolio();


  const today =
    getDateKey();


  const savedBaseline =
    getDailyBaseline();


  // 첫 실행
  if (!savedBaseline) {

    saveDailyBaseline({
      date: today,
      valueKRW:
        portfolio.totalValueKRW,
      valueUSD:
        usdKrw > 0
          ? portfolio.totalValueKRW / usdKrw
          : 0,
      exchangeRate: usdKrw
    });

    return;
  }


  // 날짜가 바뀌었으면
  if (
    savedBaseline.date !==
    today
  ) {

    saveDailyBaseline({
      date: today,
      valueKRW:
        portfolio.totalValueKRW,
      valueUSD:
        usdKrw > 0
          ? portfolio.totalValueKRW / usdKrw
          : 0,
      exchangeRate: usdKrw
    });

    return;
  }


  const dailyProfitKRW =
    portfolio.totalValueKRW -
    savedBaseline.valueKRW;


  const currentUSD =
    usdKrw > 0
      ? portfolio.totalValueKRW / usdKrw
      : 0;


  const dailyProfitUSD =
    currentUSD -
    savedBaseline.valueUSD;


  const dailyRate =
    savedBaseline.valueKRW > 0
      ? (
          dailyProfitKRW /
          savedBaseline.valueKRW
        ) * 100
      : 0;


  const dailyKRW =
    document.getElementById(
      "daily-profit-krw"
    );

  const dailyUSD =
    document.getElementById(
      "daily-profit-usd"
    );

  const dailyPercent =
    document.getElementById(
      "daily-profit-percent"
    );


  if (dailyKRW) {

    dailyKRW.textContent =
      `일간 ${dailyProfitKRW >= 0 ? "+" : ""}${formatKRW(dailyProfitKRW)}`;

    applyProfitColor(
      dailyKRW,
      dailyProfitKRW
    );
  }


  if (dailyUSD) {

    dailyUSD.textContent =
      `${dailyProfitUSD >= 0 ? "+" : ""}${formatUSD(dailyProfitUSD)}`;

    applyProfitColor(
      dailyUSD,
      dailyProfitUSD
    );
  }


  if (dailyPercent) {

    dailyPercent.textContent =
      formatPercent(dailyRate);

    applyProfitColor(
      dailyPercent,
      dailyRate
    );
  }
}


// =========================
// 상세 화면
// =========================

function openDetail(symbol) {

  selectedSymbol = symbol;
  tradeType = null;


  document.getElementById(
    "main-screen"
  ).style.display = "none";


  document.getElementById(
    "detail-screen"
  ).style.display = "block";


  document.getElementById(
    "detail-symbol"
  ).textContent = symbol;


  document.getElementById(
    "trade-form"
  ).style.display = "none";


  updateDetail(symbol);
}


function updateDetail(symbol) {

  const stock =
    calculateStock(symbol);


  const price =
    document.getElementById(
      "detail-price"
    );

  const shares =
    document.getElementById(
      "detail-shares"
    );

  const averageBuy =
    document.getElementById(
      "detail-average-buy"
    );

  const value =
    document.getElementById(
      "detail-value"
    );

  const evaluation =
    document.getElementById(
      "detail-evaluation-profit"
    );

  const realized =
    document.getElementById(
      "detail-realized-profit"
    );

  const totalProfit =
    document.getElementById(
      "detail-total-profit"
    );


  price.textContent =
    stock.currentPriceUSD > 0
      ? formatUSD(
          stock.currentPriceUSD
        )
      : "--";


  shares.textContent =
    `${stock.shares.toLocaleString("ko-KR")}주`;


  averageBuy.textContent =
    stock.averageBuyKRW > 0
      ? formatKRW(
          stock.averageBuyKRW
        )
      : "--";


  value.textContent =
    stock.shares > 0 &&
    stock.currentPriceUSD > 0
      ? formatKRW(
          stock.marketValueKRW
        )
      : "--";


  evaluation.textContent =
    stock.shares > 0
      ? `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`
      : "--";


  applyProfitColor(
    evaluation,
    stock.evaluationProfitKRW
  );


  realized.textContent =
    `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;

  applyProfitColor(
    realized,
    stock.realizedKRW
  );


  const returnRate =
    stock.costKRW > 0
      ? (
          stock.totalProfitKRW /
          stock.costKRW
        ) * 100
      : 0;


  if (stock.costKRW > 0) {

    totalProfit.innerHTML =
      `
      ${formatPercent(returnRate)}
      <span class="fx-profit">
        환차익 ${stock.totalFXKRW >= 0 ? "+" : ""}
        ${formatKRW(stock.totalFXKRW)}
      </span>
      `;

  } else {

    totalProfit.textContent =
      "--";
  }


  applyProfitColor(
    totalProfit,
    stock.totalProfitKRW
  );
}


// =========================
// 뒤로가기
// =========================

function closeDetail() {

  selectedSymbol = null;
  tradeType = null;


  document.getElementById(
    "detail-screen"
  ).style.display = "none";


  document.getElementById(
    "main-screen"
  ).style.display = "block";


  document.getElementById(
    "trade-form"
  ).style.display = "none";
}


// =========================
// 매수 / 매도
// =========================

function setupTradeButtons() {

  document.getElementById(
    "detail-buy-button"
  ).addEventListener(
    "click",
    () => {

      tradeType = "buy";

      showTradeForm();
    }
  );


  document.getElementById(
    "detail-sell-button"
  ).addEventListener(
    "click",
    () => {

      tradeType = "sell";

      showTradeForm();
    }
  );
}


// =========================
// 거래창
// =========================

function showTradeForm() {

  const form =
    document.getElementById(
      "trade-form"
    );

  const title =
    document.getElementById(
      "trade-title"
    );

  const priceInput =
    document.getElementById(
      "trade-price"
    );

  const exchangeRateInput =
    document.getElementById(
      "trade-exchange-rate"
    );


  form.style.display = "block";


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  priceInput.value =
    prices[selectedSymbol] || "";


  exchangeRateInput.value =
    usdKrw || "";


  document.getElementById(
    "trade-shares"
  ).value = "";
}


// =========================
// 거래 실행
// =========================

function submitTrade() {

  if (
    !selectedSymbol ||
    !tradeType
  ) {
    return;
  }


  const sharesInput =
    document.getElementById(
      "trade-shares"
    );

  const priceInput =
    document.getElementById(
      "trade-price"
    );

  const exchangeRateInput =
    document.getElementById(
      "trade-exchange-rate"
    );


  const shares =
    Number(sharesInput.value);

  const price =
    Number(priceInput.value);

  const exchangeRate =
    Number(exchangeRateInput.value);


  if (
    !Number.isFinite(shares) ||
    shares <= 0
  ) {

    alert("수량을 입력해줘.");

    return;
  }


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert("가격을 입력해줘.");

    return;
  }


  if (
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0
  ) {

    alert(
      "거래 당시 환율을 입력해줘."
    );

    return;
  }


  if (tradeType === "sell") {

    const stock =
      calculateStock(
        selectedSymbol
      );


    if (
      shares >
      stock.shares + 0.0000001
    ) {

      alert(
        `현재 보유수량은 ${stock.shares}주입니다.`
      );

      return;
    }
  }


  const trades =
    getTrades(
      selectedSymbol
    );


  trades.push({

    type: tradeType,

    shares,

    price,

    exchangeRate,

    date:
      new Date().toISOString()
  });


  saveTrades(
    selectedSymbol,
    trades
  );


  document.getElementById(
    "trade-form"
  ).style.display = "none";


  tradeType = null;


  updateStockCard(
    selectedSymbol
  );

  updateDetail(
    selectedSymbol
  );

  updateTotal();

  updateDailyProfit();
}


// =========================
// API
// =========================

async function loadQuotes() {

  try {

    const response =
      await fetch(
        API_URL,
        {
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    // 환율
    if (
      Number.isFinite(
        Number(data.USD_KRW)
      )
    ) {

      usdKrw =
        Number(data.USD_KRW);

      updateExchangeRate();
    }


    // 주가
    symbols.forEach(symbol => {

      const price =
        Number(data[symbol]);


      if (
        Number.isFinite(price) &&
        price > 0
      ) {

        prices[symbol] =
          price;
      }


      updateStockCard(symbol);
    });


    // 주요시장
    marketData.KOSPI =
      Number(data.KOSPI) || 0;

    marketData.KOSDAQ =
      Number(data.KOSDAQ) || 0;

    marketData.SP500 =
      Number(data.SP500) || 0;

    marketData.NASDAQ =
      Number(data.NASDAQ) || 0;


    updateMarket();

    updateTotal();

    updateDailyProfit();


    if (selectedSymbol) {

      updateDetail(
        selectedSymbol
      );
    }


  } catch (error) {

    console.error(
      "주가 업데이트 실패:",
      error
    );
  }
}


// =========================
// 이벤트
// =========================

function setupEvents() {

  document
    .querySelectorAll(".stock-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const symbol =
            card.dataset.symbol;

          openDetail(symbol);
        }
      );
    });


  document.getElementById(
    "back-button"
  ).addEventListener(
    "click",
    closeDetail
  );


  setupTradeButtons();


  document.getElementById(
    "trade-submit"
  ).addEventListener(
    "click",
    submitTrade
  );
}


// =========================
// 시작
// =========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    setInterval(
      loadQuotes,
      60000
    );
  }
);