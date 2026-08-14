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
  let cost = 0;
  let realized = 0;

  trades.forEach(trade => {

    const quantity = Number(trade.shares);
    const price = Number(trade.price);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price) ||
      quantity <= 0 ||
      price <= 0
    ) {
      return;
    }

    // 매수
    if (trade.type === "buy") {

      cost += quantity * price;
      shares += quantity;

    }

    // 매도
    if (trade.type === "sell") {

      if (shares <= 0) return;

      const averageBuy =
        cost / shares;

      const sellQuantity =
        Math.min(quantity, shares);

      realized +=
        (price - averageBuy) *
        sellQuantity;

      cost -=
        averageBuy *
        sellQuantity;

      shares -= sellQuantity;

    }

  });

  const averageBuy =
    shares > 0
      ? cost / shares
      : 0;

  const currentPrice =
    Number(prices[symbol]) || 0;

  const marketValue =
    currentPrice * shares;

  const evaluationProfit =
    (currentPrice - averageBuy) *
    shares;

  return {
    shares,
    cost,
    averageBuy,
    currentPrice,
    marketValue,
    evaluationProfit,
    realized
  };
}


// =========================
// 표시용 숫자
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
// 메인 종목 카드 업데이트
// =========================

function updateStockCard(symbol) {

  const stock =
    calculateStock(symbol);

  const sharesDisplay =
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


  if (sharesDisplay) {

    sharesDisplay.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;

  }


  if (priceElement) {

    priceElement.textContent =
      stock.currentPrice > 0
        ? formatUSD(stock.currentPrice)
        : "--";

  }


  const valueKRW =
    stock.marketValue * usdKrw;

  if (valueElement) {

    valueElement.textContent =
      stock.currentPrice > 0 &&
      stock.shares > 0
        ? formatKRW(valueKRW)
        : "--";

  }


  const investedKRW =
    stock.cost * usdKrw;

  const evaluationKRW =
    stock.evaluationProfit * usdKrw;

  const realizedKRW =
    stock.realized * usdKrw;

  const totalProfitKRW =
    evaluationKRW +
    realizedKRW;

  const returnRate =
    investedKRW > 0
      ? (totalProfitKRW / investedKRW) * 100
      : 0;


  if (profitElement) {

    profitElement.textContent =
      investedKRW > 0
        ? formatPercent(returnRate)
        : "--";

    profitElement.classList.remove(
      "up",
      "down"
    );

    if (returnRate > 0) {
      profitElement.classList.add("up");
    }

    if (returnRate < 0) {
      profitElement.classList.add("down");
    }

  }

}


// =========================
// 전체 평가금
// =========================

function updateTotal() {

  let totalValue = 0;
  let totalCost = 0;
  let totalRealized = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    totalValue +=
      stock.marketValue;

    totalCost +=
      stock.cost;

    totalRealized +=
      stock.realized;

  });


  const totalValueKRW =
    totalValue * usdKrw;

  const totalCostKRW =
    totalCost * usdKrw;

  const totalRealizedKRW =
    totalRealized * usdKrw;

  const evaluationProfitKRW =
    totalValueKRW -
    totalCostKRW;

  const totalProfitKRW =
    evaluationProfitKRW +
    totalRealizedKRW;

  const totalReturn =
    totalCostKRW > 0
      ? (totalProfitKRW / totalCostKRW) * 100
      : 0;


  const totalValueElement =
    document.getElementById(
      "total-value"
    );

  if (totalValueElement) {

    totalValueElement.textContent =
      formatKRW(totalValueKRW);

  }


  const totalDollarElement =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollarElement) {

    totalDollarElement.textContent =
      formatUSD(totalValue);

  }


  const totalProfitElement =
    document.getElementById(
      "total-profit"
    );

  if (totalProfitElement) {

    totalProfitElement.textContent =
      totalCostKRW > 0
        ? `${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)} (${formatPercent(totalReturn)})`
        : "--";

    totalProfitElement.classList.remove(
      "up",
      "down"
    );

    if (totalProfitKRW > 0) {
      totalProfitElement.classList.add("up");
    }

    if (totalProfitKRW < 0) {
      totalProfitElement.classList.add("down");
    }

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
// 상세 화면
// =========================

function openDetail(symbol) {

  selectedSymbol =
    symbol;

  tradeType =
    null;


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
  ).style.display =
    "none";


  updateDetail(symbol);

}


// =========================
// 상세 정보 업데이트
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


  price.textContent =
    stock.currentPrice > 0
      ? formatUSD(stock.currentPrice)
      : "--";


  shares.textContent =
    `${stock.shares.toLocaleString("ko-KR")}주`;


  averageBuy.textContent =
    stock.averageBuy > 0
      ? formatUSD(stock.averageBuy)
      : "--";


  const valueKRW =
    stock.marketValue * usdKrw;


  value.textContent =
    stock.shares > 0 &&
    stock.currentPrice > 0
      ? formatKRW(valueKRW)
      : "--";


  const evaluationKRW =
    stock.evaluationProfit *
    usdKrw;


  evaluation.textContent =
    stock.shares > 0
      ? `${evaluationKRW >= 0 ? "+" : ""}${formatKRW(evaluationKRW)}`
      : "--";


  evaluation.classList.remove(
    "up",
    "down"
  );


  if (evaluationKRW > 0) {
    evaluation.classList.add("up");
  }

  if (evaluationKRW < 0) {
    evaluation.classList.add("down");
  }


  const realizedKRW =
    stock.realized *
    usdKrw;


  realized.textContent =
    `${realizedKRW >= 0 ? "+" : ""}${formatKRW(realizedKRW)}`;


  realized.classList.remove(
    "up",
    "down"
  );


  if (realizedKRW > 0) {
    realized.classList.add("up");
  }

  if (realizedKRW < 0) {
    realized.classList.add("down");
  }


  const investedKRW =
    stock.cost *
    usdKrw;


  const totalProfitKRW =
    evaluationKRW +
    realizedKRW;


  const returnRate =
    investedKRW > 0
      ? (totalProfitKRW / investedKRW) * 100
      : 0;


  totalProfit.textContent =
    investedKRW > 0
      ? formatPercent(returnRate)
      : "--";


  totalProfit.classList.remove(
    "up",
    "down"
  );


  if (returnRate > 0) {
    totalProfit.classList.add("up");
  }

  if (returnRate < 0) {
    totalProfit.classList.add("down");
  }

}


// =========================
// 뒤로가기
// =========================

function closeDetail() {

  selectedSymbol =
    null;

  tradeType =
    null;


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
// 거래 버튼
// =========================

function setupTradeButtons() {

  document.getElementById(
    "detail-buy-button"
  ).addEventListener(
    "click",
    () => {

      tradeType =
        "buy";

      showTradeForm();

    }
  );


  document.getElementById(
    "detail-sell-button"
  ).addEventListener(
    "click",
    () => {

      tradeType =
        "sell";

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


  form.style.display =
    "block";


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  priceInput.value =
    prices[selectedSymbol] || "";


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


  const shares =
    Number(sharesInput.value);

  const price =
    Number(priceInput.value);


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


  // 매도 가능 수량 확인

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

    shares: shares,

    price: price,

    date:
      new Date().toISOString()

  });


  saveTrades(
    selectedSymbol,
    trades
  );


  document.getElementById(
    "trade-form"
  ).style.display =
    "none";


  tradeType =
    null;


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
// 이벤트 설정
// =========================

function setupEvents() {


  // 종목 클릭

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


  // 뒤로가기

  document.getElementById(
    "back-button"
  ).addEventListener(
    "click",
    closeDetail
  );


  // 매수 / 매도

  setupTradeButtons();


  // 거래 확인

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