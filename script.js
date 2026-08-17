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
let previousPrices = {};

let usdKrw = 0;
let previousUsdKrw = 0;

let selectedSymbol = null;
let tradeType = null;


/* =========================
   STORAGE
========================= */

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


/* =========================
   날짜
========================= */

function getDateKey(date = new Date()) {

  const y = date.getFullYear();

  const m =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const d =
    String(date.getDate())
      .padStart(2, "0");

  return `${y}-${m}-${d}`;
}


function getYesterdayKey() {

  const date = new Date();

  date.setDate(
    date.getDate() - 1
  );

  return getDateKey(date);
}


/* =========================
   일간 기록
========================= */

function getDailyRecords() {

  const saved =
    localStorage.getItem(
      "daily_profit_records"
    );

  if (!saved) return {};

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}


function saveDailyRecords(records) {

  localStorage.setItem(
    "daily_profit_records",
    JSON.stringify(records)
  );
}


/* =========================
   종목 계산
========================= */

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  let costKRW = 0;

  let realizedKRW = 0;

  let fxProfitKRW = 0;

  let stockProfitKRW = 0;


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


    /* =========================
       매수
    ========================== */

    if (trade.type === "buy") {

      const buyCost =
        quantity *
        priceUSD *
        rate;

      costKRW +=
        buyCost;

      shares +=
        quantity;

      return;
    }


    /* =========================
       매도
    ========================== */

    if (trade.type === "sell") {

      if (shares <= 0) return;


      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      const averageCostKRW =
        costKRW / shares;


      const sellRevenueKRW =
        sellQuantity *
        priceUSD *
        rate;


      const soldCostKRW =
        averageCostKRW *
        sellQuantity;


      realizedKRW +=
        sellRevenueKRW -
        soldCostKRW;


      costKRW -=
        soldCostKRW;


      shares -=
        sellQuantity;
    }

  });


  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  const marketValueKRW =
    currentPriceUSD *
    shares *
    usdKrw;


  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  const evaluationProfitKRW =
    marketValueKRW -
    costKRW;


  /*
   * 환차익 계산
   *
   * 현재 보유 주식의 원가에 들어간
   * 환율과 현재 환율의 차이
   */

  if (
    shares > 0 &&
    currentPriceUSD > 0
  ) {

    let remainingShares =
      shares;

    let remainingCostKRW =
      costKRW;

    let totalOriginalUSD =
      0;

    let totalOriginalKRW =
      0;


    trades.forEach(trade => {

      if (
        trade.type !== "buy"
      ) {
        return;
      }

      const q =
        Number(trade.shares);

      const p =
        Number(trade.price);

      const r =
        Number(trade.exchangeRate);


      if (
        !Number.isFinite(q) ||
        !Number.isFinite(p) ||
        !Number.isFinite(r) ||
        q <= 0 ||
        p <= 0 ||
        r <= 0
      ) {
        return;
      }


      const used =
        Math.min(
          q,
          remainingShares
        );


      totalOriginalUSD +=
        used * p;

      totalOriginalKRW +=
        used * p * r;

      remainingShares -=
        used;

    });


    if (
      totalOriginalUSD > 0
    ) {

      const currentAtOriginalFX =
        totalOriginalUSD *
        usdKrw;

      fxProfitKRW =
        currentAtOriginalFX -
        totalOriginalKRW;
    }
  }


  stockProfitKRW =
    evaluationProfitKRW -
    fxProfitKRW;


  return {

    shares,

    costKRW,

    averageBuyKRW,

    currentPriceUSD,

    marketValueKRW,

    evaluationProfitKRW,

    stockProfitKRW,

    fxProfitKRW,

    realizedKRW

  };
}


/* =========================
   포맷
========================= */

function formatUSD(value) {

  return `$${Number(value).toFixed(2)}`;
}


function formatKRW(value) {

  return `₩${Math.round(
    value
  ).toLocaleString("ko-KR")}`;
}


function formatPercent(value) {

  return `${
    value >= 0 ? "+" : ""
  }${value.toFixed(2)}%`;
}

// =========================
// 일간 수익률 기록
// =========================

function getDailyRecords() {

  const saved =
    localStorage.getItem("daily_profit_records");

  if (!saved) {
    return {};
  }

  try {
    return JSON.parse(saved);
  } catch {
    return {};
  }
}


function saveDailyRecords(records) {

  localStorage.setItem(
    "daily_profit_records",
    JSON.stringify(records)
  );
}


// 오늘 날짜
function getTodayString() {

  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(now.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(now.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


// 날짜 표시
function formatDailyDate(dateString) {

  const parts =
    dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return `${parts[1]}/${parts[2]}`;
}


// 일간 수익률 합계
function getTotalDailyReturn(records) {

  return Object.values(records)
    .reduce((total, record) => {

      const value =
        Number(record.returnRate);

      return Number.isFinite(value)
        ? total + value
        : total;

    }, 0);
}


// =========================
// 오늘 수익률
// =========================

function updateDailyProfit() {

  const records =
    getDailyRecords();

  const today =
    getTodayString();

  const todayRecord =
    records[today];


  const main =
    document.getElementById(
      "daily-profit-main"
    );

  const detail =
    document.getElementById(
      "daily-profit-detail"
    );


  if (!main || !detail) {
    return;
  }


  if (!todayRecord) {

    main.textContent =
      "--";

    detail.textContent =
      "오늘 기록 없음";

    main.classList.remove(
      "up",
      "down"
    );

    return;
  }


  const todayRate =
    Number(todayRecord.returnRate) || 0;


  const totalRate =
    getTotalDailyReturn(records);


  main.textContent =
    formatPercent(todayRate);


  detail.textContent =
    `(총 ${formatPercent(totalRate)})`;


  main.classList.remove(
    "up",
    "down"
  );


  if (todayRate > 0) {
    main.classList.add("up");
  }

  if (todayRate < 0) {
    main.classList.add("down");
  }
}


// =========================
// 날짜별 수익률 화면
// =========================

function updateDailyHistory() {

  const list =
    document.getElementById(
      "daily-history-list"
    );

  if (!list) {
    return;
  }


  const records =
    getDailyRecords();


  const dates =
    Object.keys(records)
      .sort()
      .reverse();


  list.innerHTML = "";


  if (dates.length === 0) {

    list.innerHTML = `
      <div class="daily-empty">
        아직 기록이 없습니다.
      </div>
    `;

    return;
  }


  let accumulated = 0;


  // 오래된 날짜부터 합계를 계산
  const sortedOldest =
    [...dates].sort();


  const accumulatedMap = {};


  sortedOldest.forEach(date => {

    const rate =
      Number(
        records[date].returnRate
      ) || 0;

    accumulated += rate;

    accumulatedMap[date] =
      accumulated;
  });


  // 최신 날짜부터 표시
  dates.forEach(date => {

    const rate =
      Number(
        records[date].returnRate
      ) || 0;

    const totalRate =
      accumulatedMap[date];


    const row =
      document.createElement("div");

    row.className =
      "daily-history-row";


    const rateClass =
      rate > 0
        ? "up"
        : rate < 0
          ? "down"
          : "";


    const totalClass =
      totalRate > 0
        ? "up"
        : totalRate < 0
          ? "down"
          : "";


    row.innerHTML = `

      <div class="daily-date">
        ${formatDailyDate(date)}
      </div>

      <div class="daily-rate ${rateClass}">
        ${formatPercent(rate)}
      </div>

      <div class="daily-total ${totalClass}">
        (${formatPercent(totalRate)})
      </div>

      <button
        class="daily-edit"
        type="button"
        data-date="${date}"
      >
        ✎
      </button>

    `;


    list.appendChild(row);

  });


  // 수정 버튼
  list
    .querySelectorAll(".daily-edit")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          editDailyRecord(
            button.dataset.date
          );

        }
      );

    });
}


// =========================
// 일간 수익률 수정
// =========================

function editDailyRecord(date) {

  const records =
    getDailyRecords();


  const current =
    records[date]
      ? Number(
          records[date].returnRate
        )
      : 0;


  const input =
    prompt(
      `${formatDailyDate(date)} 일간 수익률을 입력하세요.\n\n예: 1.25 또는 -0.85`,
      current
    );


  if (input === null) {
    return;
  }


  const value =
    Number(input);


  if (!Number.isFinite(value)) {

    alert(
      "올바른 숫자를 입력해주세요."
    );

    return;
  }


  records[date] = {
    returnRate: value
  };


  saveDailyRecords(records);


  updateDailyProfit();
  updateDailyHistory();
}


// =========================
// 일간 수익률 기록 추가
// =========================

function addDailyRecord() {

  const date =
    prompt(
      "날짜를 입력하세요.\n예: 2026-08-17"
    );


  if (!date) {
    return;
  }


  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {

    alert(
      "날짜 형식은 YYYY-MM-DD 입니다."
    );

    return;
  }


  const rateInput =
    prompt(
      "일간 수익률을 입력하세요.\n예: 1.25 또는 -0.85"
    );


  if (rateInput === null) {
    return;
  }


  const rate =
    Number(rateInput);


  if (!Number.isFinite(rate)) {

    alert(
      "올바른 수익률을 입력해주세요."
    );

    return;
  }


  const records =
    getDailyRecords();


  records[date] = {
    returnRate: rate
  };


  saveDailyRecords(records);


  updateDailyProfit();
  updateDailyHistory();
}


// =========================
// 일간 수익률 클릭
// =========================

function setupDailyProfit() {

  const box =
    document.getElementById(
      "daily-profit-box"
    );


  const history =
    document.getElementById(
      "daily-history"
    );


  if (!box || !history) {
    return;
  }


  box.addEventListener(
    "click",
    () => {

      const isOpen =
        history.style.display !== "none";


      history.style.display =
        isOpen
          ? "none"
          : "block";


      if (!isOpen) {
        updateDailyHistory();
      }

    }
  );


  const addButton =
    document.getElementById(
      "add-daily-record"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        addDailyRecord();

      }
    );

  }


  updateDailyProfit();
}

function setColor(element, value) {

  if (!element) return;

  element.classList.remove(
    "up",
    "down",
    "flat"
  );


  if (value > 0) {

    element.classList.add(
      "up"
    );

  } else if (value < 0) {

    element.classList.add(
      "down"
    );

  } else {

    element.classList.add(
      "flat"
    );
  }
}


/* =========================
   종목 카드
========================= */

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
      `${stock.shares.toLocaleString(
        "ko-KR"
      )}주`;
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


  /*
   * 판매수익은 제외.
   * 평가손익 + 환차익 = 전체 평가수익
   */

  const totalProfitKRW =
    stock.evaluationProfitKRW;


  const returnRate =
    stock.costKRW > 0
      ? (
          totalProfitKRW /
          stock.costKRW
        ) * 100
      : 0;


  if (profitElement) {

    if (stock.costKRW > 0) {

      profitElement.textContent =
        `${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)}  ${formatPercent(returnRate)}`;

    } else {

      profitElement.textContent =
        "--";
    }


    setColor(
      profitElement,
      totalProfitKRW
    );
  }
}


/* =========================
   전체 계산
========================= */

function calculateTotal() {

  let totalValueKRW = 0;

  let totalCostKRW = 0;

  let totalRealizedKRW = 0;

  let totalFxProfitKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    totalValueKRW +=
      stock.marketValueKRW;

    totalCostKRW +=
      stock.costKRW;

    totalRealizedKRW +=
      stock.realizedKRW;

    totalFxProfitKRW +=
      stock.fxProfitKRW;

  });


  /*
   * 전체수익
   *
   * 판매수익 제외
   *
   * 평가손익 안에 환차익 포함
   */

  const totalProfitKRW =
    totalValueKRW -
    totalCostKRW;


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

    totalProfitKRW,

    totalReturn,

    totalRealizedKRW,

    totalFxProfitKRW

  };
}


/* =========================
   전체 화면
========================= */

function updateTotal() {

  const total =
    calculateTotal();


  const totalValue =
    document.getElementById(
      "total-value"
    );

  const totalDollar =
    document.getElementById(
      "total-dollar"
    );

  const totalProfit =
    document.getElementById(
      "total-profit"
    );

  const fxProfit =
    document.getElementById(
      "total-fx-profit"
    );

  const realizedProfit =
    document.getElementById(
      "total-realized-profit"
    );


  if (totalValue) {

    totalValue.textContent =
      formatKRW(
        total.totalValueKRW
      );
  }


  if (totalDollar) {

    const usd =
      usdKrw > 0
        ? total.totalValueKRW /
          usdKrw
        : 0;


    totalDollar.textContent =
      formatUSD(usd);
  }


  if (totalProfit) {

    totalProfit.textContent =
      total.totalCostKRW > 0
        ? `${total.totalProfitKRW >= 0 ? "+" : ""}${formatKRW(total.totalProfitKRW)}  ${formatPercent(total.totalReturn)}`
        : "--";


    setColor(
      totalProfit,
      total.totalProfitKRW
    );
  }


  if (fxProfit) {

    fxProfit.textContent =
      total.totalCostKRW > 0
        ? `${total.totalFxProfitKRW >= 0 ? "+" : ""}${formatKRW(total.totalFxProfitKRW)}`
        : "--";


    setColor(
      fxProfit,
      total.totalFxProfitKRW
    );
  }


  if (realizedProfit) {

    realizedProfit.textContent =
      `${total.totalRealizedKRW >= 0 ? "+" : ""}${formatKRW(total.totalRealizedKRW)}`;


    setColor(
      realizedProfit,
      total.totalRealizedKRW
    );
  }
updateAllocation();
}

// =========================
// 자산 구성
// =========================

function updateAllocation() {

  const allocationList =
    document.getElementById("allocation-list");

  const donut =
    document.querySelector(".allocation-donut");

  const allocationTotal =
    document.getElementById("allocation-total");

  if (!allocationList || !donut) return;


  const stocks = [];

  let totalValueKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    const value =
      Number(stock.marketValueKRW) || 0;

    if (value > 0) {

      stocks.push({
        symbol,
        value
      });

      totalValueKRW += value;
    }

  });


  allocationList.innerHTML = "";


  if (allocationTotal) {

    allocationTotal.textContent =
      totalValueKRW > 0
        ? formatKRW(totalValueKRW)
        : "--";
  }


  if (totalValueKRW <= 0) {

    donut.style.background =
      "conic-gradient(#333 0deg 360deg)";

    return;
  }


  // 큰 평가금 순서
  stocks.sort(
    (a, b) => b.value - a.value
  );


  const colors = [
    "#5B8DEF",
    "#8B5CF6",
    "#14B8A6",
    "#F59E0B",
    "#EC4899",
    "#22C55E"
  ];


  let currentDegree = 0;

  const gradients = [];


  stocks.forEach((stock, index) => {

    const percent =
      (stock.value / totalValueKRW) * 100;

    const degree =
      (percent / 100) * 360;

    const color =
      colors[index % colors.length];


    gradients.push(
      `${color} ${currentDegree}deg ${currentDegree + degree}deg`
    );


    currentDegree += degree;


    const item =
      document.createElement("div");

    item.className =
      "allocation-item";


    item.innerHTML = `
      <div class="allocation-name">
        <span
          class="allocation-dot"
          style="background:${color}"
        ></span>

        <span>${stock.symbol}</span>

        <span class="allocation-value">
          ${formatKRW(stock.value)}
        </span>
      </div>

      <div class="allocation-percent">
        ${percent.toFixed(1)}%
      </div>
    `;


    allocationList.appendChild(item);

  });


  donut.style.background =
    `conic-gradient(${gradients.join(", ")})`;
}

/* =========================
   일간수익
========================= */

function getTodayTradeFlows() {

  const today =
    getDateKey();

  let buyKRW = 0;

  let sellKRW = 0;

  let buyUSD = 0;

  let sellUSD = 0;


  symbols.forEach(symbol => {

    const trades =
      getTrades(symbol);


    trades.forEach(trade => {

      if (
        !trade.date
      ) {
        return;
      }


      const tradeDate =
        getDateKey(
          new Date(
            trade.date
          )
        );


      if (
        tradeDate !== today
      ) {
        return;
      }


      const q =
        Number(trade.shares);

      const p =
        Number(trade.price);

      const r =
        Number(trade.exchangeRate);


      if (
        !Number.isFinite(q) ||
        !Number.isFinite(p)
      ) {
        return;
      }


      const usd =
        q * p;

      const krw =
        usd *
        (
          Number.isFinite(r) &&
          r > 0
            ? r
            : usdKrw
        );


      if (
        trade.type === "buy"
      ) {

        buyUSD += usd;

        buyKRW += krw;

      } else if (
        trade.type === "sell"
      ) {

        sellUSD += usd;

        sellKRW += krw;
      }

    });

  });


  return {
    buyKRW,
    sellKRW,
    buyUSD,
    sellUSD
  };
}


function updateDailyProfit() {

  const total =
    calculateTotal();


  const records =
    getDailyRecords();


  const today =
    getDateKey();


  const yesterday =
    getYesterdayKey();


  /*
   * 첫 실행일에는 기준점 생성.
   */

  if (
    !records[yesterday] &&
    !records[today]
  ) {

    records[today] = {

      valueKRW:
        total.totalValueKRW,

      valueUSD:
        usdKrw > 0
          ? total.totalValueKRW /
            usdKrw
          : 0,

      timestamp:
        Date.now()
    };


    saveDailyRecords(
      records
    );

    showDailyProfit(
      0,
      0,
      0
    );

    return;
  }


  /*
   * 전일 기록을 기준으로 계산
   */

  const previous =
    records[yesterday];


  if (!previous) {

    if (
      !records[today]
    ) {

      records[today] = {

        valueKRW:
          total.totalValueKRW,

        valueUSD:
          usdKrw > 0
            ? total.totalValueKRW /
              usdKrw
            : 0,

        timestamp:
          Date.now()
      };

      saveDailyRecords(
        records
      );
    }


    showDailyProfit(
      0,
      0,
      0
    );

    return;
  }


  const flows =
    getTodayTradeFlows();


  /*
   * 일간 손익
   *
   * 현재 평가금
   * + 오늘 매도금
   * - 전일 평가금
   * - 오늘 매수금
   */

  const dailyKRW =
    total.totalValueKRW +
    flows.sellKRW -
    previous.valueKRW -
    flows.buyKRW;


  const currentUSD =
    usdKrw > 0
      ? total.totalValueKRW /
        usdKrw
      : 0;


  const dailyUSD =
    currentUSD +
    flows.sellUSD -
    previous.valueUSD -
    flows.buyUSD;


  const dailyRate =
    previous.valueKRW > 0
      ? (
          dailyKRW /
          previous.valueKRW
        ) * 100
      : 0;


  showDailyProfit(
    dailyKRW,
    dailyUSD,
    dailyRate
  );


  /*
   * 오늘 기록 업데이트
   */

  records[today] = {

    valueKRW:
      total.totalValueKRW,

    valueUSD:
      currentUSD,

    timestamp:
      Date.now()
  };


  saveDailyRecords(
    records
  );


  const dateElement =
    document.getElementById(
      "daily-date"
    );


  if (dateElement) {

    dateElement.textContent =
      today;
  }
}


function showDailyProfit(
  krw,
  usd,
  rate
) {

  const krwElement =
    document.getElementById(
      "daily-profit-krw"
    );

  const usdElement =
    document.getElementById(
      "daily-profit-usd"
    );

  const rateElement =
    document.getElementById(
      "daily-profit-rate"
    );


  if (krwElement) {

    krwElement.textContent =
      `${krw >= 0 ? "+" : ""}${formatKRW(krw)}`;

    setColor(
      krwElement,
      krw
    );
  }


  if (usdElement) {

    usdElement.textContent =
      `(${usd >= 0 ? "+" : ""}${formatUSD(usd)})`;

    setColor(
      usdElement,
      usd
    );
  }


  if (rateElement) {

    rateElement.textContent =
      formatPercent(rate);

    setColor(
      rateElement,
      rate
    );
  }
}


/* =========================
   환율
========================= */

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


/* =========================
   상세
========================= */

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


  updateDetail(
    symbol
  );
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

  const fxProfit =
    document.getElementById(
      "detail-fx-profit"
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
    `${stock.shares.toLocaleString(
      "ko-KR"
    )}주`;


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


  setColor(
    evaluation,
    stock.evaluationProfitKRW
  );


  fxProfit.textContent =
    stock.shares > 0
      ? `${stock.fxProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.fxProfitKRW)}`
      : "--";


  setColor(
    fxProfit,
    stock.fxProfitKRW
  );


  realized.textContent =
    `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;


  setColor(
    realized,
    stock.realizedKRW
  );


  const returnRate =
    stock.costKRW > 0
      ? (
          stock.evaluationProfitKRW /
          stock.costKRW
        ) * 100
      : 0;


  totalProfit.textContent =
    stock.costKRW > 0
      ? formatPercent(
          returnRate
        )
      : "--";


  setColor(
    totalProfit,
    returnRate
  );
}


/* =========================
   뒤로
========================= */

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


/* =========================
   거래 버튼
========================= */

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


/* =========================
   거래창
========================= */

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


  /*
   * 현재 환율 자동 입력
   * 필요하면 사용자가 수정 가능
   */

  exchangeRateInput.value =
    usdKrw > 0
      ? usdKrw
      : "";


  document.getElementById(
    "trade-shares"
  ).value =
    "";
}


/* =========================
   거래 저장
========================= */

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
    Number(
      sharesInput.value
    );

  const price =
    Number(
      priceInput.value
    );

  const exchangeRate =
    Number(
      exchangeRateInput.value
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


  /* 매도 가능 수량 */

  if (
    tradeType === "sell"
  ) {

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


/* =========================
   API
========================= */

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


    /*
     * 기존 가격 저장
     */

    previousPrices =
      {
        ...prices
      };


    previousUsdKrw =
      usdKrw;


    /* 환율 */

    if (
      Number.isFinite(
        Number(
          data.USD_KRW
        )
      )
    ) {

      usdKrw =
        Number(
          data.USD_KRW
        );

      updateExchangeRate();
    }


    /* 주가 */

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


    /* 시장 */

    updateMarket(
      data
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


/* =========================
   시장 업데이트
========================= */

function updateMarket(data) {

  const marketMap = {

    kospi:
      data.KOSPI,

    kosdaq:
      data.KOSDAQ,

    sp500:
      data.SP500,

    nasdaq:
      data.NASDAQ

  };


  Object.entries(
    marketMap
  ).forEach(
    ([id, value]) => {

      const element =
        document.getElementById(
          id
        );


      if (!element) {
        return;
      }


      const number =
        Number(value);


      element.textContent =
        Number.isFinite(number) &&
        number > 0
          ? number.toLocaleString(
              "ko-KR",
              {
                maximumFractionDigits:
                  2
              }
            )
          : "--";
    }
  );
}


/* =========================
   이벤트
========================= */

function setupEvents() {

  document
    .querySelectorAll(
      ".stock-card"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            const symbol =
              card.dataset.symbol;

            openDetail(
              symbol
            );
          }
        );
      }
    );


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


/* =========================
   시작
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    setupDailyProfit();

    loadQuotes();

    setInterval(
      loadQuotes,
      60000
    );

  }
);