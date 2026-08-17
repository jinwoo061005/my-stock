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


/* ==================================================
   거래내역
================================================== */

function getTrades(symbol) {

  const saved =
    localStorage.getItem(
      `${symbol}_trades`
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


function saveTrades(symbol, trades) {

  localStorage.setItem(
    `${symbol}_trades`,
    JSON.stringify(trades)
  );
}


/* ==================================================
   평단 직접 수정
================================================== */

function getManualAverage(symbol) {

  const saved =
    localStorage.getItem(
      `${symbol}_manual_average`
    );

  if (!saved) {
    return null;
  }

  const value =
    Number(saved);

  return Number.isFinite(value)
    ? value
    : null;
}


function saveManualAverage(symbol, value) {

  localStorage.setItem(
    `${symbol}_manual_average`,
    String(value)
  );
}


/* ==================================================
   종목 계산
================================================== */

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  let costKRW = 0;

  let realizedKRW = 0;

  let fxProfitKRW = 0;


  trades.forEach(trade => {

    const quantity =
      Number(trade.shares);

    const priceUSD =
      Number(trade.price);

    const exchangeRate =
      Number(trade.exchangeRate);

    const fee =
      Number(trade.fee) || 0;


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
    ========================= */

    if (trade.type === "buy") {

      const stockCost =
        quantity *
        priceUSD *
        rate;


      costKRW +=
        stockCost +
        fee;


      shares += quantity;

    }


    /* =========================
       매도
    ========================= */

    if (trade.type === "sell") {

      if (shares <= 0) {
        return;
      }


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
        fee -
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


  const manualAverage =
    getManualAverage(symbol);


  const averageBuyKRW =
    manualAverage !== null
      ? manualAverage
      : shares > 0
        ? costKRW / shares
        : 0;


  const evaluationProfitKRW =
    marketValueKRW -
    (
      manualAverage !== null
        ? averageBuyKRW * shares
        : costKRW
    );


  return {

    shares,

    costKRW,

    averageBuyKRW,

    currentPriceUSD,

    marketValueKRW,

    evaluationProfitKRW,

    realizedKRW,

    fxProfitKRW

  };
}


/* ==================================================
   포맷
================================================== */

function formatUSD(value) {

  return `$${Number(value).toFixed(2)}`;

}


function formatKRW(value) {

  return `₩${Math.round(
    value
  ).toLocaleString("ko-KR")}`;

}


function formatPercent(value) {

  const number =
    Number(value) || 0;

  return `${
    number >= 0 ? "+" : ""
  }${number.toFixed(2)}%`;

}


/* ==================================================
   색상
================================================== */

function applyProfitColor(
  element,
  value
) {

  if (!element) {
    return;
  }

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


/* ==================================================
   종목 카드
================================================== */

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


  const totalProfit =
    stock.evaluationProfitKRW +
    stock.realizedKRW;


  const returnRate =
    stock.costKRW > 0
      ? (
          totalProfit /
          stock.costKRW
        ) * 100
      : 0;


  if (profitElement) {

    profitElement.textContent =
      stock.costKRW > 0
        ? formatPercent(
            returnRate
          )
        : "--";


    applyProfitColor(
      profitElement,
      returnRate
    );

  }

}


/* ==================================================
   전체 평가금
================================================== */

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


  const evaluationProfitKRW =
    totalValueKRW -
    totalCostKRW;


  /*
    전체수익에서는
    판매수익을 제외
  */

  const totalProfitKRW =
    evaluationProfitKRW;


  const totalReturn =
    totalCostKRW > 0
      ? (
          totalProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  /* 총 평가금 */

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


  /* 달러 */

  const totalDollar =
    document.getElementById(
      "total-dollar"
    );


  if (totalDollar) {

    const usd =
      usdKrw > 0
        ? totalValueKRW /
          usdKrw
        : 0;


    totalDollar.textContent =
      formatUSD(usd);

  }


  /* 전체수익 */

  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    totalProfit.textContent =
      totalCostKRW > 0
        ? `${
            totalProfitKRW >= 0
              ? "+"
              : ""
          }${formatKRW(
            totalProfitKRW
          )} (${formatPercent(
            totalReturn
          )})`
        : "--";


    applyProfitColor(
      totalProfit,
      totalProfitKRW
    );

  }


  /* 판매수익 */

  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );


  if (realizedElement) {

    realizedElement.textContent =
      `${
        totalRealizedKRW >= 0
          ? "+"
          : ""
      }${formatKRW(
        totalRealizedKRW
      )}`;


    applyProfitColor(
      realizedElement,
      totalRealizedKRW
    );

  }


  /* 환차익 */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );


  if (fxElement) {

    /*
      현재 보유 달러 자산의
      환율 변화분을 별도 표시하기 위한 값.

      거래 당시 환율을 기준으로
      현재 환율과 비교한다.
    */

    let fxProfit = 0;


    symbols.forEach(symbol => {

      const trades =
        getTrades(symbol);


      trades.forEach(trade => {

        if (trade.type !== "buy") {
          return;
        }


        const quantity =
          Number(trade.shares);

        const price =
          Number(trade.price);

        const rate =
          Number(trade.exchangeRate);


        if (
          quantity <= 0 ||
          price <= 0 ||
          rate <= 0
        ) {
          return;
        }


        const shares =
          calculateStock(symbol).shares;


        if (shares <= 0) {
          return;
        }


        const dollarAmount =
          quantity *
          price;


        fxProfit +=
          dollarAmount *
          (
            usdKrw -
            rate
          );

      });

    });


    fxElement.textContent =
      `${
        fxProfit >= 0
          ? "+"
          : ""
      }${formatKRW(
        fxProfit
      )}`;


    applyProfitColor(
      fxElement,
      fxProfit
    );

  }


  updateAllocation();

}


/* ==================================================
   환율
================================================== */

function updateExchangeRate() {

  const element =
    document.getElementById(
      "usdkrw"
    );


  if (!element) {
    return;
  }


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


/* ==================================================
   자산 구성
================================================== */

function updateAllocation() {

  const container =
    document.getElementById(
      "allocation-bars"
    );


  if (!container) {
    return;
  }


  const values = [];


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    if (
      stock.marketValueKRW > 0
    ) {

      values.push({
        symbol,
        value:
          stock.marketValueKRW
      });

    }

  });


  const total =
    values.reduce(
      (sum, item) =>
        sum + item.value,
      0
    );


  container.innerHTML = "";


  if (total <= 0) {

    container.innerHTML = `
      <div class="daily-empty">
        보유 자산이 없습니다.
      </div>
    `;

    return;
  }


  values
    .sort(
      (a, b) =>
        b.value - a.value
    )
    .forEach(item => {

      const percent =
        (
          item.value /
          total
        ) * 100;


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "allocation-row";


      row.innerHTML = `

        <div class="allocation-info">

          <span class="allocation-name">
            ${item.symbol}
          </span>

          <span class="allocation-percent">
            ${percent.toFixed(1)}%
          </span>

        </div>

        <div class="allocation-track">

          <div
            class="allocation-fill"
            style="width:${percent}%"
          ></div>

        </div>

      `;


      container.appendChild(row);

    });

}


/* ==================================================
   상세 화면
================================================== */

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
    "daily-screen"
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


  const manual =
    getManualAverage(symbol);


  const manualInput =
    document.getElementById(
      "manual-average-krw"
    );


  if (manualInput) {

    manualInput.value =
      manual !== null
        ? manual
        : "";

  }


  updateDetail(symbol);

}


/* ==================================================
   상세 정보
================================================== */

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


  if (price) {

    price.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(
            stock.currentPriceUSD
          )
        : "--";

  }


  if (shares) {

    shares.textContent =
      `${stock.shares.toLocaleString(
        "ko-KR"
      )}주`;

  }


  if (averageBuy) {

    averageBuy.textContent =
      stock.averageBuyKRW > 0
        ? formatKRW(
            stock.averageBuyKRW
          )
        : "--";

  }


  if (value) {

    value.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(
            stock.marketValueKRW
          )
        : "--";

  }


  if (evaluation) {

    evaluation.textContent =
      `${
        stock.evaluationProfitKRW >= 0
          ? "+"
          : ""
      }${formatKRW(
        stock.evaluationProfitKRW
      )}`;


    applyProfitColor(
      evaluation,
      stock.evaluationProfitKRW
    );

  }


  if (realized) {

    realized.textContent =
      `${
        stock.realizedKRW >= 0
          ? "+"
          : ""
      }${formatKRW(
        stock.realizedKRW
      )}`;


    applyProfitColor(
      realized,
      stock.realizedKRW
    );

  }


  const totalProfitKRW =
    stock.evaluationProfitKRW +
    stock.realizedKRW;


  const returnRate =
    stock.costKRW > 0
      ? (
          totalProfitKRW /
          stock.costKRW
        ) * 100
      : 0;


  if (totalProfit) {

    totalProfit.textContent =
      stock.costKRW > 0
        ? formatPercent(
            returnRate
          )
        : "--";


    applyProfitColor(
      totalProfit,
      returnRate
    );

  }

}


/* ==================================================
   뒤로가기
================================================== */

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


/* ==================================================
   거래 버튼
================================================== */

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


/* ==================================================
   거래창
================================================== */

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


  exchangeRateInput.value =
    usdKrw || "";


  document.getElementById(
    "trade-shares"
  ).value = "";


  document.getElementById(
    "trade-fee"
  ).value = "0";

}


/* ==================================================
   거래 실행
================================================== */

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


  const fee =
    Number(
      document.getElementById(
        "trade-fee"
      ).value
    ) || 0;


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


  if (fee < 0) {

    alert(
      "수수료는 0 이상이어야 합니다."
    );

    return;

  }


  /* 매도 가능 수량 */

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

    fee:
      fee,

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


/* ==================================================
   평단 저장
================================================== */

function saveManualAverageValue() {

  if (!selectedSymbol) {
    return;
  }


  const input =
    document.getElementById(
      "manual-average-krw"
    );


  const value =
    Number(input.value);


  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {

    alert(
      "올바른 원화 평단을 입력해줘."
    );

    return;

  }


  saveManualAverage(
    selectedSymbol,
    value
  );


  updateDetail(
    selectedSymbol
  );


  updateStockCard(
    selectedSymbol
  );


  updateTotal();


  alert(
    "평단이 저장됐습니다."
  );

}


/* ==================================================
   날짜
================================================== */

function getTodayString() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      now.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;

}


function formatDailyDate(date) {

  const parts =
    date.split("-");


  if (
    parts.length !== 3
  ) {
    return date;
  }


  return `${parts[1]}/${parts[2]}`;

}


/* ==================================================
   일간 기록
================================================== */

function getDailyRecords() {

  const saved =
    localStorage.getItem(
      "daily_profit_records"
    );


  if (!saved) {
    return {};
  }


  try {

    return JSON.parse(
      saved
    );

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


/* ==================================================
   일간 수익률 합계
================================================== */

function getTotalDailyReturn(
  records
) {

  return Object.values(
    records
  ).reduce(
    (total, record) => {

      const value =
        Number(
          record.returnRate
        );


      return Number.isFinite(value)
        ? total + value
        : total;

    },
    0
  );

}


/* ==================================================
   오늘 수익
================================================== */

function updateDailyPreview() {

  const records =
    getDailyRecords();


  const today =
    getTodayString();


  const record =
    records[today];


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


  if (!record) {

    if (krw) {
      krw.textContent = "--";
    }

    if (usd) {
      usd.textContent = "--";
    }

    if (rate) {
      rate.textContent = "--";
    }

    return;

  }


  const rateValue =
    Number(
      record.returnRate
    ) || 0;


  const krwValue =
    Number(
      record.krw
    ) || 0;


  const usdValue =
    Number(
      record.usd
    ) || (
      usdKrw > 0
        ? krwValue / usdKrw
        : 0
    );


  if (krw) {

    krw.textContent =
      formatKRW(
        krwValue
      );

    applyProfitColor(
      krw,
      krwValue
    );

  }


  if (usd) {

    usd.textContent =
      formatUSD(
        usdValue
      );

  }


  if (rate) {

    rate.textContent =
      formatPercent(
        rateValue
      );

    applyProfitColor(
      rate,
      rateValue
    );

  }

}


/* ==================================================
   일간 화면
================================================== */

function openDailyScreen() {

  document.getElementById(
    "main-screen"
  ).style.display =
    "none";


  document.getElementById(
    "detail-screen"
  ).style.display =
    "none";


  document.getElementById(
    "daily-screen"
  ).style.display =
    "block";


  updateDailyHistory();

}


/* ==================================================
   일간 기록 화면
================================================== */

function updateDailyHistory() {

  const list =
    document.getElementById(
      "daily-history-list"
    );


  const total =
    document.getElementById(
      "daily-summary-total"
    );


  const dateElement =
    document.getElementById(
      "daily-screen-date"
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


  const totalRate =
    getTotalDailyReturn(
      records
    );


  if (total) {

    total.textContent =
      formatPercent(
        totalRate
      );


    applyProfitColor(
      total,
      totalRate
    );

  }


  if (dateElement) {

    dateElement.textContent =
      `${dates.length}일 기록`;

  }


  list.innerHTML = "";


  if (
    dates.length === 0
  ) {

    list.innerHTML = `
      <div class="daily-empty">
        아직 일간 수익률 기록이 없습니다.
      </div>
    `;

    return;

  }


  /*
    오래된 날짜부터
    누적합 계산
  */

  const oldestFirst =
    [...dates].sort();


  let accumulated = 0;

  const accumulatedMap = {};


  oldestFirst.forEach(
    date => {

      const rate =
        Number(
          records[date].returnRate
        ) || 0;


      accumulated += rate;


      accumulatedMap[date] =
        accumulated;

    }
  );


  dates.forEach(
    date => {

      const record =
        records[date];


      const rate =
        Number(
          record.returnRate
        ) || 0;


      const accumulatedRate =
        accumulatedMap[date];


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "daily-history-row";


      const rateClass =
        rate > 0
          ? "up"
          : rate < 0
            ? "down"
            : "";


      const totalClass =
        accumulatedRate > 0
          ? "up"
          : accumulatedRate < 0
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
          (${formatPercent(accumulatedRate)})
        </div>

        <button
          class="daily-edit"
          type="button"
          data-date="${date}"
        >
          ✎
        </button>

      `;


      list.appendChild(
        row
      );

    }
  );


  list
    .querySelectorAll(
      ".daily-edit"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            editDailyRecord(
              button.dataset.date
            );

          }
        );

      }
    );

}


/* ==================================================
   일간 기록 수정
================================================== */

function editDailyRecord(date) {

  const records =
    getDailyRecords();


  const record =
    records[date] || {
      returnRate: 0,
      krw: 0,
      usd: 0
    };


  const rateInput =
    prompt(
      `${date} 일간 수익률 (%)`,
      record.returnRate
    );


  if (
    rateInput === null
  ) {
    return;
  }


  const rate =
    Number(rateInput);


  if (
    !Number.isFinite(rate)
  ) {

    alert(
      "올바른 숫자를 입력해줘."
    );

    return;

  }


  const krwInput =
    prompt(
      `${date} 원화 수익`,
      record.krw || 0
    );


  if (
    krwInput === null
  ) {
    return;
  }


  const krw =
    Number(krwInput);


  if (
    !Number.isFinite(krw)
  ) {

    alert(
      "올바른 원화 금액을 입력해줘."
    );

    return;

  }


  const usdInput =
    prompt(
      `${date} 달러 수익`,
      record.usd || (
        usdKrw > 0
          ? krw / usdKrw
          : 0
      )
    );


  if (
    usdInput === null
  ) {
    return;
  }


  const usd =
    Number(usdInput);


  if (
    !Number.isFinite(usd)
  ) {

    alert(
      "올바른 달러 금액을 입력해줘."
    );

    return;

  }


  records[date] = {

    returnRate:
      rate,

    krw:
      krw,

    usd:
      usd

  };


  saveDailyRecords(
    records
  );


  updateDailyPreview();

  updateDailyHistory();

}


/* ==================================================
   일간 기록 추가
================================================== */

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
      "YYYY-MM-DD 형식으로 입력해줘."
    );

    return;

  }


  const rateInput =
    prompt(
      "일간 수익률 (%)\n예: 1.25 또는 -0.80"
    );


  if (
    rateInput === null
  ) {
    return;
  }


  const rate =
    Number(rateInput);


  if (
    !Number.isFinite(rate)
  ) {

    alert(
      "올바른 수익률을 입력해줘."
    );

    return;

  }


  const krwInput =
    prompt(
      "원화 수익"
    );


  if (
    krwInput === null
  ) {
    return;
  }


  const krw =
    Number(krwInput);


  if (
    !Number.isFinite(krw)
  ) {

    alert(
      "올바른 원화 금액을 입력해줘."
    );

    return;

  }


  const usdInput =
    prompt(
      "달러 수익"
    );


  if (
    usdInput === null
  ) {
    return;
  }


  const usd =
    Number(usdInput);


  if (
    !Number.isFinite(usd)
  ) {

    alert(
      "올바른 달러 금액을 입력해줘."
    );

    return;

  }


  const records =
    getDailyRecords();


  records[date] = {

    returnRate:
      rate,

    krw:
      krw,

    usd:
      usd

  };


  saveDailyRecords(
    records
  );


  updateDailyPreview();

  updateDailyHistory();

}


/* ==================================================
   API
================================================== */

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


    /* 종목 */

    symbols.forEach(
      symbol => {

        const price =
          Number(
            data[symbol]
          );


        if (
          Number.isFinite(price) &&
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

    updateMarketValue(
      "sp500",
      data.SP500
    );

    updateMarketValue(
      "nasdaq",
      data.NASDAQ
    );

    updateMarketValue(
      "kospi",
      data.KOSPI
    );

    updateMarketValue(
      "kosdaq",
      data.KOSDAQ
    );


    updateTotal();

    updateDailyPreview();


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


/* ==================================================
   시장 값
================================================== */

function updateMarketValue(
  id,
  value
) {

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
            maximumFractionDigits: 2
          }
        )
      : "--";

}


/* ==================================================
   이벤트
================================================== */

function setupEvents() {

  /* 종목 카드 */

  document
    .querySelectorAll(
      ".stock-card"
    )
    .forEach(
      card => {

        card.addEventListener(
          "click",
          () => {

            openDetail(
              card.dataset.symbol
            );

          }
        );

      }
    );


  /* 상세 뒤로가기 */

  document.getElementById(
    "back-button"
  ).addEventListener(
    "click",
    closeDetail
  );


  /* 일간 화면 */

  document.getElementById(
    "daily-profit-button"
  ).addEventListener(
    "click",
    openDailyScreen
  );


  document.getElementById(
    "daily-back-button"
  ).addEventListener(
    "click",
    () => {

      document.getElementById(
        "daily-screen"
      ).style.display =
        "none";


      document.getElementById(
        "main-screen"
      ).style.display =
        "block";

    }
  );


  /* 일간 기록 추가 */

  document.getElementById(
    "add-daily-record"
  ).addEventListener(
    "click",
    addDailyRecord
  );


  /* 거래 */

  setupTradeButtons();


  document.getElementById(
    "trade-submit"
  ).addEventListener(
    "click",
    submitTrade
  );


  /* 평단 */

  document.getElementById(
    "manual-average-save"
  ).addEventListener(
    "click",
    saveManualAverageValue
  );

}


/* ==================================================
   시작
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    updateDailyPreview();

    setInterval(
      loadQuotes,
      60000
    );

  }
);