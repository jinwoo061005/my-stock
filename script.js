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
   기존 저장 데이터
   ★ 삭제/초기화 절대 하지 않음
====================================================== */

function loadJSON(keys, fallback) {

  for (const key of keys) {

    const saved =
      localStorage.getItem(key);

    if (
      saved !== null &&
      saved !== ""
    ) {

      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn(
          "저장 데이터 읽기 실패:",
          key
        );
      }
    }
  }

  return fallback;
}


/*
 * 기존 대화에서 사용하던 저장명들을 모두 확인
 */

let trades = loadJSON(
  [
    "trades",
    "tradeHistory",
    "stockTrades",
    "transactions"
  ],
  []
);


let dailyProfits = loadJSON(
  [
    "dailyProfits",
    "dailyProfitRecords",
    "dailyRecords"
  ],
  []
);


/* ======================================================
   기존 보유수량 읽기
   ★ 여기서 새로운 수량을 지정하지 않음
====================================================== */

function getStoredShares(symbol) {

  const keys = [

    `${symbol}_shares`,
    `shares_${symbol}`,
    `${symbol}-shares`,
    `holding_${symbol}`,
    `${symbol}_holding`

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
   * localStorage에 개별 수량이 없다면
   * 기존 매수/매도 기록으로 계산
   */

  if (Array.isArray(trades)) {

    let shares = 0;


    trades.forEach(trade => {

      if (
        String(trade.symbol)
          .toUpperCase() !==
        symbol.toUpperCase()
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
   기존 평단 읽기
====================================================== */

function getStoredAverageBuy(symbol) {

  const keys = [

    `${symbol}_averageBuy`,
    `${symbol}_avgBuy`,
    `averageBuy_${symbol}`,
    `avgBuy_${symbol}`,
    `${symbol}_price`

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
   * 기존 거래기록에서 마지막 매수 평단 탐색
   */

  if (Array.isArray(trades)) {

    const buys =
      trades.filter(trade => {

        const tradeSymbol =
          String(
            trade.symbol || ""
          ).toUpperCase();

        const type =
          String(
            trade.type || ""
          ).toLowerCase();

        return (
          tradeSymbol ===
          symbol.toUpperCase()
          &&
          (
            type === "buy" ||
            type === "매수"
          )
        );
      });


    if (buys.length) {

      const last =
        buys[buys.length - 1];


      return num(
        last.averageBuy ??
        last.avgPrice ??
        last.buyPrice ??
        last.price
      );
    }
  }


  return 0;
}


/* ======================================================
   기존 매수 환율
====================================================== */

function getStoredExchangeRate(symbol) {

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
   보유 데이터
   ★ 수량을 여기서 지정하지 않음
====================================================== */

function getHolding(symbol) {

  return {

    shares:
      getStoredShares(symbol),

    averageBuy:
      getStoredAverageBuy(symbol),

    exchangeRate:
      getStoredExchangeRate(symbol)

  };
}


/* ======================================================
   저장
   ★ 기존 데이터 삭제하지 않음
====================================================== */

function saveTrades() {

  localStorage.setItem(
    "trades",
    JSON.stringify(trades)
  );
}


function saveDailyProfits() {

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

  const sign =
    n > 0
      ? "+"
      : n < 0
        ? "-"
        : "";

  return (
    sign +
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

  const sign =
    n > 0
      ? "+"
      : n < 0
        ? "-"
        : "";

  return (
    sign +
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

function profitColor(
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
        `HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    prices = data || {};


    usdKrw =
      num(
        prices.USD_KRW ??
        prices.USDKRW ??
        prices.usdkrw ??
        prices["USD/KRW"]
      );


    updateStocks();

    updateTotal();

    updateMarket();

    updateTodayProfit();


  } catch (error) {

    console.error(
      "주가 API 오류:",
      error
    );
  }
}


/* ======================================================
   개별 주식 업데이트
====================================================== */

function updateStocks() {

  symbols.forEach(symbol => {

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


    /*
     * 보유주식
     */

    const sharesElements = [

      document.getElementById(
        `${symbol}-shares`
      ),

      document.getElementById(
        `${symbol}-shares-display`
      )

    ];


    sharesElements.forEach(
      element => {

        if (element) {

          element.textContent =
            `${shares}주`;
        }

      }
    );


    /*
     * 현재가격
     */

    const priceElement =
      document.getElementById(
        `${symbol}-price`
      );


    if (priceElement) {

      priceElement.textContent =
        price
          ? `$${price.toFixed(2)}`
          : "--";
    }


    /*
     * 평가금
     */

    const valueElement =
      document.getElementById(
        `${symbol}-value`
      );


    const valueKRW =
      price *
      shares *
      usdKrw;


    if (valueElement) {

      valueElement.textContent =
        valueKRW
          ? `₩${Math.round(
              valueKRW
            ).toLocaleString("ko-KR")}`
          : "₩0";
    }


    /*
     * 평가수익률
     */

    const profitElement =
      document.getElementById(
        `${symbol}-profit`
      );


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
        ) *
        100;


      profitElement.textContent =
        formatRate(rate);


      profitColor(
        profitElement,
        rate
      );
    }

  });
}


/* ======================================================
   총 평가금 / 평가수익
====================================================== */

function updateTotal() {

  let totalUSD = 0;

  let investedUSD = 0;

  let fxProfit = 0;


  symbols.forEach(symbol => {

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


    const averageBuy =
      num(
        holding.averageBuy
      );


    const exchangeRate =
      num(
        holding.exchangeRate
      );


    totalUSD +=
      price *
      shares;


    investedUSD +=
      averageBuy *
      shares;


    /*
     * 환차익
     */

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


  /*
   * 현재 평가금
   */

  const totalKRW =
    totalUSD *
    usdKrw;


  /*
   * 매수 당시 원화 투자금
   */

  let investedKRW = 0;


  symbols.forEach(symbol => {

    const holding =
      getHolding(symbol);


    const shares =
      num(
        holding.shares
      );


    const averageBuy =
      num(
        holding.averageBuy
      );


    const exchangeRate =
      num(
        holding.exchangeRate
      );


    if (
      averageBuy > 0
    ) {

      investedKRW +=
        averageBuy *
        shares *
        (
          exchangeRate ||
          usdKrw
        );
    }

  });


  /*
   * 평가금
   */

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


  /*
   * 달러 평가금
   */

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


  /*
   * 현재 보유주식 평가수익
   *
   * ★ 판매수익 절대 포함하지 않음
   */

  const evaluationProfit =
    totalKRW -
    investedKRW;


  const evaluationRate =
    investedKRW > 0
      ? (
          evaluationProfit /
          investedKRW
        ) *
        100
      : 0;


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


    profitColor(
      totalProfit,
      evaluationProfit
    );
  }


  /*
   * 환차익
   */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );


  if (fxElement) {

    fxElement.textContent =
      formatKRW(
        fxProfit
      );


    profitColor(
      fxElement,
      fxProfit
    );
  }


  /*
   * 판매수익
   *
   * ★ 현재 보유 평가수익과 분리
   */

  const realizedProfit =
    trades
      .filter(trade => {

        const type =
          String(
            trade.type || ""
          ).toLowerCase();

        return (
          type === "sell" ||
          type === "매도"
        );
      })
      .reduce(
        (sum, trade) => {

          return (
            sum +
            num(
              trade.profitKRW ??
              trade.realizedProfitKRW ??
              trade.profit ??
              0
            )
          );

        },
        0
      );


  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );


  if (realizedElement) {

    realizedElement.textContent =
      formatKRW(
        realizedProfit
      );


    profitColor(
      realizedElement,
      realizedProfit
    );
  }
}


/* ======================================================
   시장
====================================================== */

function updateMarket() {

  const map = {

    usdkrw: usdKrw,

    sp500:
      prices.SP500 ??
      prices["S&P500"],

    nasdaq:
      prices.NASDAQ ??
      prices.NASDAQ100,

    kospi:
      prices.KOSPI,

    kosdaq:
      prices.KOSDAQ

  };


  Object.entries(map)
    .forEach(
      ([id, value]) => {

        const element =
          document.getElementById(id);


        if (!element) return;


        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {

          element.textContent =
            "--";

          return;
        }


        element.textContent =
          Number(value)
            .toLocaleString(
              "ko-KR",
              {
                maximumFractionDigits: 2
              }
            );
      }
    );
}


/* ======================================================
   오늘 일간수익
====================================================== */

function getDailyRecord(date) {

  return dailyProfits.find(
    record =>
      record.date === date
  );
}


function updateTodayProfit() {

  const record =
    getDailyRecord(
      todayString()
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

    profitColor(
      krwElement,
      krw
    );
  }


  if (usdElement) {

    usdElement.textContent =
      formatUSD(usd);

    profitColor(
      usdElement,
      usd
    );
  }


  if (rateElement) {

    rateElement.textContent =
      formatRate(rate);

    profitColor(
      rateElement,
      rate
    );
  }
}


/* ======================================================
   일간수익 별도 화면
====================================================== */

function openDailyScreen() {

  const main =
    document.getElementById(
      "main-screen"
    );


  const daily =
    document.getElementById(
      "daily-screen"
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
   최근 30일 날짜
====================================================== */

function getDateStringFromDate(d) {

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


function getLast30Days() {

  const dates = [];

  const now =
    new Date();


  for (
    let i = 0;
    i < 30;
    i++
  ) {

    const d =
      new Date(now);


    d.setDate(
      now.getDate() - i
    );


    dates.push(
      getDateStringFromDate(d)
    );
  }


  return dates;
}


/* ======================================================
   일간수익 화면
   ★ 오늘 포함 30일
   ★ 괄호 = 일간수익률 누적합
====================================================== */

function renderDailyProfits() {

  const container =
    document.getElementById(
      "daily-record-list"
    );


  if (!container) return;


  container.innerHTML = "";


  const dates =
    getLast30Days();


  /*
   * 누적합은 과거 → 오늘
   */

  let cumulativeRate = 0;

  const cumulative = {};


  [...dates]
    .reverse()
    .forEach(date => {

      const record =
        getDailyRecord(date);


      const rate =
        record
          ? num(record.rate)
          : 0;


      cumulativeRate +=
        rate;


      cumulative[date] =
        cumulativeRate;
    });


  dates.forEach(date => {

    const record =
      getDailyRecord(date);


    /*
     * 기록이 없는 날도 표시
     */

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


    const index =
      record
        ? dailyProfits.indexOf(
            record
          )
        : -1;


    const row =
      document.createElement(
        "div"
      );


    row.className =
      "daily-record";


    row.innerHTML = `

      <div class="daily-record-date">
        ${formatDate(date)}
      </div>


      <div class="daily-record-values">

        <span class="daily-krw">
          ${formatKRW(krw)}
        </span>


        <span class="daily-usd">
          ${formatUSD(usd)}
        </span>


        <span class="daily-rate">

          ${formatRate(rate)}

          <small>
            (${formatRate(
              cumulative[date]
            )})
          </small>

        </span>

      </div>


      ${
        record
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


    profitColor(
      row.querySelector(
        ".daily-krw"
      ),
      krw
    );


    profitColor(
      row.querySelector(
        ".daily-usd"
      ),
      usd
    );


    profitColor(
      row.querySelector(
        ".daily-rate"
      ),
      rate
    );


    container.appendChild(
      row
    );
  });
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

    ...record,

    date: date,

    krw:
      num(krw),

    usd:
      num(usd),

    rate:
      num(rate)

  };


  saveDailyProfits();


  renderDailyProfits();

  updateTodayProfit();
}


/* ======================================================
   일간수익 터치
====================================================== */

document.addEventListener(
  "click",
  function(event) {

    const dailyArea =
      event.target.closest(
        "#daily-profit-krw, #daily-profit-usd, #daily-profit-rate, #daily-profit-button"
      );


    if (dailyArea) {

      event.preventDefault();

      openDailyScreen();

      return;
    }


    const backButton =
      event.target.closest(
        "#daily-back-button"
      );


    if (backButton) {

      event.preventDefault();

      closeDailyScreen();

      return;
    }


    const editButton =
      event.target.closest(
        ".daily-edit-button"
      );


    if (editButton) {

      event.preventDefault();


      editDailyProfit(
        Number(
          editButton.dataset.index
        )
      );

      return;
    }

  },
  false
);


/* ======================================================
   종목 터치
====================================================== */

document.addEventListener(
  "click",
  function(event) {

    const card =
      event.target.closest(
        ".stock-card"
      );


    if (!card) return;


    /*
     * 버튼/input을 누른 경우
     * 카드 클릭과 겹치지 않게 함
     */

    if (
      event.target.closest(
        "button"
      ) ||
      event.target.closest(
        "input"
      ) ||
      event.target.closest(
        "select"
      ) ||
      event.target.closest(
        "textarea"
      )
    ) {
      return;
    }


    const symbol =
      card.dataset.symbol;


    if (!symbol) return;


    openStockDetail(
      symbol
    );

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

  const main =
    document.getElementById(
      "main-screen"
    );


  const detail =
    document.getElementById(
      "detail-screen"
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

    const back =
      event.target.closest(
        "#back-button"
      );


    if (!back) return;


    event.preventDefault();

    closeStockDetail();

  }
);


/* ======================================================
   시작
====================================================== */

loadPrices();


/* 1분마다 갱신 */

setInterval(
  loadPrices,
  60000
);