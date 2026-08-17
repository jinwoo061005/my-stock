const API_URL = "/api/quote";


/* ======================================================
   종목
====================================================== */

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

let editingTradeIndex = null;
let editingDailyIndex = null;


/* ======================================================
   숫자
====================================================== */

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


/* ======================================================
   날짜
====================================================== */

function todayString() {

  const d = new Date();

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join("-");
}


function formatDate(date) {

  if (!date) return "--";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return String(date);
  }

  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")
  ].join(".");
}


/* ======================================================
   저장 데이터
   ★ 기존 데이터 절대 초기화하지 않음
====================================================== */

function readJSON(keys, fallback) {

  for (const key of keys) {

    const value =
      localStorage.getItem(key);

    if (
      value !== null &&
      value !== ""
    ) {

      try {
        return JSON.parse(value);
      } catch {}
    }
  }

  return fallback;
}


/*
 * 기존에 사용하던 저장 데이터를 우선적으로 찾음.
 * 없는 경우에만 빈 배열/객체 사용.
 */

let trades =
  readJSON(
    [
      "trades",
      "tradeHistory",
      "stockTrades",
      "transactions"
    ],
    []
  );


let dailyProfits =
  readJSON(
    [
      "dailyProfits",
      "dailyProfitRecords",
      "dailyRecords"
    ],
    []
  );


/* ======================================================
   기존 보유수량 저장값
   ★ 새 holdings 객체로 덮어쓰지 않음
====================================================== */

function getSavedHolding(symbol) {

  const possibleKeys = [

    `holding_${symbol}`,
    `${symbol}_holding`,
    `${symbol}_shares`,
    `shares_${symbol}`

  ];


  for (const key of possibleKeys) {

    const value =
      localStorage.getItem(key);

    if (
      value !== null &&
      value !== ""
    ) {

      const n = Number(value);

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }


  /*
   * 기존 거래기록으로부터 계산
   */

  if (Array.isArray(trades)) {

    let shares = 0;

    trades.forEach(trade => {

      if (
        trade.symbol !== symbol
      ) {
        return;
      }


      const quantity =
        num(
          trade.shares ??
          trade.quantity ??
          trade.qty
        );


      const type =
        String(
          trade.type || ""
        ).toLowerCase();


      if (
        type === "buy" ||
        type === "매수"
      ) {

        shares += quantity;

      } else if (
        type === "sell" ||
        type === "매도"
      ) {

        shares -= quantity;
      }

    });


    return Math.max(
      0,
      shares
    );
  }


  return 0;
}


/* ======================================================
   보유주식
   ★ 기존 저장값에서 읽음
====================================================== */

const holdings = {};


symbols.forEach(symbol => {

  holdings[symbol] = {
    shares:
      getSavedHolding(symbol),

    averageBuy:
      getSavedAverageBuy(symbol),

    exchangeRate:
      getSavedExchangeRate(symbol)
  };

});


function getHolding(symbol) {

  return holdings[symbol] || {
    shares: 0,
    averageBuy: 0,
    exchangeRate: 0
  };
}


/* ======================================================
   평단
====================================================== */

function getSavedAverageBuy(symbol) {

  const keys = [

    `${symbol}_averageBuy`,
    `${symbol}_avgBuy`,
    `averageBuy_${symbol}`,
    `avgBuy_${symbol}`

  ];


  for (const key of keys) {

    const value =
      localStorage.getItem(key);

    if (
      value !== null &&
      value !== ""
    ) {

      const n = Number(value);

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }


  /*
   * 거래기록의 기존 평단값 사용
   */

  if (Array.isArray(trades)) {

    const buyTrades =
      trades.filter(trade =>
        trade.symbol === symbol &&
        (
          trade.type === "buy" ||
          trade.type === "매수"
        )
      );


    if (buyTrades.length) {

      const last =
        buyTrades[
          buyTrades.length - 1
        ];


      return num(
        last.averageBuy ??
        last.avgPrice ??
        last.price
      );
    }
  }


  return 0;
}


/* ======================================================
   매수 당시 환율
====================================================== */

function getSavedExchangeRate(symbol) {

  const keys = [

    `${symbol}_exchangeRate`,
    `${symbol}_fxRate`,
    `exchangeRate_${symbol}`,
    `fxRate_${symbol}`

  ];


  for (const key of keys) {

    const value =
      localStorage.getItem(key);

    if (
      value !== null &&
      value !== ""
    ) {

      const n = Number(value);

      if (Number.isFinite(n)) {
        return n;
      }
    }
  }


  return 0;
}


/* ======================================================
   저장
====================================================== */

function saveData() {

  /*
   * 기존 저장 데이터는 유지.
   * 수정된 거래/일간수익만 저장.
   */

  localStorage.setItem(
    "trades",
    JSON.stringify(trades)
  );

  localStorage.setItem(
    "dailyProfits",
    JSON.stringify(dailyProfits)
  );
}


/* ======================================================
   포맷
====================================================== */

function formatKRW(value) {

  const n = num(value);

  return (
    (n > 0 ? "+" : n < 0 ? "-" : "") +
    "₩" +
    Math.abs(n).toLocaleString(
      "ko-KR",
      {
        maximumFractionDigits: 0
      }
    )
  );
}


function formatUSD(value) {

  const n = num(value);

  return (
    (n > 0 ? "+" : n < 0 ? "-" : "") +
    "$" +
    Math.abs(n).toFixed(2)
  );
}


function formatRate(value) {

  const n = num(value);

  return (
    (n > 0 ? "+" : "") +
    n.toFixed(2) +
    "%"
  );
}


/* ======================================================
   수익 색상
====================================================== */

function applyProfitColor(
  element,
  value
) {

  if (!element) return;

  element.classList.remove(
    "profit-up",
    "profit-down",
    "profit-zero"
  );


  if (value > 0) {

    element.classList.add(
      "profit-up"
    );

  } else if (value < 0) {

    element.classList.add(
      "profit-down"
    );

  } else {

    element.classList.add(
      "profit-zero"
    );
  }
}


/* ======================================================
   API
====================================================== */

async function loadPrices() {

  try {

    const response =
      await fetch(API_URL);

    if (!response.ok) {
      throw new Error(
        "API 오류"
      );
    }


    const data =
      await response.json();


    prices = data || {};


    usdKrw =
      num(
        prices.USD_KRW ??
        prices.USDKRW ??
        prices.usdkrw
      );


    updateAll();


  } catch (error) {

    console.error(
      "가격 불러오기 실패:",
      error
    );
  }
}


/* ======================================================
   전체 업데이트
====================================================== */

function updateAll() {

  symbols.forEach(
    updateStock
  );

  updateTotal();
  updateMarket();
}


/* ======================================================
   종목
====================================================== */

function updateStock(symbol) {

  const holding =
    getHolding(symbol);


  const price =
    num(
      prices[symbol]
    );


  const shares =
    num(
      holding.shares
    );


  const priceElement =
    document.getElementById(
      `${symbol}-price`
    );


  const valueElement =
    document.getElementById(
      `${symbol}-value`
    );


  const sharesElement =
    document.getElementById(
      `${symbol}-shares-display`
    );


  const profitElement =
    document.getElementById(
      `${symbol}-profit`
    );


  if (sharesElement) {

    sharesElement.textContent =
      `${shares}주`;
  }


  if (priceElement) {

    priceElement.textContent =
      price
        ? `$${price.toFixed(2)}`
        : "--";
  }


  const value =
    price *
    shares *
    usdKrw;


  if (valueElement) {

    valueElement.textContent =
      value
        ? `₩${Math.round(
            value
          ).toLocaleString("ko-KR")}`
        : "--";
  }


  const averageBuy =
    num(
      holding.averageBuy
    );


  if (
    profitElement &&
    averageBuy > 0 &&
    price > 0
  ) {

    const rate =
      (
        (price - averageBuy) /
        averageBuy
      ) * 100;


    profitElement.textContent =
      formatRate(rate);


    applyProfitColor(
      profitElement,
      rate
    );
  }
}


/* ======================================================
   총 평가금
====================================================== */

function updateTotal() {

  let totalUSD = 0;
  let investedUSD = 0;

  let fxProfit = 0;


  symbols.forEach(symbol => {

    const holding =
      getHolding(symbol);


    const price =
      num(prices[symbol]);


    const shares =
      num(holding.shares);


    const averageBuy =
      num(holding.averageBuy);


    const exchangeRate =
      num(holding.exchangeRate);


    totalUSD +=
      price *
      shares;


    investedUSD +=
      averageBuy *
      shares;


    if (
      averageBuy > 0 &&
      exchangeRate > 0 &&
      usdKrw > 0
    ) {

      fxProfit +=
        averageBuy *
        shares *
        (
          usdKrw -
          exchangeRate
        );
    }
  });


  const totalKRW =
    totalUSD *
    usdKrw;


  const investedKRW =
    investedUSD *
    usdKrw;


  const evaluationProfit =
    totalKRW -
    investedKRW;


  const evaluationRate =
    investedKRW > 0
      ? evaluationProfit /
        investedKRW *
        100
      : 0;


  const totalValue =
    document.getElementById(
      "total-value"
    );


  if (totalValue) {

    totalValue.textContent =
      `₩${Math.round(
        totalKRW
      ).toLocaleString("ko-KR")}`;
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );


  if (totalDollar) {

    totalDollar.textContent =
      `$${totalUSD.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`;
  }


  /* 평가수익 */

  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    totalProfit.innerHTML =
      `${formatKRW(
        evaluationProfit
      )}
      <span class="profit-rate">
        (${formatRate(
          evaluationRate
        )})
      </span>`;


    applyProfitColor(
      totalProfit,
      evaluationProfit
    );
  }


  /* 환차익 */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );


  if (fxElement) {

    fxElement.textContent =
      formatKRW(fxProfit);


    applyProfitColor(
      fxElement,
      fxProfit
    );
  }


  /* 판매수익 */

  const salesProfit =
    trades
      .filter(trade =>
        trade.type === "sell" ||
        trade.type === "매도"
      )
      .reduce(
        (sum, trade) =>
          sum +
          num(
            trade.profitKRW ??
            trade.profit ??
            0
          ),
        0
      );


  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );


  if (realizedElement) {

    realizedElement.textContent =
      formatKRW(
        salesProfit
      );


    applyProfitColor(
      realizedElement,
      salesProfit
    );
  }


  updateTodayProfit();
}


/* ======================================================
   시장
====================================================== */

function updateMarket() {

  const values = {
    usdkrw: usdKrw,
    sp500: prices.SP500,
    nasdaq: prices.NASDAQ,
    kospi: prices.KOSPI,
    kosdaq: prices.KOSDAQ
  };


  Object.entries(values)
    .forEach(
      ([id, value]) => {

        const element =
          document.getElementById(id);

        if (!element) return;

        element.textContent =
          value !== undefined &&
          value !== null &&
          value !== ""
            ? Number(value)
                .toLocaleString(
                  "ko-KR",
                  {
                    maximumFractionDigits: 2
                  }
                )
            : "--";
      }
    );
}


/* ======================================================
   오늘 일간수익
====================================================== */

function updateTodayProfit() {

  const today =
    todayString();


  const record =
    dailyProfits.find(
      item =>
        item.date === today
    );


  const krw =
    record
      ? num(record.krw)
      : 0;


  const usd =
    record
      ? num(record.usd)
      : 0;


  const rate =
    record
      ? num(record.rate)
      : 0;


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
      formatKRW(krw);

    applyProfitColor(
      krwElement,
      krw
    );
  }


  if (usdElement) {

    usdElement.textContent =
      formatUSD(usd);

    applyProfitColor(
      usdElement,
      usd
    );
  }


  if (rateElement) {

    rateElement.textContent =
      formatRate(rate);

    applyProfitColor(
      rateElement,
      rate
    );
  }
}


/* ======================================================
   일간수익 새 창
====================================================== */

function openDailyScreen() {

  const main =
    document.getElementById(
      "main-screen"
    );


  const detail =
    document.getElementById(
      "detail-screen"
    );


  const daily =
    document.getElementById(
      "daily-screen"
    );


  if (main) {
    main.style.display =
      "none";
  }


  if (detail) {
    detail.style.display =
      "none";
  }


  if (daily) {

    daily.style.display =
      "block";

    renderDailyProfits();
  }
}


function closeDailyScreen() {

  const daily =
    document.getElementById(
      "daily-screen"
    );


  const main =
    document.getElementById(
      "main-screen"
    );


  if (daily) {
    daily.style.display =
      "none";
  }


  if (main) {
    main.style.display =
      "block";
  }
}


/* ======================================================
   최근 30일
====================================================== */

function getLast30Dates() {

  const result = [];

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  for (
    let i = 0;
    i < 30;
    i++
  ) {

    const d =
      new Date(today);

    d.setDate(
      today.getDate() - i
    );


    result.push(
      todayStringFromDate(d)
    );
  }


  return result;
}


function todayStringFromDate(d) {

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


/* ======================================================
   일간수익 렌더링
====================================================== */

function renderDailyProfits() {

  const container =
    document.getElementById(
      "daily-record-list"
    );


  if (!container) return;


  container.innerHTML = "";


  const dates =
    getLast30Dates();


  /*
   * 오래된 날짜부터 누적 계산
   */

  let cumulative = 0;

  const cumulativeMap = {};


  [...dates]
    .reverse()
    .forEach(date => {

      const record =
        dailyProfits.find(
          item =>
            item.date === date
        );


      const rate =
        record
          ? num(record.rate)
          : 0;


      cumulative += rate;

      cumulativeMap[date] =
        cumulative;
    });


  dates.forEach(date => {

    const index =
      dailyProfits.findIndex(
        item =>
          item.date === date
      );


    const record =
      index >= 0
        ? dailyProfits[index]
        : {
            date,
            krw: 0,
            usd: 0,
            rate: 0
          };


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "daily-record";


    row.innerHTML = `
      <div class="daily-record-date">
        ${formatDate(record.date)}
      </div>

      <div class="daily-record-values">

        <span class="daily-krw">
          ${formatKRW(record.krw)}
        </span>

        <span class="daily-usd">
          ${formatUSD(record.usd)}
        </span>

        <span class="daily-rate">
          ${formatRate(record.rate)}
          <small>
            (${formatRate(
              cumulativeMap[date]
            )})
          </small>
        </span>

      </div>

      ${
        index >= 0
          ? `
            <button
              type="button"
              class="daily-edit-button"
              data-index="${index}"
            >
              수정
            </button>
          `
          : ""
      }
    `;


    applyProfitColor(
      row.querySelector(
        ".daily-krw"
      ),
      num(record.krw)
    );


    applyProfitColor(
      row.querySelector(
        ".daily-usd"
      ),
      num(record.usd)
    );


    applyProfitColor(
      row.querySelector(
        ".daily-rate"
      ),
      num(record.rate)
    );


    container.appendChild(row);
  });
}


/* ======================================================
   일간수익 수정
====================================================== */

function editDailyProfit(index) {

  if (
    index < 0 ||
    !dailyProfits[index]
  ) {
    return;
  }


  const record =
    dailyProfits[index];


  const date =
    prompt(
      "날짜 (YYYY-MM-DD)",
      record.date
    );


  if (date === null) return;


  const krw =
    prompt(
      "원화 수익",
      record.krw
    );


  if (krw === null) return;


  const usd =
    prompt(
      "달러 수익",
      record.usd
    );


  if (usd === null) return;


  const rate =
    prompt(
      "일간 수익률 (%)",
      record.rate
    );


  if (rate === null) return;


  dailyProfits[index] = {
    ...record,
    date,
    krw: num(krw),
    usd: num(usd),
    rate: num(rate)
  };


  saveData();

  renderDailyProfits();

  updateTodayProfit();
}


/* ======================================================
   터치 / 클릭
   ★ 모바일에서 반드시 작동하도록 이벤트 위임
====================================================== */

document.addEventListener(
  "click",
  function(event) {

    const dailyButton =
      event.target.closest(
        "#daily-profit-button"
      );


    const dailyKRW =
      event.target.closest(
        "#daily-profit-krw"
      );


    const dailyUSD =
      event.target.closest(
        "#daily-profit-usd"
      );


    const dailyRate =
      event.target.closest(
        "#daily-profit-rate"
      );


    if (
      dailyButton ||
      dailyKRW ||
      dailyUSD ||
      dailyRate
    ) {

      event.preventDefault();

      openDailyScreen();

      return;
    }


    const back =
      event.target.closest(
        "#daily-back-button"
      );


    if (back) {

      event.preventDefault();

      closeDailyScreen();

      return;
    }


    const edit =
      event.target.closest(
        ".daily-edit-button"
      );


    if (edit) {

      event.preventDefault();

      editDailyProfit(
        Number(
          edit.dataset.index
        )
      );

      return;
    }


    /*
     * 종목 카드 터치
     */

    const card =
      event.target.closest(
        ".stock-card"
      );


    if (
      card &&
      !event.target.closest(
        "button,input,select,textarea"
      )
    ) {

      const symbol =
        card.dataset.symbol;


      if (symbol) {

        openStockDetail(
          symbol
        );
      }
    }

  },
  false
);


/* ======================================================
   종목 상세
====================================================== */

function openStockDetail(symbol) {

  selectedSymbol =
    symbol;


  const main =
    document.getElementById(
      "main-screen"
    );


  const detail =
    document.getElementById(
      "detail-screen"
    );


  if (main) {
    main.style.display =
      "none";
  }


  if (detail) {
    detail.style.display =
      "block";
  }


  const holding =
    getHolding(symbol);


  const symbolElement =
    document.getElementById(
      "detail-symbol"
    );


  const sharesElement =
    document.getElementById(
      "detail-shares"
    );


  const averageElement =
    document.getElementById(
      "detail-average-buy"
    );


  if (symbolElement) {
    symbolElement.textContent =
      symbol;
  }


  if (sharesElement) {
    sharesElement.textContent =
      `${holding.shares}주`;
  }


  if (averageElement) {

    averageElement.textContent =
      holding.averageBuy
        ? `$${num(
            holding.averageBuy
          ).toFixed(2)}`
        : "--";
  }
}


function closeStockDetail() {

  const detail =
    document.getElementById(
      "detail-screen"
    );


  const main =
    document.getElementById(
      "main-screen"
    );


  if (detail) {
    detail.style.display =
      "none";
  }


  if (main) {
    main.style.display =
      "block";
  }
}


/* ======================================================
   상세 뒤로가기
====================================================== */

document.addEventListener(
  "click",
  function(event) {

    const button =
      event.target.closest(
        "#back-button"
      );


    if (button) {

      event.preventDefault();

      closeStockDetail();
    }

  }
);


/* ======================================================
   초기 실행
====================================================== */

loadPrices();


setInterval(
  loadPrices,
  60 * 1000
);