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
// 평단 수정값
// =========================

function getAverageOverride(symbol) {

  const saved =
    localStorage.getItem(
      `${symbol}_average_override`
    );

  if (!saved) return null;

  try {

    const data = JSON.parse(saved);

    if (
      Number.isFinite(Number(data.usd)) &&
      Number(data.usd) > 0 &&
      Number.isFinite(Number(data.krw)) &&
      Number(data.krw) > 0
    ) {
      return {
        usd: Number(data.usd),
        krw: Number(data.krw)
      };
    }

  } catch {}

  return null;
}


function saveAverageOverride(symbol, usd, krw) {

  localStorage.setItem(
    `${symbol}_average_override`,
    JSON.stringify({
      usd,
      krw
    })
  );
}


function deleteAverageOverride(symbol) {

  localStorage.removeItem(
    `${symbol}_average_override`
  );
}


// =========================
// 숫자
// =========================

function formatUSD(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatKRW(value) {
  return `₩${Math.round(Number(value)).toLocaleString("ko-KR")}`;
}

function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}


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
// 종목 계산
// =========================

function calculateStock(symbol) {

  const trades = getTrades(symbol);

  let shares = 0;

  let calculatedCostKRW = 0;
  let calculatedCostUSD = 0;

  let realizedKRW = 0;
  let realizedUSD = 0;

  let realizedFXKRW = 0;


  trades.forEach(trade => {

    const quantity =
      Number(trade.shares);

    const priceUSD =
      Number(trade.price);

    const exchangeRate =
      Number(trade.exchangeRate);


    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return;
    }


    if (trade.type === "buy") {

      if (
        !Number.isFinite(priceUSD) ||
        priceUSD <= 0
      ) {
        return;
      }


      const rate =
        Number.isFinite(exchangeRate) &&
        exchangeRate > 0
          ? exchangeRate
          : usdKrw;


      shares += quantity;

      calculatedCostUSD +=
        quantity * priceUSD;

      calculatedCostKRW +=
        quantity *
        priceUSD *
        rate;
    }


    if (trade.type === "sell") {

      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      if (sellQuantity <= 0) {
        return;
      }


      // 매도 거래에 저장된 확정 수익
      if (
        Number.isFinite(
          Number(trade.profitKRW)
        )
      ) {

        realizedKRW +=
          Number(trade.profitKRW);

      } else {

        // 기존 거래 데이터 호환
        const rate =
          Number.isFinite(exchangeRate) &&
          exchangeRate > 0
            ? exchangeRate
            : usdKrw;

        const avgKRW =
          shares > 0
            ? calculatedCostKRW / shares
            : 0;

        const avgUSD =
          shares > 0
            ? calculatedCostUSD / shares
            : 0;


        const revenueKRW =
          sellQuantity *
          priceUSD *
          rate;

        const revenueUSD =
          sellQuantity *
          priceUSD;


        const costKRW =
          sellQuantity *
          avgKRW;

        const costUSD =
          sellQuantity *
          avgUSD;


        realizedKRW +=
          revenueKRW -
          costKRW;

        realizedUSD +=
          revenueUSD -
          costUSD;


        realizedFXKRW +=
          revenueKRW -
          revenueUSD *
          (
            avgKRW / avgUSD
          );
      }


      if (
        Number.isFinite(
          Number(trade.profitUSD)
        )
      ) {

        realizedUSD +=
          Number(trade.profitUSD);
      }


      if (
        Number.isFinite(
          Number(trade.fxProfitKRW)
        )
      ) {

        realizedFXKRW +=
          Number(trade.fxProfitKRW);
      }


      const avgKRW =
        shares > 0
          ? calculatedCostKRW / shares
          : 0;

      const avgUSD =
        shares > 0
          ? calculatedCostUSD / shares
          : 0;


      calculatedCostKRW -=
        avgKRW *
        sellQuantity;

      calculatedCostUSD -=
        avgUSD *
        sellQuantity;


      shares -=
        sellQuantity;
    }

  });


  // =========================
  // 평단
  // =========================

  const override =
    getAverageOverride(symbol);


  let averageBuyKRW =
    shares > 0
      ? calculatedCostKRW / shares
      : 0;

  let averageBuyUSD =
    shares > 0
      ? calculatedCostUSD / shares
      : 0;


  if (override && shares > 0) {

    averageBuyUSD =
      override.usd;

    averageBuyKRW =
      override.krw;
  }


  // =========================
  // 현재 평가
  // =========================

  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  const marketValueUSD =
    currentPriceUSD *
    shares;


  const marketValueKRW =
    marketValueUSD *
    usdKrw;


  const currentCostUSD =
    averageBuyUSD *
    shares;


  const currentCostKRW =
    averageBuyKRW *
    shares;


  // 평가손익
  const evaluationProfitKRW =
    marketValueKRW -
    currentCostKRW;


  // 평가손익의 달러 부분
  const evaluationProfitUSD =
    marketValueUSD -
    currentCostUSD;


  // =========================
  // 환차익
  // =========================

  let holdingFXKRW = 0;

  if (
    shares > 0 &&
    averageBuyUSD > 0 &&
    averageBuyKRW > 0
  ) {

    const purchaseRate =
      averageBuyKRW /
      averageBuyUSD;


    holdingFXKRW =
      marketValueUSD *
      (
        usdKrw -
        purchaseRate
      );
  }


  const totalFXKRW =
    holdingFXKRW +
    realizedFXKRW;


  return {

    shares,

    averageBuyUSD,
    averageBuyKRW,

    currentPriceUSD,

    marketValueUSD,
    marketValueKRW,

    evaluationProfitKRW,
    evaluationProfitUSD,

    realizedKRW,
    realizedUSD,

    holdingFXKRW,
    realizedFXKRW,
    totalFXKRW
  };
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
        ? formatUSD(
            stock.currentPriceUSD
          )
        : "--";
  }


  if (valueElement) {

    valueElement.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(
            stock.marketValueKRW
          )
        : "--";
  }


  if (profitElement) {

    const rate =
      stock.averageBuyKRW > 0 &&
      stock.shares > 0
        ? (
            stock.evaluationProfitKRW /
            (
              stock.averageBuyKRW *
              stock.shares
            )
          ) * 100
        : 0;


    profitElement.innerHTML =
  stock.costKRW > 0
    ? `
      <span class="profit-money">
        ${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)}
      </span>
      <span class="profit-rate">
        ${formatPercent(returnRate)}
      </span>
    `
    : "--";


    applyProfitColor(
      profitElement,
      stock.evaluationProfitKRW
    );
  }
}


// =========================
// 전체 평가금
// =========================

function updateTotal() {

  let totalValueKRW = 0;
  let totalCostKRW = 0;

  let totalEvaluationProfitKRW = 0;

  let totalFXKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    totalValueKRW +=
      stock.marketValueKRW;

    totalCostKRW +=
      stock.averageBuyKRW *
      stock.shares;

    totalEvaluationProfitKRW +=
      stock.evaluationProfitKRW;

    totalFXKRW +=
      stock.holdingFXKRW;
  });


  const totalReturn =
    totalCostKRW > 0
      ? (
          totalEvaluationProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  const totalValue =
    document.getElementById(
      "total-value"
    );


  if (totalValue) {

    totalValue.textContent =
      formatKRW(
        totalValueKRW
      );
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );


  if (totalDollar) {

    const usd =
      usdKrw > 0
        ? totalValueKRW / usdKrw
        : 0;


    totalDollar.textContent =
      formatUSD(usd);
  }


  // =========================
  // 전체수익
  // =========================

  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    if (totalCostKRW > 0) {

      totalProfit.innerHTML =
        `
        ${totalEvaluationProfitKRW >= 0 ? "+" : ""}
        ${formatKRW(totalEvaluationProfitKRW)}
        (${formatPercent(totalReturn)})
        <span class="fx-profit">
          환차익
          ${totalFXKRW >= 0 ? "+" : ""}
          ${formatKRW(totalFXKRW)}
        </span>
        `;

    } else {

      totalProfit.textContent =
        "--";
    }


    applyProfitColor(
      totalProfit,
      totalEvaluationProfitKRW
    );
  }


  // =========================
  // 판매수익
  // =========================

  let totalSoldKRW = 0;
  let totalSoldUSD = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    totalSoldKRW +=
      stock.realizedKRW;

    totalSoldUSD +=
      stock.realizedUSD;
  });


  const soldProfit =
    document.getElementById(
      "sold-profit"
    );


  if (soldProfit) {

    soldProfit.textContent =
      totalSoldKRW >= 0
        ? `+${formatKRW(totalSoldKRW)} (${formatUSD(totalSoldUSD)})`
        : `${formatKRW(totalSoldKRW)} (${formatUSD(totalSoldUSD)})`;


    applyProfitColor(
      soldProfit,
      totalSoldKRW
    );
  }
}


// =========================
// 환율
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
        ? Number(
            marketData.KOSPI
          ).toLocaleString(
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
        ? Number(
            marketData.KOSDAQ
          ).toLocaleString(
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
        ? Number(
            marketData.SP500
          ).toLocaleString(
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
        ? Number(
            marketData.NASDAQ
          ).toLocaleString(
            "en-US",
            {
              maximumFractionDigits: 2
            }
          )
        : "--";
  }
}


// =========================
// 일간 기준
// =========================

function getDateKey() {

  const d =
    new Date();

  return [
    d.getFullYear(),
    String(
      d.getMonth() + 1
    ).padStart(2, "0"),
    String(
      d.getDate()
    ).padStart(2, "0")
  ].join("-");
}


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
// 일간수익
// =========================

function updateDailyProfit() {

  const portfolio =
    getPortfolioValue();


  const today =
    getDateKey();


  let baseline =
    getDailyBaseline();


  if (!baseline) {

    saveDailyBaseline({
      date: today,
      valueKRW:
        portfolio.valueKRW,
      valueUSD:
        usdKrw > 0
          ? portfolio.valueKRW / usdKrw
          : 0
    });

    return;
  }


  if (
    baseline.date !==
    today
  ) {

    saveDailyBaseline({
      date: today,
      valueKRW:
        portfolio.valueKRW,
      valueUSD:
        usdKrw > 0
          ? portfolio.valueKRW / usdKrw
          : 0
    });

    baseline =
      getDailyBaseline();
  }


  const dailyKRW =
    portfolio.valueKRW -
    baseline.valueKRW;


  const currentUSD =
    usdKrw > 0
      ? portfolio.valueKRW / usdKrw
      : 0;


  const dailyUSD =
    currentUSD -
    baseline.valueUSD;


  const dailyPercent =
    baseline.valueKRW > 0
      ? (
          dailyKRW /
          baseline.valueKRW
        ) * 100
      : 0;


  const krw =
    document.getElementById(
      "daily-profit-krw"
    );

  const usd =
    document.getElementById(
      "daily-profit-usd"
    );

  const percent =
    document.getElementById(
      "daily-profit-percent"
    );


  if (krw) {

    krw.textContent =
      `일간 ${dailyKRW >= 0 ? "+" : ""}${formatKRW(dailyKRW)}`;

    applyProfitColor(
      krw,
      dailyKRW
    );
  }


  if (usd) {

    usd.textContent =
      `${dailyUSD >= 0 ? "+" : ""}${formatUSD(dailyUSD)}`;

    applyProfitColor(
      usd,
      dailyUSD
    );
  }


  if (percent) {

    percent.textContent =
      formatPercent(
        dailyPercent
      );

    applyProfitColor(
      percent,
      dailyPercent
    );
  }
}


// =========================
// 포트폴리오 평가금
// =========================

function getPortfolioValue() {

  let valueKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    valueKRW +=
      stock.marketValueKRW;
  });


  return {
    valueKRW
  };
}


// =========================
// 상세
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
  ).textContent =
    symbol;


  document.getElementById(
    "trade-form"
  ).style.display = "none";


  document.getElementById(
    "edit-form"
  ).style.display = "none";


  updateDetail(symbol);
}


function updateDetail(symbol) {

  const stock =
    calculateStock(symbol);


  document.getElementById(
    "detail-price"
  ).textContent =
    stock.currentPriceUSD > 0
      ? formatUSD(
          stock.currentPriceUSD
        )
      : "--";


  document.getElementById(
    "detail-shares"
  ).textContent =
    `${stock.shares.toLocaleString("ko-KR")}주`;


  document.getElementById(
    "detail-average-buy"
  ).textContent =
    stock.averageBuyKRW > 0
      ? formatKRW(
          stock.averageBuyKRW
        )
      : "--";


  document.getElementById(
    "detail-average-usd"
  ).textContent =
    stock.averageBuyUSD > 0
      ? formatUSD(
          stock.averageBuyUSD
        )
      : "--";


  document.getElementById(
    "detail-value"
  ).textContent =
    stock.shares > 0 &&
    stock.currentPriceUSD > 0
      ? formatKRW(
          stock.marketValueKRW
        )
      : "--";


  const evaluation =
    document.getElementById(
      "detail-evaluation-profit"
    );


  evaluation.textContent =
    stock.shares > 0
      ? `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`
      : "--";


  applyProfitColor(
    evaluation,
    stock.evaluationProfitKRW
  );


  const sold =
    document.getElementById(
      "detail-sold-profit"
    );


  sold.textContent =
    stock.realizedKRW >= 0
      ? `+${formatKRW(stock.realizedKRW)} (${formatUSD(stock.realizedUSD)})`
      : `${formatKRW(stock.realizedKRW)} (${formatUSD(stock.realizedUSD)})`;


  applyProfitColor(
    sold,
    stock.realizedKRW
  );


  const totalProfit =
    document.getElementById(
      "detail-total-profit"
    );


  const rate =
    stock.averageBuyKRW > 0 &&
    stock.shares > 0
      ? (
          stock.evaluationProfitKRW /
          (
            stock.averageBuyKRW *
            stock.shares
          )
        ) * 100
      : 0;


  if (stock.shares > 0) {

    totalProfit.innerHTML =
      `
      ${formatPercent(rate)}
      <span class="fx-profit">
        환차익
        ${stock.holdingFXKRW >= 0 ? "+" : ""}
        ${formatKRW(stock.holdingFXKRW)}
      </span>
      `;

  } else {

    totalProfit.textContent =
      "--";
  }


  applyProfitColor(
    totalProfit,
    stock.evaluationProfitKRW
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


  document.getElementById(
    "edit-form"
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


  form.style.display =
    "block";


  document.getElementById(
    "trade-title"
  ).textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  document.getElementById(
    "trade-price"
  ).value =
    prices[selectedSymbol] || "";


  document.getElementById(
    "trade-exchange-rate"
  ).value =
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


  const shares =
    Number(
      document.getElementById(
        "trade-shares"
      ).value
    );


  const price =
    Number(
      document.getElementById(
        "trade-price"
      ).value
    );


  const exchangeRate =
    Number(
      document.getElementById(
        "trade-exchange-rate"
      ).value
    );


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


  const stock =
    calculateStock(
      selectedSymbol
    );


  if (
    tradeType === "sell" &&
    shares >
    stock.shares + 0.0000001
  ) {

    alert(
      `현재 보유수량은 ${stock.shares}주입니다.`
    );

    return;
  }


  const trades =
    getTrades(
      selectedSymbol
    );


  // =========================
  // 매수
  // =========================

  if (tradeType === "buy") {

    trades.push({

      type: "buy",

      shares,

      price,

      exchangeRate,

      date:
        new Date().toISOString()
    });
  }


  // =========================
  // 매도
  // =========================

  if (tradeType === "sell") {

    const avgUSD =
      stock.averageBuyUSD;

    const avgKRW =
      stock.averageBuyKRW;


    const revenueUSD =
      shares *
      price;


    const revenueKRW =
      revenueUSD *
      exchangeRate;


    const costUSD =
      shares *
      avgUSD;


    const costKRW =
      shares *
      avgKRW;


    const profitUSD =
      revenueUSD -
      costUSD;


    const profitKRW =
      revenueKRW -
      costKRW;


    const purchaseRate =
      avgUSD > 0
        ? avgKRW / avgUSD
        : exchangeRate;


    const fxProfitKRW =
      revenueUSD *
      (
        exchangeRate -
        purchaseRate
      );


    trades.push({

      type: "sell",

      shares,

      price,

      exchangeRate,

      profitUSD,

      profitKRW,

      fxProfitKRW,

      date:
        new Date().toISOString()
    });
  }


  saveTrades(
    selectedSymbol,
    trades
  );


  document.getElementById(
    "trade-form"
  ).style.display =
    "none";


  tradeType = null;


  updateAll();
}


// =========================
// 평단 수정
// =========================

function showEditForm() {

  const form =
    document.getElementById(
      "edit-form"
    );


  const stock =
    calculateStock(
      selectedSymbol
    );


  form.style.display =
    "block";


  document.getElementById(
    "edit-average-usd"
  ).value =
    stock.averageBuyUSD > 0
      ? stock.averageBuyUSD
      : "";


  document.getElementById(
    "edit-average-krw"
  ).value =
    stock.averageBuyKRW > 0
      ? stock.averageBuyKRW
      : "";
}


function submitAverageEdit() {

  if (!selectedSymbol) return;


  const usd =
    Number(
      document.getElementById(
        "edit-average-usd"
      ).value
    );


  const krw =
    Number(
      document.getElementById(
        "edit-average-krw"
      ).value
    );


  if (
    !Number.isFinite(usd) ||
    usd <= 0
  ) {

    alert(
      "달러 평단을 입력해줘."
    );

    return;
  }


  if (
    !Number.isFinite(krw) ||
    krw <= 0
  ) {

    alert(
      "원화 평단을 입력해줘."
    );

    return;
  }


  saveAverageOverride(
    selectedSymbol,
    usd,
    krw
  );


  document.getElementById(
    "edit-form"
  ).style.display =
    "none";


  updateAll();
}


function resetAverageEdit() {

  if (!selectedSymbol) return;


  if (
    !confirm(
      "평단 수정값을 삭제하고 거래내역 기준으로 돌아갈까요?"
    )
  ) {
    return;
  }


  deleteAverageOverride(
    selectedSymbol
  );


  document.getElementById(
    "edit-form"
  ).style.display =
    "none";


  updateAll();
}


// =========================
// 전체 갱신
// =========================

function updateAll() {

  symbols.forEach(
    updateStockCard
  );

  updateTotal();

  updateDailyProfit();


  if (selectedSymbol) {

    updateDetail(
      selectedSymbol
    );
  }
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


    const newRate =
      Number(data.USD_KRW);


    if (
      Number.isFinite(newRate) &&
      newRate > 0
    ) {

      usdKrw =
        newRate;

      updateExchangeRate();
    }


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
    });


    marketData.KOSPI =
      Number(data.KOSPI) || 0;

    marketData.KOSDAQ =
      Number(data.KOSDAQ) || 0;

    marketData.SP500 =
      Number(data.SP500) || 0;

    marketData.NASDAQ =
      Number(data.NASDAQ) || 0;


    updateMarket();

    updateAll();


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

          openDetail(
            card.dataset.symbol
          );
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


  document.getElementById(
    "edit-button"
  ).addEventListener(
    "click",
    showEditForm
  );


  document.getElementById(
    "edit-submit"
  ).addEventListener(
    "click",
    submitAverageEdit
  );


  document.getElementById(
    "edit-reset"
  ).addEventListener(
    "click",
    resetAverageEdit
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