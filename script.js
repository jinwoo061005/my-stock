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

let chartPeriod = "1D";


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
   표시
====================================================== */

function krw(value) {

  const n = num(value);

  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}


function signedKrw(value) {

  const n = num(value);

  return `${n >= 0 ? "+" : ""}${krw(n)}`;
}


function usd(value) {

  const n = num(value);

  return `$${n.toFixed(2)}`;
}


function signedUsd(value) {

  const n = num(value);

  return `${n >= 0 ? "+" : ""}${usd(n)}`;
}


function percent(value) {

  const n = num(value);

  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}


/* ======================================================
   색
====================================================== */

function colorize(element, value) {

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


/* ======================================================
   거래 저장
====================================================== */

function getTrades(symbol) {

  const raw =
    localStorage.getItem(
      `${symbol}_trades`
    );

  if (!raw) {
    return [];
  }

  try {

    const data = JSON.parse(raw);

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


/* ======================================================
   종목 계산
====================================================== */

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  let costUSD = 0;
  let costKRW = 0;

  let realizedKRW = 0;


  for (const trade of trades) {

    const quantity =
      num(trade.shares);

    const price =
      num(trade.price);

    const rate =
      num(trade.exchangeRate);


    if (
      quantity <= 0 ||
      price <= 0
    ) {
      continue;
    }


    /* ==================================================
       매수
    ================================================== */

    if (trade.type === "buy") {

      const buyUSD =
        quantity * price;

      let buyKRW;

      /*
       * 실제 원화 총액을 입력했다면
       * 그것을 우선 사용
       */

      if (num(trade.totalKRW) > 0) {

        buyKRW =
          num(trade.totalKRW);

      } else {

        buyKRW =
          buyUSD * rate;
      }


      shares += quantity;

      costUSD += buyUSD;

      costKRW += buyKRW;

      continue;
    }


    /* ==================================================
       매도
    ================================================== */

    if (trade.type === "sell") {

      if (shares <= 0) {
        continue;
      }


      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      const ratio =
        sellQuantity / shares;


      const soldCostUSD =
        costUSD * ratio;

      const soldCostKRW =
        costKRW * ratio;


      let revenueKRW;


      if (
        num(trade.totalKRW) > 0
      ) {

        revenueKRW =
          num(trade.totalKRW);

      } else {

        revenueKRW =
          sellQuantity *
          price *
          rate;
      }


      const saleProfit =
        revenueKRW -
        soldCostKRW;


      realizedKRW +=
        saleProfit;


      shares -=
        sellQuantity;

      costUSD -=
        soldCostUSD;

      costKRW -=
        soldCostKRW;


      if (
        Math.abs(shares) <
        0.000000001
      ) {
        shares = 0;
      }

      if (
        Math.abs(costUSD) <
        0.000000001
      ) {
        costUSD = 0;
      }

      if (
        Math.abs(costKRW) <
        0.000000001
      ) {
        costKRW = 0;
      }
    }
  }


  const price =
    num(prices[symbol]);


  const marketUSD =
    price * shares;

  const marketKRW =
    marketUSD * usdKrw;


  const stockProfitKRW =
    (
      marketUSD -
      costUSD
    ) * usdKrw;


  const fxProfitKRW =
    (
      costUSD * usdKrw
    ) -
    costKRW;


  const evaluationProfitKRW =
    stockProfitKRW +
    fxProfitKRW;


  const evaluationRate =
    costKRW > 0
      ? (
          evaluationProfitKRW /
          costKRW
        ) * 100
      : 0;


  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  const averageBuyUSD =
    shares > 0
      ? costUSD / shares
      : 0;


  return {

    shares,

    costUSD,
    costKRW,

    marketUSD,
    marketKRW,

    averageBuyUSD,
    averageBuyKRW,

    stockProfitKRW,
    fxProfitKRW,

    evaluationProfitKRW,
    evaluationRate,

    realizedKRW,

    price
  };
}


/* ======================================================
   종목 카드
====================================================== */

function updateStockCard(symbol) {

  const stock =
    calculateStock(symbol);


  const shares =
    document.getElementById(
      `${symbol}-shares-display`
    );

  const price =
    document.getElementById(
      `${symbol}-price`
    );

  const value =
    document.getElementById(
      `${symbol}-value`
    );

  const profit =
    document.getElementById(
      `${symbol}-profit`
    );


  if (shares) {

    shares.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  if (price) {

    price.textContent =
      stock.price > 0
        ? usd(stock.price)
        : "--";
  }


  if (value) {

    value.textContent =
      stock.shares > 0
        ? krw(stock.marketKRW)
        : "--";
  }


  if (profit) {

    profit.textContent =
      stock.costKRW > 0
        ? percent(stock.evaluationRate)
        : "--";

    colorize(
      profit,
      stock.evaluationRate
    );
  }
}


/* ======================================================
   전체
====================================================== */

function getTotalAssets() {

  let totalValueKRW = 0;

  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    totalValueKRW +=
      stock.marketKRW;
  });

  return totalValueKRW;
}


function getTotalFXProfit() {

  let total = 0;

  symbols.forEach(symbol => {

    total +=
      calculateStock(symbol).fxProfitKRW;
  });

  return total;
}


function updateTotal() {

  let totalValueKRW = 0;
  let totalValueUSD = 0;

  let totalCostKRW = 0;

  let evaluationProfitKRW = 0;

  let fxProfitKRW = 0;

  let realizedKRW = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    totalValueKRW +=
      stock.marketKRW;

    totalValueUSD +=
      stock.marketUSD;

    totalCostKRW +=
      stock.costKRW;

    evaluationProfitKRW +=
      stock.evaluationProfitKRW;

    fxProfitKRW +=
      stock.fxProfitKRW;

    realizedKRW +=
      stock.realizedKRW;
  });


  const evaluationRate =
    totalCostKRW > 0
      ? (
          evaluationProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  const totalValue =
    document.getElementById(
      "total-value"
    );

  if (totalValue) {

    totalValue.textContent =
      krw(totalValueKRW);
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollar) {

    totalDollar.textContent =
      usd(totalValueUSD);
  }


  const totalProfit =
    document.getElementById(
      "total-profit"
    );

  if (totalProfit) {

    totalProfit.textContent =
      totalCostKRW > 0
        ? `${signedKrw(evaluationProfitKRW)} (${percent(evaluationRate)})`
        : "--";

    colorize(
      totalProfit,
      evaluationProfitKRW
    );
  }


  const totalFX =
    document.getElementById(
      "total-fx-profit"
    );

  if (totalFX) {

    totalFX.textContent =
      totalCostKRW > 0
        ? signedKrw(fxProfitKRW)
        : "--";

    colorize(
      totalFX,
      fxProfitKRW
    );
  }


  const totalFXInline =
    document.getElementById(
      "total-fx-profit-inline"
    );

  if (totalFXInline) {

    totalFXInline.textContent =
      totalCostKRW > 0
        ? `환차익 ${signedKrw(fxProfitKRW)}`
        : "환차익 --";

    colorize(
      totalFXInline,
      fxProfitKRW
    );
  }


  const realized =
    document.getElementById(
      "total-realized-profit"
    );

  if (realized) {

    realized.textContent =
      signedKrw(realizedKRW);

    colorize(
      realized,
      realizedKRW
    );
  }


  updateAllocation();

  updateDailyProfit();

  renderDailyList();
}


/* ======================================================
   자산 구성
====================================================== */

function updateAllocation() {

  const container =
    document.getElementById(
      "allocation-list"
    );

  if (!container) return;


  let total = 0;

  const data = [];


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    if (stock.marketKRW > 0) {

      total +=
        stock.marketKRW;

      data.push({
        symbol,
        value: stock.marketKRW
      });
    }
  });


  if (total <= 0) {

    container.innerHTML =
      `<div class="empty-message">보유 자산 없음</div>`;

    return;
  }


  data.sort(
    (a, b) =>
      b.value - a.value
  );


  container.innerHTML =
    data.map(item => {

      const ratio =
        (
          item.value /
          total
        ) * 100;

      return `
        <div class="allocation-row">

          <div class="allocation-top">

            <span class="allocation-name">
              ${item.symbol}
            </span>

            <span class="allocation-percent">
              ${ratio.toFixed(1)}%
            </span>

          </div>

          <div class="allocation-bar">

            <div
              class="allocation-fill"
              style="width:${ratio}%"
            ></div>

          </div>

        </div>
      `;

    }).join("");
}


/* ======================================================
   상세
====================================================== */

function updateDetail(symbol) {

  const stock =
    calculateStock(symbol);


  const detailSymbol =
    document.getElementById(
      "detail-symbol"
    );

  const detailPrice =
    document.getElementById(
      "detail-price"
    );

  const detailShares =
    document.getElementById(
      "detail-shares"
    );

  const detailAverage =
    document.getElementById(
      "detail-average-buy"
    );

  const detailValue =
    document.getElementById(
      "detail-value"
    );

  const detailEvaluation =
    document.getElementById(
      "detail-evaluation-profit"
    );

  const detailFX =
    document.getElementById(
      "detail-fx-profit"
    );

  const detailRealized =
    document.getElementById(
      "detail-realized-profit"
    );

  const detailRate =
    document.getElementById(
      "detail-total-profit"
    );


  if (detailSymbol) {
    detailSymbol.textContent = symbol;
  }


  if (detailPrice) {

    detailPrice.textContent =
      stock.price > 0
        ? usd(stock.price)
        : "--";
  }


  if (detailShares) {

    detailShares.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  if (detailAverage) {

    detailAverage.textContent =
      stock.averageBuyKRW > 0
        ? krw(stock.averageBuyKRW)
        : "--";
  }


  if (detailValue) {

    detailValue.textContent =
      stock.shares > 0
        ? krw(stock.marketKRW)
        : "--";
  }


  if (detailEvaluation) {

    detailEvaluation.textContent =
      stock.costKRW > 0
        ? signedKrw(
            stock.evaluationProfitKRW
          )
        : "--";

    colorize(
      detailEvaluation,
      stock.evaluationProfitKRW
    );
  }


  if (detailFX) {

    detailFX.textContent =
      stock.costKRW > 0
        ? signedKrw(
            stock.fxProfitKRW
          )
        : "--";

    colorize(
      detailFX,
      stock.fxProfitKRW
    );
  }


  if (detailRealized) {

    detailRealized.textContent =
      signedKrw(
        stock.realizedKRW
      );

    colorize(
      detailRealized,
      stock.realizedKRW
    );
  }


  if (detailRate) {

    detailRate.textContent =
      stock.costKRW > 0
        ? percent(
            stock.evaluationRate
          )
        : "--";

    colorize(
      detailRate,
      stock.evaluationRate
    );
  }


  const chartPrice =
    document.getElementById(
      "chart-current-price"
    );

  if (chartPrice) {

    chartPrice.textContent =
      stock.price > 0
        ? usd(stock.price)
        : "--";
  }


  renderTradeHistory(symbol);

  drawStockChart(symbol);
}


/* ======================================================
   상세 열기
====================================================== */

function openDetail(symbol) {

  selectedSymbol =
    symbol;

  document.getElementById(
    "main-screen"
  ).style.display =
    "none";

  document.getElementById(
    "detail-screen"
  ).style.display =
    "block";


  document.getElementById(
    "trade-form"
  ).style.display =
    "none";


  updateDetail(symbol);
}


/* ======================================================
   상세 닫기
====================================================== */

function closeDetail() {

  selectedSymbol = null;

  tradeType = null;

  editingTradeIndex = null;


  document.getElementById(
    "detail-screen"
  ).style.display =
    "none";

  document.getElementById(
    "main-screen"
  ).style.display =
    "block";
}


/* ======================================================
   거래창
====================================================== */

function showTradeForm(type, index = null) {

  tradeType =
    type;

  editingTradeIndex =
    index;


  const form =
    document.getElementById(
      "trade-form"
    );

  const title =
    document.getElementById(
      "trade-title"
    );

  const sellWrapper =
    document.getElementById(
      "sell-total-wrapper"
    );


  form.style.display =
    "block";


  title.textContent =
    index === null
      ? (
          type === "buy"
            ? "매수"
            : "매도"
        )
      : "거래 수정";


  sellWrapper.style.display =
    type === "sell"
      ? "block"
      : "none";


  /*
   * 매수 원화 입력창 표시
   */

  const buyKRWWrapper =
    document.getElementById(
      "buy-total-wrapper"
    );

  if (buyKRWWrapper) {

    buyKRWWrapper.style.display =
      type === "buy"
        ? "block"
        : "none";
  }


  if (index === null) {

    document.getElementById(
      "trade-date"
    ).value =
      todayString();

    document.getElementById(
      "trade-shares"
    ).value =
      "";

    document.getElementById(
      "trade-price"
    ).value =
      prices[selectedSymbol] || "";

    document.getElementById(
      "trade-exchange-rate"
    ).value =
      usdKrw || "";

    document.getElementById(
      "trade-total-krw"
    ).value =
      "";

  } else {

    const trade =
      getTrades(selectedSymbol)[index];

    if (!trade) return;


    document.getElementById(
      "trade-date"
    ).value =
      trade.date || todayString();

    document.getElementById(
      "trade-shares"
    ).value =
      trade.shares ?? "";

    document.getElementById(
      "trade-price"
    ).value =
      trade.price ?? "";

    document.getElementById(
      "trade-exchange-rate"
    ).value =
      trade.exchangeRate ?? "";

    document.getElementById(
      "trade-total-krw"
    ).value =
      trade.totalKRW ?? "";
  }
}


/* ======================================================
   거래 저장
====================================================== */

function saveTrade() {

  if (!selectedSymbol) return;


  const date =
    document.getElementById(
      "trade-date"
    ).value;


  const shares =
    num(
      document.getElementById(
        "trade-shares"
      ).value
    );


  const price =
    num(
      document.getElementById(
        "trade-price"
      ).value
    );


  const exchangeRate =
    num(
      document.getElementById(
        "trade-exchange-rate"
      ).value
    );


  const totalKRW =
    num(
      document.getElementById(
        "trade-total-krw"
      ).value
    );


  if (!date) {

    alert("거래 날짜를 입력해줘.");

    return;
  }


  if (shares <= 0) {

    alert("수량을 입력해줘.");

    return;
  }


  /*
   * 가격과 환율 둘 중 하나만 입력해도 되도록 처리
   */

  if (price <= 0 && totalKRW <= 0) {

    alert(
      "USD 가격 또는 총 원화금액 중 하나를 입력해줘."
    );

    return;
  }


  let finalPrice = price;
  let finalRate = exchangeRate;
  let finalTotalKRW = totalKRW;


  if (tradeType === "buy") {

    /*
     * USD 가격 + 환율
     * → 원화 자동 계산
     */

    if (
      price > 0 &&
      exchangeRate > 0 &&
      totalKRW <= 0
    ) {

      finalTotalKRW =
        shares *
        price *
        exchangeRate;
    }


    /*
     * USD 가격 + 원화
     * → 환율 자동 계산
     */

    else if (
      price > 0 &&
      totalKRW > 0 &&
      exchangeRate <= 0
    ) {

      finalRate =
        totalKRW /
        (
          shares *
          price
        );
    }


    /*
     * 원화 + 환율
     * → USD 가격 자동 계산
     */

    else if (
      totalKRW > 0 &&
      exchangeRate > 0 &&
      price <= 0
    ) {

      finalPrice =
        totalKRW /
        (
          shares *
          exchangeRate
        );
    }


    /*
     * 아무것도 계산할 수 없는 경우
     */

    else if (
      finalPrice <= 0 ||
      finalRate <= 0
    ) {

      alert(
        "USD 가격과 환율 또는 원화금액을 확인해줘."
      );

      return;
    }


    /*
     * 원화 금액이 아직 없으면 계산
     */

    if (finalTotalKRW <= 0) {

      finalTotalKRW =
        shares *
        finalPrice *
        finalRate;
    }


    /*
     * 환율이 아직 없으면 계산
     */

    if (finalRate <= 0) {

      finalRate =
        finalTotalKRW /
        (
          shares *
          finalPrice
        );
    }


    /*
     * 가격이 아직 없으면 계산
     */

    if (finalPrice <= 0) {

      finalPrice =
        finalTotalKRW /
        (
          shares *
          finalRate
        );
    }

  } else {

    /*
     * 매도
     */

    if (finalRate <= 0) {

      if (
        totalKRW > 0 &&
        finalPrice > 0
      ) {

        finalRate =
          totalKRW /
          (
            shares *
            finalPrice
          );

      } else {

        alert(
          "매도는 가격/환율 또는 총 원화금액을 입력해줘."
        );

        return;
      }
    }


    if (finalTotalKRW <= 0) {

      finalTotalKRW =
        shares *
        finalPrice *
        finalRate;
    }
  }


  const trades =
    getTrades(selectedSymbol);


  const trade = {

    type:
      tradeType,

    date,

    shares,

    price:
      finalPrice,

    exchangeRate:
      finalRate,

    totalKRW:
      finalTotalKRW
  };


  if (
    editingTradeIndex === null
  ) {

    trades.push(trade);

  } else {

    trades[
      editingTradeIndex
    ] = trade;
  }


  saveTrades(
    selectedSymbol,
    trades
  );


  editingTradeIndex =
    null;

  tradeType =
    null;


  document.getElementById(
    "trade-form"
  ).style.display =
    "none";


  updateStockCard(
    selectedSymbol
  );

  updateDetail(
    selectedSymbol
  );

  updateTotal();
}


/* ======================================================
   거래 기록
====================================================== */

function renderTradeHistory(symbol) {

  const container =
    document.getElementById(
      "trade-history"
    );

  if (!container) return;


  const trades =
    getTrades(symbol);


  if (trades.length === 0) {

    container.innerHTML =
      `<div class="empty-message">거래 기록 없음</div>`;

    return;
  }


  container.innerHTML =
    trades
      .map((trade, index) => {

        const isBuy =
          trade.type === "buy";


        let profitHTML = "";


        if (!isBuy) {

          const previous =
            calculateProfitBeforeTrade(
              symbol,
              index
            );


          const quantity =
            num(trade.shares);


          const soldCostKRW =
            previous.shares > 0
              ? (
                  previous.costKRW *
                  (
                    quantity /
                    previous.shares
                  )
                )
              : 0;


          const revenue =
            num(trade.totalKRW) > 0
              ? num(trade.totalKRW)
              : (
                  quantity *
                  num(trade.price) *
                  num(trade.exchangeRate)
                );


          const profit =
            revenue -
            soldCostKRW;


          profitHTML =
            `<div class="history-profit ${profit >= 0 ? "up" : "down"}">
              ${signedKrw(profit)}
            </div>`;
        }


        return `
          <div class="history-item">

            <div class="history-main">

              <div class="history-type">
                ${isBuy ? "매수" : "매도"}
              </div>

              <div class="history-info">
                ${formatDate(trade.date)}
                · ${quantityFormat(trade.shares)}주
                · ${usd(trade.price)}
                · 환율 ${num(trade.exchangeRate).toLocaleString()}
                ${num(trade.totalKRW) > 0
                  ? `· ${krw(trade.totalKRW)}`
                  : ""}
              </div>

            </div>

            ${profitHTML}

            <div class="history-actions">

              <button
                onclick="editTrade(${index})"
              >
                수정
              </button>

              <button
                onclick="deleteTrade(${index})"
              >
                삭제
              </button>

            </div>

          </div>
        `;

      })
      .join("");
}


function quantityFormat(value) {

  return num(value)
    .toLocaleString(
      "ko-KR",
      {
        maximumFractionDigits: 6
      }
    );
}


/* ======================================================
   거래 이전 상태
====================================================== */

function calculateProfitBeforeTrade(
  symbol,
  targetIndex
) {

  const trades =
    getTrades(symbol)
      .slice(
        0,
        targetIndex
      );


  let shares = 0;
  let costKRW = 0;
  let costUSD = 0;


  for (const trade of trades) {

    const quantity =
      num(trade.shares);

    const price =
      num(trade.price);

    const rate =
      num(trade.exchangeRate);


    if (
      quantity <= 0 ||
      price <= 0 ||
      rate <= 0
    ) continue;


    if (
      trade.type === "buy"
    ) {

      shares += quantity;

      costUSD +=
        quantity * price;

      costKRW +=
        num(trade.totalKRW) > 0
          ? num(trade.totalKRW)
          : quantity *
            price *
            rate;

    } else {

      if (shares <= 0) continue;


      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      const ratio =
        sellQuantity /
        shares;


      costUSD -=
        costUSD * ratio;

      costKRW -=
        costKRW * ratio;

      shares -=
        sellQuantity;
    }
  }


  return {
    shares,
    costKRW,
    costUSD
  };
}


/* ======================================================
   거래 수정
====================================================== */

function editTrade(index) {

  const trade =
    getTrades(
      selectedSymbol
    )[index];


  if (!trade) return;


  showTradeForm(
    trade.type,
    index
  );
}


/* ======================================================
   거래 삭제
====================================================== */

function deleteTrade(index) {

  if (!selectedSymbol) return;


  const trades =
    getTrades(
      selectedSymbol
    );


  if (!trades[index]) return;


  if (
    !confirm(
      "이 거래 기록을 삭제할까?"
    )
  ) {
    return;
  }


  trades.splice(
    index,
    1
  );


  saveTrades(
    selectedSymbol,
    trades
  );


  updateDetail(
    selectedSymbol
  );

  updateStockCard(
    selectedSymbol
  );

  updateTotal();
}


/* ======================================================
   일간 수익 저장
====================================================== */

function getDailyRecords() {

  const raw =
    localStorage.getItem(
      "daily_profit_records"
    );


  if (!raw) return [];


  try {

    const data =
      JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];

  } catch {

    return [];
  }
}


function saveDailyRecords(records) {

  localStorage.setItem(
    "daily_profit_records",
    JSON.stringify(records)
  );
}


/* ======================================================
   일간 자동 계산용 스냅샷
====================================================== */

function getDailySnapshots() {

  const raw =
    localStorage.getItem(
      "daily_asset_snapshots"
    );


  if (!raw) return [];


  try {

    const data =
      JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];

  } catch {

    return [];
  }
}


function saveDailySnapshots(data) {

  localStorage.setItem(
    "daily_asset_snapshots",
    JSON.stringify(data)
  );
}


/*
 * 날짜별 마지막으로 저장된 자산 상태
 */

function getSnapshot(date) {

  return getDailySnapshots()
    .find(
      item =>
        item.date === date
    );
}


/*
 * 현재 자산 상태 저장
 */

function saveCurrentSnapshot() {

  const date =
    todayString();


  const value =
    getTotalAssets();

  const fx =
    getTotalFXProfit();


  const snapshots =
    getDailySnapshots();


  const existingIndex =
    snapshots.findIndex(
      item =>
        item.date === date
    );


  const snapshot = {

    date,

    value,

    fx,

    timestamp:
      Date.now()
  };


  if (existingIndex >= 0) {

    snapshots[
      existingIndex
    ] = snapshot;

  } else {

    snapshots.push(
      snapshot
    );
  }


  /*
   * 최근 400일만 보관
   */

  snapshots.sort(
    (a, b) =>
      String(a.date)
        .localeCompare(
          String(b.date)
        )
  );


  if (snapshots.length > 400) {

    snapshots.splice(
      0,
      snapshots.length - 400
    );
  }


  saveDailySnapshots(
    snapshots
  );
}


/* ======================================================
   일간 자동 기록
====================================================== */

function updateAutomaticDailyRecord() {

  const today =
    todayString();


  const snapshots =
    getDailySnapshots();


  /*
   * 오늘 이미 기준값이 있으면
   * 현재 상태만 갱신
   */

  const todaySnapshot =
    snapshots.find(
      item =>
        item.date === today
    );


  /*
   * 오늘 첫 실행
   */

  if (!todaySnapshot) {

    /*
     * 가장 최근 날짜의 마지막 상태를
     * 전날 기준으로 사용
     */

    const previousSnapshots =
      snapshots
        .filter(
          item =>
            item.date < today
        )
        .sort(
          (a, b) =>
            String(b.date)
              .localeCompare(
                String(a.date)
              )
        );


    const previous =
      previousSnapshots[0];


    /*
     * 이전 기록이 있으면
     * 오늘 시작값을 이전 마지막 값으로 설정
     */

    if (previous) {

      const currentValue =
        getTotalAssets();

      const currentFX =
        getTotalFXProfit();


      const dailyKRW =
        currentValue -
        previous.value;


      const dailyFX =
        currentFX -
        previous.fx;


      const dailyRate =
        previous.value > 0
          ? (
              dailyKRW /
              previous.value
            ) * 100
          : 0;


      const records =
        getDailyRecords();


      const existing =
        records.findIndex(
          item =>
            item.date === today
        );


      const record = {

        date: today,

        krw: dailyKRW,

        usd:
          usdKrw > 0
            ? dailyKRW / usdKrw
            : 0,

        rate: dailyRate,

        fx: dailyFX,

        automatic: true
      };


      if (existing >= 0) {

        /*
         * 자동 기록이 이미 있으면
         * 다시 덮지 않음
         */

      } else {

        records.push(record);

        saveDailyRecords(
          records
        );
      }
    }


    /*
     * 오늘의 첫 기준값 생성
     */

    const newSnapshots =
      getDailySnapshots();


    newSnapshots.push({

      date: today,

      value:
        getTotalAssets(),

      fx:
        getTotalFXProfit(),

      timestamp:
        Date.now()
    });


    saveDailySnapshots(
      newSnapshots
    );

    return;
  }


  /*
   * 오늘 이미 시작값이 있으면
   * 오늘의 자동 일간 수익을 실시간 갱신
   */

  const currentValue =
    getTotalAssets();

  const currentFX =
    getTotalFXProfit();


  const dailyKRW =
    currentValue -
    todaySnapshot.value;


  const dailyFX =
    currentFX -
    todaySnapshot.fx;


  const dailyRate =
    todaySnapshot.value > 0
      ? (
          dailyKRW /
          todaySnapshot.value
        ) * 100
      : 0;


  const records =
    getDailyRecords();


  const existingIndex =
    records.findIndex(
      item =>
        item.date === today
    );


  const record = {

    date: today,

    krw: dailyKRW,

    usd:
      usdKrw > 0
        ? dailyKRW / usdKrw
        : 0,

    rate: dailyRate,

    fx: dailyFX,

    automatic: true
  };


  /*
   * 오늘 기록은 계속 업데이트
   */

  if (existingIndex >= 0) {

    /*
     * 사용자가 직접 입력한 기록은
     * 자동 기록으로 덮어쓰지 않음
     */

    if (
      records[existingIndex].automatic === true
    ) {

      records[
        existingIndex
      ] = record;

      saveDailyRecords(
        records
      );
    }

  } else {

    records.push(record);

    saveDailyRecords(
      records
    );
  }
}


/* ======================================================
   오늘 일간수익
====================================================== */

function updateDailyProfit() {

  const records =
    getDailyRecords();


  const today =
    todayString();


  const record =
    records.find(
      item =>
        item.date === today
    );


  const dateElement =
    document.getElementById(
      "daily-date"
    );

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


  if (dateElement) {

    dateElement.textContent =
      today.replaceAll(
        "-",
        "."
      );
  }


  if (!record) {

    if (krwElement)
      krwElement.textContent = "--";

    if (usdElement)
      usdElement.textContent = "--";

    if (rateElement)
      rateElement.textContent = "--";

    return;
  }


  const krwValue =
    num(record.krw);

  const usdValue =
    num(record.usd);

  const rateValue =
    num(record.rate);


  if (krwElement) {

    krwElement.textContent =
      signedKrw(krwValue);

    colorize(
      krwElement,
      krwValue
    );
  }


  if (usdElement) {

    usdElement.textContent =
      signedUsd(usdValue);

    colorize(
      usdElement,
      usdValue
    );
  }


  if (rateElement) {

    rateElement.textContent =
      percent(rateValue);

    colorize(
      rateElement,
      rateValue
    );
  }
}


/* ======================================================
   일간 목록
====================================================== */

function renderDailyList() {

  const container =
    document.getElementById(
      "daily-list"
    );

  if (!container) return;


  const records =
    getDailyRecords()
      .sort(
        (a, b) =>
          String(b.date)
            .localeCompare(
              String(a.date)
            )
      );


  if (records.length === 0) {

    container.innerHTML =
      `<div class="empty-message">
        일간 수익 기록 없음
      </div>`;

    return;
  }


  container.innerHTML =
    records
      .map(record => {

        const money =
          num(record.krw);

        const rate =
          num(record.rate);

        const fx =
          num(record.fx);


        return `
          <div class="daily-list-item">

            <div>

              <div class="daily-list-date">
                ${String(record.date).replaceAll("-", ".")}
              </div>

              <div class="daily-list-money">
                ${signedKrw(money)}
                · ${signedUsd(record.usd)}
              </div>

              ${
                fx !== 0
                  ? `
                    <div class="daily-list-fx">
                      환차익 ${signedKrw(fx)}
                    </div>
                  `
                  : ""
              }

            </div>

            <div
              class="daily-list-rate ${rate >= 0 ? "up" : "down"}"
            >
              ${percent(rate)}
            </div>

          </div>
        `;

      })
      .join("");
}


/* ======================================================
   일간 모달
====================================================== */

function openDailyModal() {

  document.getElementById(
    "daily-modal"
  ).style.display =
    "flex";


  editingDailyIndex =
    null;


  clearDailyEditor();

  renderDailyHistory();
}


function closeDailyModal() {

  document.getElementById(
    "daily-modal"
  ).style.display =
    "none";
}


/* ======================================================
   일간 기록 출력
====================================================== */

function renderDailyHistory() {

  const container =
    document.getElementById(
      "daily-history"
    );


  const originalRecords =
    getDailyRecords();


  const records =
    [...originalRecords]
      .sort(
        (a, b) =>
          String(b.date)
            .localeCompare(
              String(a.date)
            )
      );


  if (records.length === 0) {

    container.innerHTML =
      `<div class="empty-message">
        일간 수익 기록 없음
      </div>`;

  } else {

    container.innerHTML =
      records
        .map((record) => {

          const originalIndex =
            originalRecords.findIndex(
              item =>
                item.date === record.date
            );


          const rate =
            num(record.rate);

          const money =
            num(record.krw);


          return `
            <div class="daily-history-item">

              <div>

                <div class="daily-history-date">
                  ${String(record.date).replaceAll("-", ".")}
                </div>

                <div class="daily-history-money">
                  ${signedKrw(money)}
                  · ${signedUsd(record.usd)}
                  ${
                    num(record.fx) !== 0
                      ? ` · 환차익 ${signedKrw(record.fx)}`
                      : ""
                  }
                </div>

              </div>

              <div class="daily-history-rate ${rate >= 0 ? "up" : "down"}">
                ${percent(rate)}
              </div>

              <div class="daily-history-actions">

                <button
                  onclick="editDaily(${originalIndex})"
                >
                  수정
                </button>

                <button
                  onclick="deleteDaily(${originalIndex})"
                >
                  삭제
                </button>

              </div>

            </div>
          `;

        })
        .join("");
  }


  const totalRate =
    getDailyRecords()
      .reduce(
        (sum, item) =>
          sum + num(item.rate),
        0
      );


  const totalElement =
    document.getElementById(
      "daily-total-rate"
    );


  if (totalElement) {

    totalElement.textContent =
      percent(totalRate);

    colorize(
      totalElement,
      totalRate
    );
  }
}


/* ======================================================
   일간 수정
====================================================== */

function editDaily(index) {

  const records =
    getDailyRecords();


  const record =
    records[index];


  if (!record) return;


  editingDailyIndex =
    index;


  document.getElementById(
    "daily-edit-date"
  ).value =
    record.date || "";


  document.getElementById(
    "daily-edit-krw"
  ).value =
    record.krw ?? "";


  document.getElementById(
    "daily-edit-usd"
  ).value =
    record.usd ?? "";


  document.getElementById(
    "daily-edit-rate"
  ).value =
    record.rate ?? "";


  document.getElementById(
    "daily-edit-fx"
  ).value =
    record.fx ?? "";
}


/* ======================================================
   일간 삭제
====================================================== */

function deleteDaily(index) {

  const records =
    getDailyRecords();


  if (!records[index]) return;


  if (
    !confirm(
      "이 날짜의 일간 수익 기록을 삭제할까?"
    )
  ) {
    return;
  }


  records.splice(
    index,
    1
  );


  saveDailyRecords(
    records
  );


  renderDailyHistory();

  renderDailyList();

  updateDailyProfit();
}


/* ======================================================
   일간 저장
====================================================== */

function saveDaily() {

  const date =
    document.getElementById(
      "daily-edit-date"
    ).value;


  const krwValue =
    num(
      document.getElementById(
        "daily-edit-krw"
      ).value
    );


  const usdValue =
    num(
      document.getElementById(
        "daily-edit-usd"
      ).value
    );


  const rateValue =
    num(
      document.getElementById(
        "daily-edit-rate"
      ).value
    );


  const fxValue =
    num(
      document.getElementById(
        "daily-edit-fx"
      ).value
    );


  if (!date) {

    alert(
      "날짜를 입력해줘."
    );

    return;
  }


  const records =
    getDailyRecords();


  const record = {

    date,

    krw:
      krwValue,

    usd:
      usdValue,

    rate:
      rateValue,

    fx:
      fxValue,

    automatic: false
  };


  if (
    editingDailyIndex === null
  ) {

    const existingIndex =
      records.findIndex(
        item =>
          item.date === date
      );


    if (
      existingIndex >= 0
    ) {

      records[
        existingIndex
      ] = record;

    } else {

      records.push(record);
    }

  } else {

    records[
      editingDailyIndex
    ] = record;
  }


  saveDailyRecords(
    records
  );


  editingDailyIndex =
    null;


  clearDailyEditor();

  renderDailyHistory();

  renderDailyList();

  updateDailyProfit();
}


/* ======================================================
   일간 입력 초기화
====================================================== */

function clearDailyEditor() {

  document.getElementById(
    "daily-edit-date"
  ).value =
    todayString();


  document.getElementById(
    "daily-edit-krw"
  ).value =
    "";


  document.getElementById(
    "daily-edit-usd"
  ).value =
    "";


  document.getElementById(
    "daily-edit-rate"
  ).value =
    "";


  document.getElementById(
    "daily-edit-fx"
  ).value =
    "";
}


/* ======================================================
   가격 히스토리
====================================================== */

function getPriceHistory(symbol) {

  const key =
    `price_history_${symbol}`;


  const raw =
    localStorage.getItem(key);


  if (!raw) return [];


  try {

    const data =
      JSON.parse(raw);

    return Array.isArray(data)
      ? data
      : [];

  } catch {

    return [];
  }
}


function savePriceHistory(
  symbol,
  price
) {

  if (price <= 0) return;


  const key =
    `price_history_${symbol}`;


  const history =
    getPriceHistory(symbol);


  history.push({

    time:
      Date.now(),

    price
  });


  /*
   * 최대 약 1년치 분 단위 데이터
   */

  const max =
    525600;


  if (history.length > max) {

    history.splice(
      0,
      history.length - max
    );
  }


  localStorage.setItem(
    key,
    JSON.stringify(history)
  );
}


/* ======================================================
   그래프
====================================================== */

function drawStockChart(symbol) {

  const canvas =
    document.getElementById(
      "stock-chart"
    );

  const empty =
    document.getElementById(
      "chart-empty"
    );


  if (!canvas) return;


  const history =
    getPriceHistory(symbol);


  const now =
    Date.now();


  let duration;


  if (chartPeriod === "1D") {

    duration =
      24 * 60 * 60 * 1000;

  } else if (chartPeriod === "1W") {

    duration =
      7 * 24 * 60 * 60 * 1000;

  } else {

    duration =
      30 * 24 * 60 * 60 * 1000;
  }


  const filtered =
    history.filter(
      item =>
        item.time >=
        now - duration
    );


  if (filtered.length < 2) {

    canvas.style.display =
      "none";

    if (empty) {

      empty.style.display =
        "block";

      empty.textContent =
        chartPeriod === "1D"
          ? "가격 데이터가 2개 이상 쌓이면 그래프가 표시됩니다."
          : "사이트에서 수집된 데이터가 부족합니다.";
    }

    return;
  }


  canvas.style.display =
    "block";


  if (empty) {

    empty.style.display =
      "none";
  }


  const rect =
    canvas.getBoundingClientRect();


  const dpr =
    window.devicePixelRatio || 1;


  canvas.width =
    rect.width * dpr;

  canvas.height =
    rect.height * dpr;


  const ctx =
    canvas.getContext("2d");


  ctx.scale(
    dpr,
    dpr
  );


  const width =
    rect.width;

  const height =
    rect.height;


  const padding = {

    left: 8,

    right: 8,

    top: 12,

    bottom: 15
  };


  const values =
    filtered.map(
      item =>
        num(item.price)
    );


  let min =
    Math.min(...values);

  let max =
    Math.max(...values);


  if (min === max) {

    min -= 1;
    max += 1;
  }


  const range =
    max - min;


  min -=
    range * 0.08;

  max +=
    range * 0.08;


  const x =
    index => {

      return (
        padding.left +
        (
          index /
          (filtered.length - 1)
        ) *
        (
          width -
          padding.left -
          padding.right
        )
      );
    };


  const y =
    value => {

      return (
        height -
        padding.bottom -
        (
          (value - min) /
          (max - min)
        ) *
        (
          height -
          padding.top -
          padding.bottom
        )
      );
    };


  /*
   * 그래프 선
   */

  ctx.beginPath();


  filtered.forEach(
    (item, index) => {

      const px =
        x(index);

      const py =
        y(item.price);


      if (index === 0) {

        ctx.moveTo(
          px,
          py
        );

      } else {

        ctx.lineTo(
          px,
          py
        );
      }
    }
  );


  ctx.lineWidth = 2;

  ctx.strokeStyle =
    "#36d39a";

  ctx.stroke();


  /*
   * 마지막 점
   */

  const last =
    filtered[
      filtered.length - 1
    ];


  const lastX =
    x(
      filtered.length - 1
    );

  const lastY =
    y(last.price);


  ctx.beginPath();

  ctx.arc(
    lastX,
    lastY,
    3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle =
    "#36d39a";

  ctx.fill();


  /*
   * 시작/현재 가격
   */

  ctx.font =
    "10px sans-serif";

  ctx.fillStyle =
    "#777e89";

  ctx.textAlign =
    "left";

  ctx.fillText(
    usd(values[0]),
    8,
    height - 2
  );


  ctx.textAlign =
    "right";

  ctx.fillText(
    usd(values[values.length - 1]),
    width - 8,
    height - 2
  );
}


/* ======================================================
   시장값
====================================================== */

function setMarketValue(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (!element) return;


  const n =
    num(value);


  element.textContent =
    n > 0
      ? n.toLocaleString(
          "ko-KR",
          {
            maximumFractionDigits: 2
          }
        )
      : "--";
}


/* ======================================================
   API
====================================================== */

async function loadQuotes() {

  try {

    const response =
      await fetch(
        `${API_URL}?t=${Date.now()}`,
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


    /* ==================================================
       환율
    ================================================== */

    if (
      num(data.USD_KRW) > 0
    ) {

      usdKrw =
        num(data.USD_KRW);
    }


    const exchange =
      document.getElementById(
        "usdkrw"
      );


    if (exchange) {

      exchange.textContent =
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
       주가
    ================================================== */

    symbols.forEach(symbol => {

      if (
        num(data[symbol]) > 0
      ) {

        prices[symbol] =
          num(data[symbol]);

        savePriceHistory(
          symbol,
          prices[symbol]
        );
      }

      updateStockCard(
        symbol
      );
    });


    /* ==================================================
       주요 시장
    ================================================== */

    setMarketValue(
      "kospi",
      data.KOSPI
    );

    setMarketValue(
      "kosdaq",
      data.KOSDAQ
    );

    setMarketValue(
      "sp500",
      data.SP500
    );

    setMarketValue(
      "nasdaq",
      data.NASDAQ
    );


    /*
     * 전체 계산
     */

    updateTotal();


    /*
     * 오늘 자동 일간 수익 계산
     */

    updateAutomaticDailyRecord();

    updateDailyProfit();

    renderDailyList();


    /*
     * 상세 화면
     */

    if (selectedSymbol) {

      updateDetail(
        selectedSymbol
      );
    }


    const updated =
      document.getElementById(
        "last-updated"
      );


    if (updated) {

      updated.textContent =
        new Date()
          .toLocaleTimeString(
            "ko-KR",
            {
              hour: "2-digit",
              minute: "2-digit"
            }
          );
    }


  } catch (error) {

    console.error(
      "시세 업데이트 실패:",
      error
    );
  }
}


/* ======================================================
   이벤트
====================================================== */

function setupEvents() {

  /* 종목 클릭 */

  document
    .querySelectorAll(
      ".stock-card"
    )
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


  /* 뒤로 */

  document
    .getElementById(
      "back-button"
    )
    .addEventListener(
      "click",
      closeDetail
    );


  /* 새로고침 */

  document
    .getElementById(
      "refresh-button"
    )
    .addEventListener(
      "click",
      loadQuotes
    );


  /* 매수 */

  document
    .getElementById(
      "detail-buy-button"
    )
    .addEventListener(
      "click",
      () => {

        showTradeForm(
          "buy"
        );

      }
    );


  /* 매도 */

  document
    .getElementById(
      "detail-sell-button"
    )
    .addEventListener(
      "click",
      () => {

        showTradeForm(
          "sell"
        );

      }
    );


  /* 거래 저장 */

  document
    .getElementById(
      "trade-submit"
    )
    .addEventListener(
      "click",
      saveTrade
    );


  /* 일간 열기 */

  document
    .getElementById(
      "daily-open-button"
    )
    .addEventListener(
      "click",
      openDailyModal
    );


  /* 일간 닫기 */

  document
    .getElementById(
      "daily-close"
    )
    .addEventListener(
      "click",
      closeDailyModal
    );


  /* 일간 저장 */

  document
    .getElementById(
      "daily-save"
    )
    .addEventListener(
      "click",
      saveDaily
    );


  /* 일간 취소 */

  document
    .getElementById(
      "daily-cancel"
    )
    .addEventListener(
      "click",
      () => {

        editingDailyIndex =
          null;

        clearDailyEditor();
      }
    );


  /* 모달 바깥 */

  document
    .getElementById(
      "daily-modal"
    )
    .addEventListener(
      "click",
      event => {

        if (
          event.target.id ===
          "daily-modal"
        ) {

          closeDailyModal();
        }
      }
    );


  /* 그래프 기간 */

  document
    .querySelectorAll(
      ".chart-period"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          document
            .querySelectorAll(
              ".chart-period"
            )
            .forEach(item => {

              item.classList.remove(
                "active"
              );

            });


          button.classList.add(
            "active"
          );


          chartPeriod =
            button.dataset.period;


          if (selectedSymbol) {

            drawStockChart(
              selectedSymbol
            );
          }

        }
      );

    });


  /*
   * 화면 크기 변경
   */

  window.addEventListener(
    "resize",
    () => {

      if (selectedSymbol) {

        drawStockChart(
          selectedSymbol
        );
      }

    }
  );
}


/* ======================================================
   시작
====================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    updateDailyProfit();

    renderDailyList();


    /*
     * 1분마다 시세 갱신
     */

    setInterval(
      loadQuotes,
      60000
    );

  }
);