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
// 일간 기록 저장소
// =========================

const DAILY_SNAPSHOT_KEY =
  "my_stock_daily_snapshot";

const DAILY_HISTORY_KEY =
  "my_stock_daily_history";


// =========================
// 거래내역
// =========================

function getTrades(symbol) {

  const saved =
    localStorage.getItem(
      `${symbol}_trades`
    );

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

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(dateKey) {

  const parts =
    dateKey.split("-");

  if (parts.length !== 3) {
    return dateKey;
  }

  return `${parts[1]}/${parts[2]}`;
}


// =========================
// 종목 계산
// =========================

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  let costKRW = 0;
  let costUSD = 0;

  let realizedKRW = 0;


  trades.forEach(trade => {

    const quantity =
      Number(trade.shares);

    const priceUSD =
      Number(trade.price);

    const exchangeRate =
      Number(trade.exchangeRate);


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

      costUSD +=
        buyCostUSD;

      costKRW +=
        buyCostKRW;
    }


    // =========================
    // 매도
    // =========================

    if (trade.type === "sell") {

      if (shares <= 0) {
        return;
      }


      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      const averageCostUSD =
        costUSD / shares;

      const averageCostKRW =
        costKRW / shares;


      const sellRevenueUSD =
        sellQuantity * priceUSD;

      const sellRevenueKRW =
        sellRevenueUSD * rate;


      const soldCostUSD =
        averageCostUSD *
        sellQuantity;

      const soldCostKRW =
        averageCostKRW *
        sellQuantity;


      realizedKRW +=
        sellRevenueKRW -
        soldCostKRW;


      costUSD -=
        soldCostUSD;

      costKRW -=
        soldCostKRW;

      shares -=
        sellQuantity;
    }

  });


  // =========================
  // 현재가
  // =========================

  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  const marketValueUSD =
    currentPriceUSD *
    shares;


  const marketValueKRW =
    marketValueUSD *
    usdKrw;


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
    marketValueUSD -
    costUSD;


  const evaluationProfitKRW =
    marketValueKRW -
    costKRW;


  const totalProfitKRW =
    evaluationProfitKRW +
    realizedKRW;


  const totalReturnRateKRW =
    costKRW > 0
      ? (
          totalProfitKRW /
          costKRW
        ) * 100
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

    totalProfitKRW,
    totalReturnRateKRW

  };
}


// =========================
// 전체 포트폴리오
// =========================

function calculatePortfolio() {

  let valueUSD = 0;
  let valueKRW = 0;

  let costUSD = 0;
  let costKRW = 0;

  let realizedKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    valueUSD +=
      stock.marketValueUSD;

    valueKRW +=
      stock.marketValueKRW;

    costUSD +=
      stock.costUSD;

    costKRW +=
      stock.costKRW;

    realizedKRW +=
      stock.realizedKRW;

  });


  const evaluationProfitKRW =
    valueKRW -
    costKRW;


  const totalProfitKRW =
    evaluationProfitKRW +
    realizedKRW;


  const totalReturn =
    costKRW > 0
      ? (
          totalProfitKRW /
          costKRW
        ) * 100
      : 0;


  return {

    valueUSD,
    valueKRW,

    costUSD,
    costKRW,

    realizedKRW,

    evaluationProfitKRW,

    totalProfitKRW,

    totalReturn

  };
}


// =========================
// 숫자 표시
// =========================

function formatUSD(value) {

  return `$${Number(value)
    .toFixed(2)}`;
}


function formatKRW(value) {

  return `₩${Math.round(value)
    .toLocaleString("ko-KR")}`;
}


function formatPercent(value) {

  return `${
    value >= 0
      ? "+"
      : ""
  }${Number(value).toFixed(2)}%`;
}


// =========================
// 색상
// =========================

function setColor(element, value) {

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
      `${stock.shares
        .toLocaleString("ko-KR")}주`;
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

    profitElement.textContent =
      stock.costKRW > 0
        ? formatPercent(
            stock.totalReturnRateKRW
          )
        : "--";


    setColor(
      profitElement,
      stock.totalReturnRateKRW
    );
  }
}


// =========================
// 전체 평가금
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
        portfolio.valueKRW
      );
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );


  if (totalDollar) {

    totalDollar.textContent =
      formatUSD(
        portfolio.valueUSD
      );
  }


  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    totalProfit.textContent =
      portfolio.costKRW > 0
        ? `${
            portfolio.totalProfitKRW >= 0
              ? "+"
              : ""
          }${formatKRW(
            portfolio.totalProfitKRW
          )} (${
            formatPercent(
              portfolio.totalReturn
            )
          })`
        : "--";


    setColor(
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

function updateMarketElement(
  id,
  market
) {

  const element =
    document.getElementById(id);


  if (!element) return;


  if (
    !market ||
    !Number.isFinite(
      Number(market.price)
    )
  ) {

    element.textContent =
      "--";

    return;
  }


  const price =
    Number(market.price);

  const percent =
    Number(market.percent);


  const priceText =
    price.toLocaleString(
      "ko-KR",
      {
        maximumFractionDigits: 2
      }
    );


  const percentText =
    Number.isFinite(percent)
      ? ` ${
          percent >= 0
            ? "+"
            : ""
        }${percent.toFixed(2)}%`
      : "";


  element.innerHTML =
    `<span class="market-price">${priceText}</span>` +
    `<span class="market-change ${
      percent > 0
        ? "up"
        : percent < 0
          ? "down"
          : ""
    }">${percentText}</span>`;
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
  ).style.display =
    "none";


  document.getElementById(
    "detail-screen"
  ).style.display =
    "block";


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


  price.textContent =
    stock.currentPriceUSD > 0
      ? formatUSD(
          stock.currentPriceUSD
        )
      : "--";


  shares.textContent =
    `${stock.shares
      .toLocaleString("ko-KR")}주`;


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
      ? `${
          stock.evaluationProfitKRW >= 0
            ? "+"
            : ""
        }${formatKRW(
          stock.evaluationProfitKRW
        )}`
      : "--";


  setColor(
    evaluation,
    stock.evaluationProfitKRW
  );


  realized.textContent =
    `${
      stock.realizedKRW >= 0
        ? "+"
        : ""
    }${formatKRW(
      stock.realizedKRW
    )}`;


  setColor(
    realized,
    stock.realizedKRW
  );


  totalProfit.textContent =
    stock.costKRW > 0
      ? formatPercent(
          stock.totalReturnRateKRW
        )
      : "--";


  setColor(
    totalProfit,
    stock.totalReturnRateKRW
  );
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
  ).style.display =
    "none";


  document.getElementById(
    "main-screen"
  ).style.display =
    "block";


  document.getElementById(
    "trade-form"
  ).style.display =
    "none";
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


  const exchangeRateInput =
    document.getElementById(
      "trade-exchange-rate"
    );


  form.style.display =
    "block";


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  priceInput.value =
    prices[selectedSymbol] || "";


  // 현재 환율 자동 입력
  exchangeRateInput.value =
    usdKrw > 0
      ? usdKrw
      : "";


  document.getElementById(
    "trade-shares"
  ).value =
    "";
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

    alert(
      "수량을 입력해줘."
    );

    return;
  }


  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert(
      "가격을 입력해줘."
    );

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


  // =========================
  // 매도 가능수량
  // =========================

  if (tradeType === "sell") {

    const stock =
      calculateStock(
        selectedSymbol
      );


    if (
      shares >
      stock.shares +
      0.0000001
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

    type:
      tradeType,

    shares:
      shares,

    price:
      price,

    exchangeRate:
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

  updateDailyProfit();
}


// =========================
// 일간 스냅샷
// =========================

function getDailySnapshot() {

  const saved =
    localStorage.getItem(
      DAILY_SNAPSHOT_KEY
    );


  if (!saved) {
    return null;
  }


  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}


function saveDailySnapshot(snapshot) {

  localStorage.setItem(
    DAILY_SNAPSHOT_KEY,
    JSON.stringify(snapshot)
  );
}


// =========================
// 일간 기록
// =========================

function getDailyHistory() {

  const saved =
    localStorage.getItem(
      DAILY_HISTORY_KEY
    );


  if (!saved) {
    return [];
  }


  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}


function saveDailyHistory(history) {

  localStorage.setItem(
    DAILY_HISTORY_KEY,
    JSON.stringify(history)
  );
}


// =========================
// 환차익 계산
// =========================

function calculateFXProfit(
  previous,
  current
) {

  if (!previous) {
    return 0;
  }


  if (
    !Number.isFinite(
      previous.usdKrw
    ) ||
    !Number.isFinite(
      current.usdKrw
    )
  ) {
    return 0;
  }


  if (
    previous.usdKrw <= 0 ||
    current.usdKrw <= 0
  ) {
    return 0;
  }


  /*
   * 전일 USD 평가금액을 기준으로
   * 환율 변화가 만든 원화 변화를 계산.
   */

  const fxProfit =
    current.valueUSD *
    (
      current.usdKrw -
      previous.usdKrw
    );


  return fxProfit;
}


// =========================
// 일간 수익 계산
// =========================

function calculateDailyData() {

  const portfolio =
    calculatePortfolio();


  const current = {

    date:
      getDateKey(),

    valueKRW:
      portfolio.valueKRW,

    valueUSD:
      portfolio.valueUSD,

    usdKrw:
      usdKrw

  };


  const previous =
    getDailySnapshot();


  // 첫 실행
  if (!previous) {

    saveDailySnapshot(
      current
    );


    return {

      profitKRW: 0,

      profitUSD: 0,

      rate: 0,

      fxProfitKRW: 0

    };
  }


  // 날짜가 바뀌었으면
  // 어제 기록 저장

  if (
    previous.date !==
    current.date
  ) {

    const yesterdayProfitKRW =
      current.valueKRW -
      previous.valueKRW;


    const yesterdayProfitUSD =
      current.valueUSD -
      previous.valueUSD;


    const yesterdayRate =
      previous.valueKRW > 0
        ? (
            yesterdayProfitKRW /
            previous.valueKRW
          ) * 100
        : 0;


    const yesterdayFX =
      calculateFXProfit(
        previous,
        current
      );


    saveHistoryRecord({

      date:
        previous.date,

      profitKRW:
        yesterdayProfitKRW,

      profitUSD:
        yesterdayProfitUSD,

      rate:
        yesterdayRate,

      fxProfitKRW:
        yesterdayFX

    });


    saveDailySnapshot(
      current
    );


    return {

      profitKRW: 0,

      profitUSD: 0,

      rate: 0,

      fxProfitKRW: 0

    };
  }


  // =========================
  // 오늘 수익
  // =========================

  const profitKRW =
    current.valueKRW -
    previous.valueKRW;


  const profitUSD =
    current.valueUSD -
    previous.valueUSD;


  const rate =
    previous.valueKRW > 0
      ? (
          profitKRW /
          previous.valueKRW
        ) * 100
      : 0;


  const fxProfitKRW =
    calculateFXProfit(
      previous,
      current
    );


  return {

    profitKRW,

    profitUSD,

    rate,

    fxProfitKRW

  };
}


// =========================
// 기록 저장
// =========================

function saveHistoryRecord(record) {

  let history =
    getDailyHistory();


  const existingIndex =
    history.findIndex(
      item =>
        item.date ===
        record.date
    );


  if (
    existingIndex >= 0
  ) {

    history[existingIndex] =
      record;

  } else {

    history.unshift(
      record
    );
  }


  // 최근 30일만 보관

  history =
    history.slice(0, 30);


  saveDailyHistory(
    history
  );
}


// =========================
// 일간 수익 화면
// =========================

function updateDailyProfit() {

  const daily =
    calculateDailyData();


  const krw =
    document.getElementById(
      "daily-profit-krw"
    );


  const usd =
    document.getElementById(
      "daily-profit-usd"
    );


  const rate =
    document.getElementById(
      "daily-profit-rate"
    );


  const fx =
    document.getElementById(
      "daily-profit-fx"
    );


  if (krw) {

    krw.textContent =
      `${
        daily.profitKRW >= 0
          ? "+"
          : ""
      }${formatKRW(
        daily.profitKRW
      )}`;


    setColor(
      krw,
      daily.profitKRW
    );
  }


  if (usd) {

    usd.textContent =
      `${
        daily.profitUSD >= 0
          ? "+"
          : ""
      }${formatUSD(
        daily.profitUSD
      )}`;


    setColor(
      usd,
      daily.profitUSD
    );
  }


  if (rate) {

    rate.textContent =
      formatPercent(
        daily.rate
      );


    setColor(
      rate,
      daily.rate
    );
  }


  if (fx) {

    fx.textContent =
      `환차익 ${
        daily.fxProfitKRW >= 0
          ? "+"
          : ""
      }${formatKRW(
        daily.fxProfitKRW
      )}`;


    setColor(
      fx,
      daily.fxProfitKRW
    );
  }


  renderDailyHistory();
}


// =========================
// 일간 기록 표시
// =========================

function renderDailyHistory() {

  const container =
    document.getElementById(
      "daily-history"
    );


  if (!container) {
    return;
  }


  const history =
    getDailyHistory();


  if (
    history.length === 0
  ) {

    container.innerHTML =
      `<div class="history-empty">
        기록이 없습니다.
      </div>`;

    return;
  }


  container.innerHTML =
    history.map(item => {

      const profitClass =
        item.profitKRW > 0
          ? "up"
          : item.profitKRW < 0
            ? "down"
            : "";


      const fxClass =
        item.fxProfitKRW > 0
          ? "up"
          : item.fxProfitKRW < 0
            ? "down"
            : "";


      return `
        <div class="history-row">

          <div class="history-date">
            ${formatDate(item.date)}
          </div>

          <div
            class="history-profit ${profitClass}"
          >
            ${
              item.profitKRW >= 0
                ? "+"
                : ""
            }${formatKRW(
              item.profitKRW
            )}
          </div>

          <div class="history-rate ${profitClass}">
            ${formatPercent(
              item.rate
            )}
          </div>

          <div
            class="history-fx ${fxClass}"
          >
            ${
              item.fxProfitKRW >= 0
                ? "+"
                : ""
            }${formatKRW(
              item.fxProfitKRW
            )}
          </div>

        </div>
      `;

    }).join("");
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
          cache:
            "no-store"
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
        Number(
          data.USD_KRW
        )
      ) &&
      Number(
        data.USD_KRW
      ) > 0
    ) {

      usdKrw =
        Number(
          data.USD_KRW
        );

      updateExchangeRate();
    }


    // =========================
    // 주가
    // =========================

    symbols.forEach(
      symbol => {

        const price =
          Number(
            data[symbol]
          );


        if (
          Number.isFinite(
            price
          ) &&
          price > 0
        ) {

          prices[symbol] =
            price;
        }


        updateStockCard(
          symbol
        );

      }
    );


    // =========================
    // 주요 시장
    // =========================

    updateMarketElement(
      "kospi",
      data.KOSPI
    );


    updateMarketElement(
      "kosdaq",
      data.KOSDAQ
    );


    updateMarketElement(
      "sp500",
      data.SP500
    );


    updateMarketElement(
      "nasdaq",
      data.NASDAQ
    );


    updateTotal();

    updateDailyProfit();


    if (
      selectedSymbol
    ) {

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
    .querySelectorAll(
      ".stock-card"
    )
    .forEach(card => {

      card.addEventListener(
        "click",
        () => {

          const symbol =
            card.dataset
              .symbol;

          openDetail(
            symbol
          );
        }
      );

    });


  document
    .getElementById(
      "back-button"
    )
    .addEventListener(
      "click",
      closeDetail
    );


  setupTradeButtons();


  document
    .getElementById(
      "trade-submit"
    )
    .addEventListener(
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

    renderDailyHistory();

    loadQuotes();


    setInterval(
      loadQuotes,
      60000
    );

  }
);