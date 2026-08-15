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
// 종목 계산
// =========================

function calculateStock(symbol) {

  const trades = getTrades(symbol);

  let shares = 0;

  // 실제 매수 당시 원화 원가
  let costKRW = 0;

  // USD 기준 매수 원가
  let costUSD = 0;

  // 실현손익
  let realizedKRW = 0;


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

      const buyCostUSD =
        quantity * priceUSD;

      const buyCostKRW =
        buyCostUSD * rate;


      shares += quantity;

      costUSD += buyCostUSD;

      costKRW += buyCostKRW;
    }


    // =========================
    // 매도
    // =========================

    if (trade.type === "sell") {

      if (shares <= 0) return;


      const sellQuantity =
        Math.min(quantity, shares);


      // 매도 전 USD 평단
      const averageCostUSD =
        costUSD / shares;


      // 매도 전 원화 평단
      const averageCostKRW =
        costKRW / shares;


      // 매도금액
      const sellRevenueUSD =
        sellQuantity * priceUSD;


      const sellRevenueKRW =
        sellRevenueUSD * rate;


      // 매도한 주식의 원가
      const soldCostUSD =
        averageCostUSD * sellQuantity;


      const soldCostKRW =
        averageCostKRW * sellQuantity;


      // 실현손익
      realizedKRW +=
        sellRevenueKRW - soldCostKRW;


      // 남은 주식 원가
      costUSD -= soldCostUSD;

      costKRW -= soldCostKRW;

      shares -= sellQuantity;
    }

  });


  // =========================
  // 현재 주가
  // =========================

  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  // =========================
  // 현재 평가금액
  // =========================

  const marketValueUSD =
    currentPriceUSD * shares;


  const marketValueKRW =
    marketValueUSD * usdKrw;


  // =========================
  // 평단
  // =========================

  const averageBuyUSD =
    shares > 0
      ? costUSD / shares
      : 0;


  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  // =========================
  // 평가손익
  // =========================

  const evaluationProfitUSD =
    marketValueUSD - costUSD;


  const evaluationProfitKRW =
    marketValueKRW - costKRW;


  // =========================
  // 주가 기준 수익률
  // 환율 영향 없음
  // =========================

  const stockReturnRate =
    costUSD > 0
      ? (evaluationProfitUSD / costUSD) * 100
      : 0;


  // =========================
  // 원화 기준 총손익
  // 환율 변동 포함
  // =========================

  const totalProfitKRW =
    evaluationProfitKRW +
    realizedKRW;


  const totalReturnRateKRW =
    costKRW > 0
      ? (totalProfitKRW / costKRW) * 100
      : 0;


  return {
    shares,

    costUSD,

    costKRW,

    averageBuyUSD,

    averageBuyKRW,

    currentPriceUSD,

    marketValueUSD,

    marketValueKRW,

    evaluationProfitUSD,

    evaluationProfitKRW,

    realizedKRW,

    stockReturnRate,

    totalProfitKRW,

    totalReturnRateKRW
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
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}


// =========================
// 메인 종목 카드
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


  // 보유수량

  if (sharesElement) {

    sharesElement.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  // 현재 주가

  if (priceElement) {

    priceElement.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(stock.currentPriceUSD)
        : "--";
  }


  // 평가금

  if (valueElement) {

    valueElement.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(stock.marketValueKRW)
        : "--";
  }


  // 수익률
  // 주가 기준 → 환율 영향 없음

  if (profitElement) {

    profitElement.textContent =
      stock.costUSD > 0
        ? formatPercent(
            stock.stockReturnRate
          )
        : "--";


    profitElement.classList.remove(
      "up",
      "down"
    );


    if (stock.stockReturnRate > 0) {

      profitElement.classList.add("up");
    }


    if (stock.stockReturnRate < 0) {

      profitElement.classList.add("down");
    }
  }
}


// =========================
// 전체 평가금
// =========================

function updateTotal() {

  let totalValueKRW = 0;

  let totalCostKRW = 0;

  let totalRealizedKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    totalValueKRW +=
      stock.marketValueKRW;


    totalCostKRW +=
      stock.costKRW;


    totalRealizedKRW +=
      stock.realizedKRW;
  });


  // 평가손익

  const evaluationProfitKRW =
    totalValueKRW -
    totalCostKRW;


  // 총손익

  const totalProfitKRW =
    evaluationProfitKRW +
    totalRealizedKRW;


  // 총 수익률

  const totalReturn =
    totalCostKRW > 0
      ? (totalProfitKRW / totalCostKRW) * 100
      : 0;


  // =========================
  // 총 평가금
  // =========================

  const totalValue =
    document.getElementById(
      "total-value"
    );


  if (totalValue) {

    totalValue.textContent =
      formatKRW(totalValueKRW);
  }


  // =========================
  // 총 평가금 USD
  // =========================

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
  // 총 수익
  // =========================

  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    totalProfit.textContent =
      totalCostKRW > 0
        ? `${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)} (${formatPercent(totalReturn)})`
        : "--";


    totalProfit.classList.remove(
      "up",
      "down"
    );


    if (totalProfitKRW > 0) {

      totalProfit.classList.add("up");
    }


    if (totalProfitKRW < 0) {

      totalProfit.classList.add("down");
    }
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


// =========================
// 상세정보
// =========================

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


  // =========================
  // 현재 주가
  // =========================

  price.textContent =
    stock.currentPriceUSD > 0
      ? formatUSD(stock.currentPriceUSD)
      : "--";


  // =========================
  // 보유수량
  // =========================

  shares.textContent =
    `${stock.shares.toLocaleString("ko-KR")}주`;


  // =========================
  // 원화 평단
  // =========================

  averageBuy.textContent =
    stock.averageBuyKRW > 0
      ? formatKRW(stock.averageBuyKRW)
      : "--";


  // =========================
  // 평가금
  // =========================

  value.textContent =
    stock.shares > 0 &&
    stock.currentPriceUSD > 0
      ? formatKRW(stock.marketValueKRW)
      : "--";


  // =========================
  // 평가손익
  // =========================

  evaluation.textContent =
    stock.shares > 0
      ? `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`
      : "--";


  evaluation.classList.remove(
    "up",
    "down"
  );


  if (stock.evaluationProfitKRW > 0) {

    evaluation.classList.add("up");
  }


  if (stock.evaluationProfitKRW < 0) {

    evaluation.classList.add("down");
  }


  // =========================
  // 실현손익
  // =========================

  realized.textContent =
    `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;


  realized.classList.remove(
    "up",
    "down"
  );


  if (stock.realizedKRW > 0) {

    realized.classList.add("up");
  }


  if (stock.realizedKRW < 0) {

    realized.classList.add("down");
  }


  // =========================
  // 총 수익률
  // =========================
  // 주가 기준
  // 환율 영향 없음

  totalProfit.textContent =
    stock.costUSD > 0
      ? formatPercent(
          stock.stockReturnRate
        )
      : "--";


  totalProfit.classList.remove(
    "up",
    "down"
  );


  if (stock.stockReturnRate > 0) {

    totalProfit.classList.add("up");
  }


  if (stock.stockReturnRate < 0) {

    totalProfit.classList.add("down");
  }
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
// 매수 / 매도 버튼
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


  // 현재 주가 자동 입력

  priceInput.value =
    prices[selectedSymbol] || "";


  // 환율 직접 입력

  exchangeRateInput.value = "";


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


  // =========================
  // 수량
  // =========================

  if (
    !Number.isFinite(shares) ||
    shares <= 0
  ) {

    alert("수량을 입력해줘.");

    return;
  }


  // =========================
  // 주가
  // =========================

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert("가격을 입력해줘.");

    return;
  }


  // =========================
  // 환율
  // =========================

  if (
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0
  ) {

    alert(
      "거래 당시 환율을 입력해줘."
    );

    return;
  }


  // =========================
  // 매도 가능 수량
  // =========================

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


  // =========================
  // 거래 저장
  // =========================

  const trades =
    getTrades(
      selectedSymbol
    );


  trades.push({

    type: tradeType,

    shares: shares,

    price: price,

    exchangeRate: exchangeRate,

    date:
      new Date().toISOString()
  });


  saveTrades(
    selectedSymbol,
    trades
  );


  // 거래창 닫기

  document.getElementById(
    "trade-form"
  ).style.display = "none";


  tradeType = null;


  // =========================
  // 화면 갱신
  // =========================

  updateStockCard(
    selectedSymbol
  );


  updateDetail(
    selectedSymbol
  );


  updateTotal();
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


    // =========================
    // 환율
    // =========================

    if (
      Number.isFinite(
        Number(data.USD_KRW)
      )
    ) {

      usdKrw =
        Number(data.USD_KRW);

      updateExchangeRate();
    }


    // =========================
    // 주가
    // =========================

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


    updateTotal();


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