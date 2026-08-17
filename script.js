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


/* =====================================================
   기본
===================================================== */

function todayString() {

  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}


function formatUSD(value) {

  return `$${Number(value).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )}`;
}


function formatKRW(value) {

  return `₩${Math.round(
    Number(value) || 0
  ).toLocaleString("ko-KR")}`;
}


function formatPercent(value) {

  const n = Number(value) || 0;

  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}


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


/* =====================================================
   거래내역
===================================================== */

function getTrades(symbol) {

  const saved =
    localStorage.getItem(
      `${symbol}_trades`
    );

  if (!saved) {
    return [];
  }

  try {

    const data =
      JSON.parse(saved);

    return Array.isArray(data)
      ? data
      : [];

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


/* =====================================================
   일간 수익 기록
===================================================== */

function getDailyRecords() {

  const saved =
    localStorage.getItem(
      "daily_profit_records"
    );

  if (!saved) {
    return {};
  }

  try {

    return JSON.parse(saved) || {};

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


/* =====================================================
   종목 계산
===================================================== */

function calculateStock(symbol) {

  const trades =
    getTrades(symbol)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      );


  let shares = 0;

  let costKRW = 0;

  let realizedKRW = 0;

  let totalBuyStockKRW = 0;

  let totalBuyFXKRW = 0;


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


    /* =========================
       매수
    ========================= */

    if (trade.type === "buy") {

      const stockCostUSD =
        quantity *
        priceUSD;

      const buyCostKRW =
        stockCostUSD *
        rate;


      costKRW += buyCostKRW;

      shares += quantity;


      totalBuyStockKRW +=
        stockCostUSD *
        1400;

      totalBuyFXKRW +=
        stockCostUSD *
        (rate - 1400);
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
        shares > 0
          ? costKRW / shares
          : 0;


      const calculatedRevenueKRW =
        sellQuantity *
        priceUSD *
        rate;


      const actualRevenueKRW =
        Number(trade.totalKRW) > 0
          ? Number(trade.totalKRW)
          : calculatedRevenueKRW;


      const soldCostKRW =
        averageCostKRW *
        sellQuantity;


      realizedKRW +=
        actualRevenueKRW -
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
   * 현재 보유분 기준 환차익
   *
   * 매수가에 기록된 환율과
   * 현재 환율의 차이를 계산.
   */

  let fxProfitKRW = 0;


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


    /*
     * 단순 현재 환율 기준
     * 환차익 = 달러원금 ×
     * 현재환율 - 매수환율
     */

    const fx =
      q *
      p *
      (usdKrw - r);


    fxProfitKRW += fx;
  });


  /*
   * 평가손익에는 이미 현재환율이 들어가므로
   * 환차익을 별도 표시하기 위해
   * 주가변동손익을 계산.
   */

  const stockProfitKRW =
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


/* =====================================================
   종목 카드
===================================================== */

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
   * 종목 카드의 수익률은
   * 현재 평가손익 기준
   */

  const profitRate =
    stock.costKRW > 0
      ? (
          stock.evaluationProfitKRW /
          stock.costKRW
        ) * 100
      : 0;


  if (profitElement) {

    profitElement.textContent =
      stock.costKRW > 0
        ? formatPercent(profitRate)
        : "--";

    setColor(
      profitElement,
      profitRate
    );
  }
}


/* =====================================================
   전체 평가
===================================================== */

function updateTotal() {

  let totalValueKRW = 0;

  let totalCostKRW = 0;

  let totalEvaluationProfitKRW = 0;

  let totalFXProfitKRW = 0;

  let totalRealizedKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    totalValueKRW +=
      stock.marketValueKRW;


    totalCostKRW +=
      stock.costKRW;


    totalEvaluationProfitKRW +=
      stock.evaluationProfitKRW;


    totalFXProfitKRW +=
      stock.fxProfitKRW;


    totalRealizedKRW +=
      stock.realizedKRW;

  });


  /*
   * 사용자가 요청한 기준:
   *
   * 전체수익
   * = 평가손익 + 환차익
   *
   * 판매수익은 전체수익에서 제외.
   *
   * 평가손익 자체에는 환율효과가 이미 들어있기 때문에
   * 여기서는 실제 표시용 전체수익을
   * 주가변동손익 + 환차익으로 구성.
   */

  const stockProfitKRW =
    totalEvaluationProfitKRW -
    totalFXProfitKRW;


  const totalProfitKRW =
    stockProfitKRW +
    totalFXProfitKRW;


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
        ? totalValueKRW / usdKrw
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

    if (totalCostKRW > 0) {

      totalProfit.textContent =
        `${formatKRW(totalProfitKRW)} (${formatPercent(totalReturn)})`;

      setColor(
        totalProfit,
        totalProfitKRW
      );

    } else {

      totalProfit.textContent =
        "--";

    }
  }


  /* 환차익 */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );

  if (fxElement) {

    fxElement.textContent =
      totalCostKRW > 0
        ? formatKRW(
            totalFXProfitKRW
          )
        : "--";

    setColor(
      fxElement,
      totalFXProfitKRW
    );
  }


  /* 판매수익 */

  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );

  if (realizedElement) {

    realizedElement.textContent =
      totalRealizedKRW !== 0
        ? formatKRW(
            totalRealizedKRW
          )
        : "₩0";

    setColor(
      realizedElement,
      totalRealizedKRW
    );
  }


  updateDailyProfit();

  updateAllocation();

}


/* =====================================================
   환율
===================================================== */

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


/* =====================================================
   일간 수익
===================================================== */

function calculateTodayProfit() {

  const today =
    todayString();


  const records =
    getDailyRecords();


  if (
    records[today] &&
    Number.isFinite(
      Number(records[today].krw)
    )
  ) {

    return {

      krw:
        Number(records[today].krw),

      usd:
        Number(records[today].usd) || 0,

      rate:
        Number(records[today].rate) || 0

    };
  }


  /*
   * 오늘 거래가 있으면
   * 매도수익을 오늘 수익에 반영.
   */

  let todayKRW = 0;


  symbols.forEach(symbol => {

    const trades =
      getTrades(symbol);


    trades.forEach(trade => {

      if (
        trade.type === "sell" &&
        String(trade.date).slice(0, 10) === today
      ) {

        const stock =
          calculateStock(symbol);

        /*
         * 판매수익 자체는 calculateStock에서
         * 전체 실현손익을 계산하므로
         * 날짜별 자동 계산은 아래에서 별도로 처리.
         */
      }

    });

  });


  return {
    krw: todayKRW,
    usd:
      usdKrw > 0
        ? todayKRW / usdKrw
        : 0,
    rate: 0
  };
}


function updateDailyProfit() {

  const today =
    todayString();


  const record =
    calculateTodayProfit();


  const dateElement =
    document.getElementById(
      "daily-date"
    );

  if (dateElement) {

    dateElement.textContent =
      today.replaceAll("-", ".");
  }


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
      formatKRW(record.krw);

    setColor(
      krwElement,
      record.krw
    );
  }


  if (usdElement) {

    usdElement.textContent =
      formatUSD(record.usd);
  }


  if (rateElement) {

    rateElement.textContent =
      formatPercent(record.rate);

    setColor(
      rateElement,
      record.rate
    );
  }


  updateDailyHistory();
}


/* =====================================================
   일간 기록 화면
===================================================== */

function updateDailyHistory() {

  const list =
    document.getElementById(
      "daily-history-list"
    );

  const totalElement =
    document.getElementById(
      "daily-total-rate"
    );


  if (!list) return;


  const records =
    getDailyRecords();


  const dates =
    Object.keys(records)
      .sort()
      .reverse();


  if (dates.length === 0) {

    list.innerHTML =
      `
        <div class="empty-text">
          기록된 일간 수익이 없습니다.
        </div>
      `;

    if (totalElement) {
      totalElement.textContent =
        "0.00%";
    }

    return;
  }


  let totalRate = 0;


  dates.forEach(date => {

    totalRate +=
      Number(
        records[date].rate
      ) || 0;

  });


  if (totalElement) {

    totalElement.textContent =
      formatPercent(
        totalRate
      );

    setColor(
      totalElement,
      totalRate
    );
  }


  list.innerHTML = "";


  dates.forEach(date => {

    const record =
      records[date];


    const row =
      document.createElement(
        "div"
      );

    row.className =
      "history-row";


    row.innerHTML =
      `
        <div class="history-main">

          <div class="history-date">
            ${date.replaceAll("-", ".")}
          </div>

          <div class="history-values">

            <span>
              ${formatKRW(record.krw)}
            </span>

            <span>
              ${formatUSD(record.usd || 0)}
            </span>

            <span
              class="history-rate"
              data-rate="${Number(record.rate) || 0}"
            >
              ${formatPercent(Number(record.rate) || 0)}
            </span>

          </div>

        </div>


        <div class="history-actions">

          <input
            class="history-edit"
            type="number"
            step="0.01"
            value="${Number(record.rate) || 0}"
            placeholder="수익률 %"
          >

          <button
            class="history-save"
          >
            저장
          </button>

          <button
            class="history-delete"
          >
            삭제
          </button>

        </div>
      `;


    const main =
      row.querySelector(
        ".history-main"
      );


    main.addEventListener(
      "click",
      () => {

        row.classList.toggle(
          "open"
        );

      }
    );


    const saveButton =
      row.querySelector(
        ".history-save"
      );


    saveButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();


        const input =
          row.querySelector(
            ".history-edit"
          );


        const newRate =
          Number(
            input.value
          );


        if (
          !Number.isFinite(
            newRate
          )
        ) {

          alert(
            "수익률을 입력해줘."
          );

          return;
        }


        records[date].rate =
          newRate;


        saveDailyRecords(
          records
        );


        updateDailyHistory();

        updateDailyProfit();

      }
    );


    const deleteButton =
      row.querySelector(
        ".history-delete"
      );


    deleteButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();


        if (
          !confirm(
            `${date} 일간 수익 기록을 삭제할까요?`
          )
        ) {
          return;
        }


        delete records[date];


        saveDailyRecords(
          records
        );


        updateDailyHistory();

      }
    );


    list.appendChild(row);

  });

}


/* =====================================================
   자산 구성
===================================================== */

function updateAllocation() {

  const container =
    document.getElementById(
      "allocation-list"
    );


  if (!container) return;


  const stocks = [];


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    if (
      stock.marketValueKRW > 0
    ) {

      stocks.push({
        symbol,
        value:
          stock.marketValueKRW
      });

    }

  });


  const total =
    stocks.reduce(
      (sum, stock) =>
        sum + stock.value,
      0
    );


  if (
    total <= 0 ||
    stocks.length === 0
  ) {

    container.innerHTML =
      `
        <div class="empty-text">
          보유 종목이 없습니다.
        </div>
      `;

    return;
  }


  stocks.sort(
    (a, b) =>
      b.value - a.value
  );


  container.innerHTML = "";


  stocks.forEach(stock => {

    const percent =
      (
        stock.value /
        total
      ) * 100;


    const item =
      document.createElement(
        "div"
      );


    item.className =
      "allocation-item";


    item.innerHTML =
      `
        <div class="allocation-top">

          <span class="allocation-name">
            ${stock.symbol}
          </span>

          <span class="allocation-percent">
            ${percent.toFixed(1)}%
          </span>

        </div>

        <div class="allocation-bar">

          <div
            class="allocation-fill"
            style="width:${percent}%"
          ></div>

        </div>
      `;


    container.appendChild(item);

  });

}


/* =====================================================
   상세
===================================================== */

function openDetail(symbol) {

  selectedSymbol =
    symbol;

  tradeType =
    null;


  document.getElementById(
    "main-screen"
  ).classList.add(
    "hidden"
  );


  document.getElementById(
    "detail-screen"
  ).classList.remove(
    "hidden"
  );


  document.getElementById(
    "detail-symbol"
  ).textContent =
    symbol;


  document.getElementById(
    "trade-form"
  ).classList.add(
    "hidden"
  );


  updateDetail(
    symbol
  );


  renderTransactions(
    symbol
  );
}


function closeDetail() {

  selectedSymbol =
    null;

  tradeType =
    null;


  document.getElementById(
    "detail-screen"
  ).classList.add(
    "hidden"
  );


  document.getElementById(
    "main-screen"
  ).classList.remove(
    "hidden"
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


  realized.textContent =
    stock.realizedKRW !== 0
      ? formatKRW(
          stock.realizedKRW
        )
      : "₩0";


  setColor(
    realized,
    stock.realizedKRW
  );


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


/* =====================================================
   거래 버튼
===================================================== */

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


/* =====================================================
   거래창
===================================================== */

function showTradeForm() {

  const form =
    document.getElementById(
      "trade-form"
    );

  const title =
    document.getElementById(
      "trade-title"
    );

  const dateInput =
    document.getElementById(
      "trade-date"
    );

  const priceInput =
    document.getElementById(
      "trade-price"
    );

  const rateInput =
    document.getElementById(
      "trade-exchange-rate"
    );

  const sellTotal =
    document.getElementById(
      "sell-total-box"
    );

  const sellLabel =
    document.getElementById(
      "sell-total-label"
    );

  const totalInput =
    document.getElementById(
      "trade-total-krw"
    );


  form.classList.remove(
    "hidden"
  );


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  dateInput.value =
    todayString();


  priceInput.value =
    prices[selectedSymbol] || "";


  rateInput.value =
    usdKrw > 0
      ? usdKrw
      : "";


  document.getElementById(
    "trade-shares"
  ).value = "";


  /*
   * 매수/매도에 따라
   * 실제 총 원화금액 입력창 표시.
   */

  if (tradeType === "sell") {

    sellTotal.classList.remove(
      "hidden"
    );

    sellLabel.classList.remove(
      "hidden"
    );

    totalInput.classList.remove(
      "hidden"
    );

  } else {

    sellTotal.classList.add(
      "hidden"
    );

    sellLabel.classList.add(
      "hidden"
    );

    totalInput.classList.add(
      "hidden"
    );

    totalInput.value = "";

  }


  updateSellCalculatedTotal();

}


/* =====================================================
   매도 예상금액
===================================================== */

function updateSellCalculatedTotal() {

  if (
    tradeType !== "sell"
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


  const rate =
    Number(
      document.getElementById(
        "trade-exchange-rate"
      ).value
    );


  const total =
    shares > 0 &&
    price > 0 &&
    rate > 0
      ? shares *
        price *
        rate
      : 0;


  const element =
    document.getElementById(
      "sell-calculated-total"
    );


  if (element) {

    element.textContent =
      formatKRW(total);

  }

}


/* =====================================================
   거래 저장
===================================================== */

function submitTrade() {

  if (
    !selectedSymbol ||
    !tradeType
  ) {
    return;
  }


  const date =
    document.getElementById(
      "trade-date"
    ).value;


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


  const totalKRW =
    Number(
      document.getElementById(
        "trade-total-krw"
      ).value
    );


  if (!date) {

    alert(
      "거래 날짜를 입력해줘."
    );

    return;
  }


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


  /* =========================
     매도 가능수량
  ========================== */

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


  /* =========================
     거래 저장
  ========================== */

  const trades =
    getTrades(
      selectedSymbol
    );


  const calculatedTotal =
    shares *
    price *
    exchangeRate;


  trades.push({

    id:
      `${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`,

    type:
      tradeType,

    shares:
      shares,

    price:
      price,

    exchangeRate:
      exchangeRate,

    /*
     * 매도 시 실제 원화 체결금액.
     * 입력하지 않으면 자동 계산값 사용.
     */

    totalKRW:
      tradeType === "sell"
        ? (
            Number.isFinite(
              totalKRW
            ) &&
            totalKRW > 0
              ? totalKRW
              : calculatedTotal
          )
        : 0,

    date:
      date

  });


  saveTrades(
    selectedSymbol,
    trades
  );


  /*
   * 매도면 해당 날짜에
   * 판매수익을 일간기록에 자동 반영.
   */

  if (
    tradeType === "sell"
  ) {

    updateDailyRecordFromSale(
      selectedSymbol,
      date
    );

  }


  document.getElementById(
    "trade-form"
  ).classList.add(
    "hidden"
  );


  tradeType =
    null;


  updateStockCard(
    selectedSymbol
  );

  updateDetail(
    selectedSymbol
  );

  renderTransactions(
    selectedSymbol
  );

  updateTotal();

}


/* =====================================================
   매도 → 일간 수익 자동기록
===================================================== */

function updateDailyRecordFromSale(
  symbol,
  date
) {

  const records =
    getDailyRecords();


  /*
   * 해당 날짜의 모든 매도수익을 계산.
   */

  let saleProfitKRW = 0;


  symbols.forEach(stockSymbol => {

    const trades =
      getTrades(
        stockSymbol
      )
        .slice()
        .sort(
          (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        );


    let shares = 0;

    let costKRW = 0;


    trades.forEach(trade => {

      const q =
        Number(trade.shares);

      const p =
        Number(trade.price);

      const r =
        Number(trade.exchangeRate);


      if (
        !Number.isFinite(q) ||
        !Number.isFinite(p) ||
        !Number.isFinite(r)
      ) {
        return;
      }


      if (
        trade.type === "buy"
      ) {

        costKRW +=
          q *
          p *
          r;

        shares += q;

      }


      if (
        trade.type === "sell"
      ) {

        if (
          shares <= 0
        ) {
          return;
        }


        const sellQ =
          Math.min(
            q,
            shares
          );


        const avgCost =
          costKRW /
          shares;


        const revenue =
          Number(trade.totalKRW) > 0
            ? Number(trade.totalKRW)
            : q *
              p *
              r;


        const soldCost =
          avgCost *
          sellQ;


        const profit =
          revenue -
          soldCost;


        if (
          String(
            trade.date
          ).slice(0, 10) === date
        ) {

          saleProfitKRW +=
            profit;

        }


        costKRW -=
          soldCost;

        shares -=
          sellQ;

      }

    });

  });


  /*
   * 기존 기록이 사용자가 직접 수정한 기록이면
   * KRW/rate를 강제로 덮어쓰지 않고,
   * 판매수익이 새로 생긴 날짜에만 기본 기록 생성.
   */

  if (!records[date]) {

    const rate =
      0;


    records[date] = {

      krw:
        saleProfitKRW,

      usd:
        usdKrw > 0
          ? saleProfitKRW / usdKrw
          : 0,

      rate:
        rate

    };


    saveDailyRecords(
      records
    );

  }

}


/* =====================================================
   거래내역 표시
===================================================== */

function renderTransactions(symbol) {

  const list =
    document.getElementById(
      "transaction-list"
    );


  if (!list) return;


  const trades =
    getTrades(symbol)
      .slice()
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      );


  if (
    trades.length === 0
  ) {

    list.innerHTML =
      `
        <div class="empty-text">
          거래내역이 없습니다.
        </div>
      `;

    return;
  }


  list.innerHTML = "";


  trades.forEach(trade => {

    const item =
      document.createElement(
        "div"
      );


    item.className =
      "transaction-item";


    const isBuy =
      trade.type === "buy";


    const typeText =
      isBuy
        ? "매수"
        : "매도";


    const typeClass =
      isBuy
        ? "transaction-buy"
        : "transaction-sell";


    const totalKRW =
      !isBuy &&
      Number(trade.totalKRW) > 0
        ? Number(trade.totalKRW)
        : Number(trade.shares) *
          Number(trade.price) *
          Number(trade.exchangeRate);


    item.innerHTML =
      `
        <div class="transaction-top">

          <div class="transaction-left">

            <span
              class="transaction-type ${typeClass}"
            >
              ${typeText}
            </span>

            <span class="transaction-date">
              ${String(trade.date).replaceAll("-", ".")}
            </span>

          </div>

          <button
            class="transaction-delete"
          >
            삭제
          </button>

        </div>


        <div class="transaction-detail">

          <div>
            수량
            ${Number(trade.shares).toLocaleString("ko-KR")}주
          </div>

          <div>
            가격
            ${formatUSD(trade.price)}
          </div>

          <div>
            환율
            ${Number(trade.exchangeRate).toLocaleString("ko-KR")}
          </div>

          <div>
            ${isBuy ? "매수금액" : "매도금액"}
            ${formatKRW(totalKRW)}
          </div>

        </div>
      `;


    const deleteButton =
      item.querySelector(
        ".transaction-delete"
      );


    deleteButton.addEventListener(
      "click",
      () => {

        if (
          !confirm(
            `${String(trade.date).replaceAll("-", ".")} ${typeText} 기록을 삭제할까요?`
          )
        ) {
          return;
        }


        deleteTrade(
          symbol,
          trade.id
        );

      }
    );


    list.appendChild(
      item
    );

  });

}


/* =====================================================
   거래 삭제
===================================================== */

function deleteTrade(
  symbol,
  id
) {

  const trades =
    getTrades(symbol);


  const filtered =
    trades.filter(
      trade =>
        String(trade.id) !==
        String(id)
    );


  saveTrades(
    symbol,
    filtered
  );


  /*
   * 삭제 후 전체 화면을
   * 다시 계산.
   */

  updateStockCard(
    symbol
  );

  updateDetail(
    symbol
  );

  renderTransactions(
    symbol
  );

  updateTotal();

}


/* =====================================================
   API
===================================================== */

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
        Number(data.USD_KRW)
      ) &&
      Number(data.USD_KRW) > 0
    ) {

      usdKrw =
        Number(data.USD_KRW);

    }


    updateExchangeRate();


    /* 주가 */

    symbols.forEach(symbol => {

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

    });


    /*
     * 현재 API가 반환하지 않는 시장지수는
     * 데이터가 들어올 경우 자동 표시.
     */

    updateMarketIndex(
      "sp500",
      data.SP500
    );

    updateMarketIndex(
      "nasdaq",
      data.NASDAQ
    );

    updateMarketIndex(
      "kospi",
      data.KOSPI
    );

    updateMarketIndex(
      "kosdaq",
      data.KOSDAQ
    );


    updateTotal();


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


function updateMarketIndex(
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


  const n =
    Number(value);


  if (
    Number.isFinite(n) &&
    n > 0
  ) {

    element.textContent =
      n.toLocaleString(
        "ko-KR",
        {
          maximumFractionDigits: 2
        }
      );

  }

}


/* =====================================================
   이벤트
===================================================== */

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
            card.dataset.symbol;


          openDetail(
            symbol
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


  /*
   * 매도 예상금액 실시간 계산
   */

  [
    "trade-shares",
    "trade-price",
    "trade-exchange-rate"
  ].forEach(id => {

    document.getElementById(
      id
    ).addEventListener(
      "input",
      updateSellCalculatedTotal
    );

  });


  /*
   * 일간수익 클릭
   */

  document.getElementById(
    "daily-profit-toggle"
  ).addEventListener(
    "click",
    () => {

      document.getElementById(
        "daily-history"
      ).classList.toggle(
        "hidden"
      );

    }
  );

}


/* =====================================================
   시작
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    updateDailyHistory();

    setInterval(
      loadQuotes,
      60000
    );

  }
);