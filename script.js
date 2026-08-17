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

  return Number.isFinite(n)
    ? n
    : 0;
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
====================================================== */

let holdings =
  JSON.parse(
    localStorage.getItem("holdings") || "{}"
  );

let trades =
  JSON.parse(
    localStorage.getItem("trades") || "[]"
  );

let dailyProfits =
  JSON.parse(
    localStorage.getItem("dailyProfits") || "[]"
  );


function saveData() {

  localStorage.setItem(
    "holdings",
    JSON.stringify(holdings)
  );

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
   보유수량
====================================================== */

function getHolding(symbol) {

  return holdings[symbol] || {
    shares: 0,
    averageBuy: 0,
    exchangeRate: 0
  };
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

    const data =
      await response.json();

    prices = data || {};

    usdKrw =
      num(
        prices.USD_KRW ||
        prices.USDKRW ||
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
   총 평가금
====================================================== */

function updateTotal() {

  let totalUSD = 0;
  let totalKRW = 0;

  let investedUSD = 0;
  let investedKRW = 0;

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
      price * shares;


    investedUSD +=
      averageBuy * shares;


    if (
      exchangeRate > 0 &&
      averageBuy > 0 &&
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


    const valueKRW =
      price *
      shares *
      usdKrw;

    totalKRW +=
      valueKRW;


    investedKRW +=
      averageBuy *
      shares *
      (
        exchangeRate ||
        usdKrw
      );

  });


  const totalValue =
    document.getElementById(
      "total-value"
    );

  const totalDollar =
    document.getElementById(
      "total-dollar"
    );


  if (totalValue) {

    totalValue.textContent =
      `₩${Math.round(
        totalKRW
      ).toLocaleString("ko-KR")}`;
  }


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


  /* ====================================================
     현재 보유주식 평가수익
     판매수익 제외
  ==================================================== */

  const evaluationProfit =
    totalKRW -
    investedKRW;


  const evaluationRate =
    investedKRW > 0
      ? (
          evaluationProfit /
          investedKRW
        ) * 100
      : 0;


  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    totalProfit.innerHTML = `
      ${formatKRW(evaluationProfit)}
      <span class="profit-rate">
        (${formatRate(evaluationRate)})
      </span>
    `;

    applyProfitColor(
      totalProfit,
      evaluationProfit
    );
  }


  /* ====================================================
     환차익
  ==================================================== */

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


  /* ====================================================
     판매수익
  ==================================================== */

  const salesProfit =
    trades
      .filter(
        trade =>
          trade.type === "sell"
      )
      .reduce(
        (sum, trade) =>
          sum +
          num(
            trade.profitKRW
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
   전체 화면 업데이트
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
    num(prices[symbol]);

  const shares =
    num(holding.shares);


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
        (
          price -
          averageBuy
        ) /
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
   시장
====================================================== */

function updateMarket() {

  const usd =
    document.getElementById(
      "usdkrw"
    );

  const sp500 =
    document.getElementById(
      "sp500"
    );

  const nasdaq =
    document.getElementById(
      "nasdaq"
    );

  const kospi =
    document.getElementById(
      "kospi"
    );

  const kosdaq =
    document.getElementById(
      "kosdaq"
    );


  if (usd) {

    usd.textContent =
      usdKrw
        ? `₩${usdKrw.toLocaleString(
            "ko-KR",
            {
              maximumFractionDigits: 2
            }
          )}`
        : "--";
  }


  if (sp500) {

    sp500.textContent =
      prices.SP500 ||
      "--";
  }


  if (nasdaq) {

    nasdaq.textContent =
      prices.NASDAQ ||
      "--";
  }


  if (kospi) {

    kospi.textContent =
      prices.KOSPI ||
      "--";
  }


  if (kosdaq) {

    kosdaq.textContent =
      prices.KOSDAQ ||
      "--";
  }
}


/* ======================================================
   포맷
====================================================== */

function formatKRW(value) {

  const n =
    num(value);

  return (
    (n > 0 ? "+" : "") +
    `₩${n.toLocaleString(
      "ko-KR",
      {
        maximumFractionDigits: 0
      }
    )}`
  );
}


function formatUSD(value) {

  const n =
    num(value);

  return (
    (n > 0 ? "+" : "") +
    `$${n.toFixed(2)}`
  );
}


function formatRate(value) {

  const n =
    num(value);

  return (
    (n > 0 ? "+" : "") +
    n.toFixed(2) +
    "%"
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
   일간수익 화면
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
   30일 일간수익
====================================================== */

function renderDailyProfits() {

  const container =
    document.getElementById(
      "daily-record-list"
    );

  if (!container) return;


  container.innerHTML = "";


  let cumulativeRate = 0;


  const records =
    [...dailyProfits]
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );


  const last30 =
    records.slice(-30);


  last30.forEach(
    record => {

      const rate =
        num(record.rate);

      cumulativeRate +=
        rate;


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
            ${formatRate(rate)}
            <small>
              (${formatRate(cumulativeRate)})
            </small>
          </span>

        </div>

        <button
          class="daily-edit-button"
          data-index="${dailyProfits.indexOf(record)}"
        >
          수정
        </button>
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
        rate
      );


      container.appendChild(
        row
      );
    }
  );


  container
    .querySelectorAll(
      ".daily-edit-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            editDailyProfit(
              num(
                button.dataset.index
              )
            );

          }
        );

      }
    );
}


/* ======================================================
   일간수익 수정
====================================================== */

function editDailyProfit(index) {

  const record =
    dailyProfits[index];

  if (!record) return;


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

    date,

    krw:
      num(krw),

    usd:
      num(usd),

    rate:
      num(rate)
  };


  saveData();

  renderDailyProfits();

  updateTodayProfit();
}


/* ======================================================
   일간수익 새 기록
====================================================== */

function addDailyProfit() {

  const date =
    prompt(
      "날짜 (YYYY-MM-DD)",
      todayString()
    );

  if (date === null) return;


  const krw =
    prompt(
      "원화 수익"
    );

  if (krw === null) return;


  const usd =
    prompt(
      "달러 수익"
    );

  if (usd === null) return;


  const rate =
    prompt(
      "일간 수익률 (%)"
    );

  if (rate === null) return;


  dailyProfits.push({

    date,

    krw:
      num(krw),

    usd:
      num(usd),

    rate:
      num(rate)
  });


  saveData();

  renderDailyProfits();

  updateTodayProfit();
}


/* ======================================================
   일간수익 화면 버튼
====================================================== */

document.addEventListener(
  "click",
  event => {

    if (
      event.target.closest(
        "#daily-profit-button"
      ) ||
      event.target.closest(
        "#daily-profit-krw"
      ) ||
      event.target.closest(
        "#daily-profit-usd"
      ) ||
      event.target.closest(
        "#daily-profit-rate"
      )
    ) {

      openDailyScreen();
    }


    if (
      event.target.closest(
        "#daily-back-button"
      )
    ) {

      closeDailyScreen();
    }


    if (
      event.target.closest(
        "#add-daily-button"
      )
    ) {

      addDailyProfit();
    }
  }
);


/* ======================================================
   초기 실행
====================================================== */

loadPrices();


/* 1분마다 갱신 */

setInterval(
  loadPrices,
  60 * 1000
);