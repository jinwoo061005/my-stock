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


function quantityFormat(value) {

  return num(value).toLocaleString(
    "ko-KR",
    {
      maximumFractionDigits: 6
    }
  );
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
   거래
====================================================== */

function getTrades(symbol) {

  const raw =
    localStorage.getItem(
      `${symbol}_trades`
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

    let rate =
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


      /*
       * 실제 총 원화가 있으면
       * 그것을 원가로 사용
       */

      let buyKRW =
        num(trade.totalKRW);


      /*
       * 원화가 없으면
       * 환율로 계산
       */

      if (buyKRW <= 0) {

        if (rate <= 0) {
          rate = usdKrw;
        }

        buyKRW =
          buyUSD * rate;
      }


      /*
       * 환율이 비어 있으면
       * 실제 원화금액으로 역산
       */

      if (
        rate <= 0 &&
        buyKRW > 0
      ) {

        rate =
          buyKRW / buyUSD;
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


      let revenueKRW =
        num(trade.totalKRW);


      if (revenueKRW <= 0) {

        if (rate <= 0) {
          rate = usdKrw;
        }

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


  /* ==================================================
     현재
  ================================================== */

  const price =
    num(prices[symbol]);


  const marketUSD =
    price * shares;


  const marketKRW =
    marketUSD * usdKrw;


  /*
   * 주가 수익
   */

  const stockProfitKRW =
    (
      marketUSD -
      costUSD
    ) * usdKrw;


  /*
   * 환차익
   */

  const fxProfitKRW =
    (
      costUSD * usdKrw
    ) -
    costKRW;


  /*
   * 전체 평가수익
   */

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
      `${quantityFormat(stock.shares)}주`;
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
   전체 계산
====================================================== */

function getPortfolioSnapshot() {

  let totalValueKRW = 0;
  let totalValueUSD = 0;

  let totalCostKRW = 0;

  let evaluationProfitKRW = 0;

  let fxProfitKRW = 0;

  let stockProfitKRW = 0;

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

    stockProfitKRW +=
      stock.stockProfitKRW;

    realizedKRW +=
      stock.realizedKRW;
  });


  return {

    totalValueKRW,
    totalValueUSD,

    totalCostKRW,

    evaluationProfitKRW,

    evaluationRate:
      totalCostKRW > 0
        ? (
            evaluationProfitKRW /
            totalCostKRW
          ) * 100
        : 0,

    fxProfitKRW,
    stockProfitKRW,
    realizedKRW
  };
}


/* ======================================================
   전체 화면
====================================================== */

function updateTotal() {

  const snapshot =
    getPortfolioSnapshot();


  const totalValue =
    document.getElementById(
      "total-value"
    );

  if (totalValue) {

    totalValue.textContent =
      krw(snapshot.totalValueKRW);
  }


  const totalDollar =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollar) {

    totalDollar.textContent =
      usd(snapshot.totalValueUSD);
  }


  const totalProfit =
    document.getElementById(
      "total-profit"
    );

  if (totalProfit) {

    totalProfit.textContent =
      snapshot.totalCostKRW > 0
        ? `${signedKrw(snapshot.evaluationProfitKRW)} (${percent(snapshot.evaluationRate)})`
        : "--";

    colorize(
      totalProfit,
      snapshot.evaluationProfitKRW
    );
  }


  const totalFX =
    document.getElementById(
      "total-fx-profit"
    );

  if (totalFX) {

    totalFX.textContent =
      snapshot.totalCostKRW > 0
        ? signedKrw(snapshot.fxProfitKRW)
        : "--";

    colorize(
      totalFX,
      snapshot.fxProfitKRW
    );
  }


  const totalFXInline =
    document.getElementById(
      "total-fx-profit-inline"
    );

  if (totalFXInline) {

    totalFXInline.textContent =
      snapshot.totalCostKRW > 0
        ? `환차익 ${signedKrw(snapshot.fxProfitKRW)}`
        : "환차익 --";

    colorize(
      totalFXInline,
      snapshot.fxProfitKRW
    );
  }


  const totalStock =
    document.getElementById(
      "total-stock-profit"
    );

  if (totalStock) {

    totalStock.textContent =
      snapshot.totalCostKRW > 0
        ? signedKrw(snapshot.stockProfitKRW)
        : "--";

    colorize(
      totalStock,
      snapshot.stockProfitKRW
    );
  }


  const realized =
    document.getElementById(
      "total-realized-profit"
    );

  if (realized) {

    realized.textContent =
      signedKrw(snapshot.realizedKRW);

    colorize(
      realized,
      snapshot.realizedKRW
    );
  }


  updateAllocation();

  updateDailyProfit();
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
    detailSymbol.textContent =
      symbol;
  }


  if (detailPrice) {

    detailPrice.textContent =
      stock.price > 0
        ? usd(stock.price)
        : "--";
  }


  if (detailShares) {

    detailShares.textContent =
      `${quantityFormat(stock.shares)}주`;
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


  renderTradeHistory(symbol);

  recordPriceHistory(symbol);

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

function showTradeForm(
  type,
  index = null
) {

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
      getTrades(
        selectedSymbol
      )[index];


    if (!trade) return;


    document.getElementById(
      "trade-date"
    ).value =
      trade.date ||
      todayString();

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
      trade.totalKRW || "";
  }


  updateTradeCalculation();
}


/* ======================================================
   거래 입력 계산
====================================================== */

function updateTradeCalculation() {

  const box =
    document.getElementById(
      "trade-calculation"
    );

  if (!box) return;


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


  let rate =
    num(
      document.getElementById(
        "trade-exchange-rate"
      ).value
    );


  let totalKRW =
    num(
      document.getElementById(
        "trade-total-krw"
      ).value
    );


  if (
    shares <= 0 ||
    price <= 0
  ) {

    box.textContent =
      "수량과 주가를 입력하면 계산됩니다.";

    return;
  }


  const totalUSD =
    shares * price;


  /*
   * 원화 입력만 한 경우
   */

  if (
    totalKRW > 0 &&
    rate <= 0
  ) {

    rate =
      totalKRW /
      totalUSD;
  }


  /*
   * 환율 입력만 한 경우
   */

  if (
    rate > 0 &&
    totalKRW <= 0
  ) {

    totalKRW =
      totalUSD *
      rate;
  }


  if (
    rate > 0 &&
    totalKRW > 0
  ) {

    box.innerHTML =
      `총 ${usd(totalUSD)} · 환율 ${rate.toLocaleString("ko-KR", {
        maximumFractionDigits: 2
      })} · 약 ${krw(totalKRW)}`;

    return;
  }


  box.textContent =
    `총 ${usd(totalUSD)} · 환율 또는 원화 금액을 입력해주세요.`;
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


  let exchangeRate =
    num(
      document.getElementById(
        "trade-exchange-rate"
      ).value
    );


  let totalKRW =
    num(
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


  if (shares <= 0) {

    alert(
      "수량을 입력해줘."
    );

    return;
  }


  if (price <= 0) {

    alert(
      "가격을 입력해줘."
    );

    return;
  }


  const totalUSD =
    shares * price;


  /*
   * 둘 다 없으면 현재 환율 사용
   */

  if (
    exchangeRate <= 0 &&
    totalKRW <= 0
  ) {

    if (usdKrw <= 0) {

      alert(
        "환율 또는 실제 원화 금액 중 하나를 입력해줘."
      );

      return;
    }

    exchangeRate =
      usdKrw;

    totalKRW =
      totalUSD *
      exchangeRate;
  }


  /*
   * 원화만 입력
   */

  else if (
    totalKRW > 0 &&
    exchangeRate <= 0
  ) {

    exchangeRate =
      totalKRW /
      totalUSD;
  }


  /*
   * 환율만 입력
   */

  else if (
    exchangeRate > 0 &&
    totalKRW <= 0
  ) {

    totalKRW =
      totalUSD *
      exchangeRate;
  }


  /*
   * 매수/매도 모두
   * 실제 총 원화금액을 저장
   */

  if (totalKRW <= 0) {

    alert(
      "실제 원화 금액을 계산할 수 없어."
    );

    return;
  }


  const trades =
    getTrades(
      selectedSymbol
    );


  const trade = {

    type:
      tradeType,

    date,

    shares,

    price,

    exchangeRate,

    totalKRW
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
                · ${krw(trade.totalKRW)}
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
      price <= 0
    ) {
      continue;
    }


    if (
      trade.type === "buy"
    ) {

      const buyUSD =
        quantity * price;


      const buyKRW =
        num(trade.totalKRW) > 0
          ? num(trade.totalKRW)
          : buyUSD * rate;


      shares += quantity;

      costUSD +=
        buyUSD;

      costKRW +=
        buyKRW;

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
   일간 기록
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
   일간 자동 스냅샷
====================================================== */

function getDailySnapshot() {

  const raw =
    localStorage.getItem(
      "daily_portfolio_snapshot"
    );


  if (!raw) return null;


  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}


function saveDailySnapshot(snapshot) {

  localStorage.setItem(
    "daily_portfolio_snapshot",
    JSON.stringify(snapshot)
  );
}


/*
 * 핵심:
 *
 * 오늘 처음 사이트를 열었을 때
 * 이전에 저장된 날짜와 오늘 날짜가 다르면
 * 이전 날짜의 평가금과 비교해서
 * 자동으로 일간 수익을 생성.
 *
 * 이후 오늘 동안에는
 * 스냅샷만 현재값으로 계속 업데이트.
 */

function processAutomaticDailyProfit() {

  const today =
    todayString();


  const current =
    getPortfolioSnapshot();


  const previous =
    getDailySnapshot();


  /*
   * 첫 실행이면 기준값만 저장
   */

  if (!previous) {

    saveDailySnapshot({

      date: today,

      valueKRW:
        current.totalValueKRW,

      valueUSD:
        current.totalValueUSD,

      usdKrw

    });

    return;
  }


  /*
   * 같은 날짜
   *
   * 오늘의 기준값은 유지.
   */

  if (
    previous.date === today
  ) {
    return;
  }


  /*
   * 날짜가 바뀌었음
   */

  const previousValueKRW =
    num(previous.valueKRW);


  const currentValueKRW =
    current.totalValueKRW;


  const previousValueUSD =
    num(previous.valueUSD);


  const currentValueUSD =
    current.totalValueUSD;


  /*
   * 단순 평가금 변화
   */

  const dailyKRW =
    currentValueKRW -
    previousValueKRW;


  const dailyUSD =
    currentValueUSD -
    previousValueUSD;


  /*
   * 환차익
   *
   * 전일 보유 달러와
   * 오늘 환율 변화 기준
   */

  let fxProfit = 0;


  if (
    previousValueUSD > 0 &&
    num(previous.usdKrw) > 0 &&
    usdKrw > 0
  ) {

    fxProfit =
      previousValueUSD *
      (usdKrw - num(previous.usdKrw));
  }


  /*
   * 수익률
   */

  const dailyRate =
    previousValueKRW > 0
      ? (
          dailyKRW /
          previousValueKRW
        ) * 100
      : 0;


  const records =
    getDailyRecords();


  const record = {

    date:
      previous.date,

    krw:
      dailyKRW,

    usd:
      dailyUSD,

    rate:
      dailyRate,

    fx:
      fxProfit,

    automatic:
      true
  };


  const existingIndex =
    records.findIndex(
      item =>
        item.date === previous.date
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


  saveDailyRecords(
    records
  );


  /*
   * 오늘을 새로운 기준일로 설정
   */

  saveDailySnapshot({

    date: today,

    valueKRW:
      currentValueKRW,

    valueUSD:
      currentValueUSD,

    usdKrw
  });
}


/* ======================================================
   오늘 일간수익 표시
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
      krwElement.textContent =
        "기준 수집 중";

    if (usdElement)
      usdElement.textContent =
        "";

    if (rateElement)
      rateElement.textContent =
        "";

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


  const records =
    getDailyRecords()
      .map(
        (record, index) => ({
          ...record,
          originalIndex: index
        })
      )
      .sort(
        (a, b) =>
          String(b.date)
            .localeCompare(
              String(a.date)
            )
      );


  if (
    records.length === 0
  ) {

    container.innerHTML =
      `<div class="empty-message">
        일간 수익 기록 없음
      </div>`;

  } else {

    container.innerHTML =
      records
        .map(record => {

          const rate =
            num(record.rate);

          const money =
            num(record.krw);

          const fx =
            num(record.fx);


          return `
            <div class="daily-history-item">

              <div>

                <div class="daily-history-date">
                  ${String(record.date).replaceAll("-", ".")}
                </div>

                <div class="daily-history-money">

                  ${signedKrw(money)}
                  · ${signedUsd(record.usd)}

                  ${fx !== 0
                    ? ` · 환차익 ${signedKrw(fx)}`
                    : ""}

                  ${record.automatic
                    ? " · 자동"
                    : " · 수동"}

                </div>

              </div>


              <div class="daily-history-rate ${rate >= 0 ? "up" : "down"}">

                ${percent(rate)}

              </div>


              <div class="daily-history-actions">

                <button
                  onclick="editDaily(${record.originalIndex})"
                >
                  수정
                </button>

                <button
                  onclick="deleteDaily(${record.originalIndex})"
                >
                  삭제
                </button>

              </div>

            </div>
          `;

        })
        .join("");
  }


  /*
   * 누적 일간 수익률
   */

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

    automatic:
      false
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

  updateDailyProfit();
}


/* ======================================================
   일간 입력 초기화
====================================================== */

function clearDailyEditor() {

  const date =
    document.getElementById(
      "daily-edit-date"
    );

  const krwInput =
    document.getElementById(
      "daily-edit-krw"
    );

  const usdInput =
    document.getElementById(
      "daily-edit-usd"
    );

  const rateInput =
    document.getElementById(
      "daily-edit-rate"
    );

  const fxInput =
    document.getElementById(
      "daily-edit-fx"
    );


  if (date)
    date.value =
      todayString();

  if (krwInput)
    krwInput.value =
      "";

  if (usdInput)
    usdInput.value =
      "";

  if (rateInput)
    rateInput.value =
      "";

  if (fxInput)
    fxInput.value =
      "";
}


/* ======================================================
   가격 기록
====================================================== */

function getPriceHistory(symbol) {

  const raw =
    localStorage.getItem(
      `${symbol}_price_history`
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


function savePriceHistory(
  symbol,
  history
) {

  localStorage.setItem(
    `${symbol}_price_history`,
    JSON.stringify(history)
  );
}


/*
 * 1분마다 현재 가격을 저장.
 *
 * 최대 500개만 보관.
 */

function recordPriceHistory(symbol) {

  const price =
    num(prices[symbol]);


  if (price <= 0) return;


  const history =
    getPriceHistory(symbol);


  const now =
    Date.now();


  /*
   * 같은 분에 여러 번 저장하지 않음
   */

  const last =
    history[
      history.length - 1
    ];


  if (
    last &&
    now - num(last.time) <
      50000
  ) {
    return;
  }


  history.push({

    time:
      now,

    price
  });


  /*
   * 최근 500개
   */

  while (
    history.length > 500
  ) {
    history.shift();
  }


  savePriceHistory(
    symbol,
    history
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
      "graph-empty"
    );


  if (!canvas) return;


  const history =
    getPriceHistory(symbol);


  if (
    history.length < 2
  ) {

    canvas.style.display =
      "none";

    if (empty) {

      empty.style.display =
        "block";
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
    220 * dpr;


  const ctx =
    canvas.getContext("2d");


  ctx.scale(
    dpr,
    dpr
  );


  const width =
    rect.width;

  const height =
    220;


  ctx.clearRect(
    0,
    0,
    width,
    height
  );


  const values =
    history.map(
      item =>
        num(item.price)
    );


  const min =
    Math.min(...values);

  const max =
    Math.max(...values);


  const range =
    max - min || 1;


  const padding =
    20;


  /*
   * 배경 기준선
   */

  ctx.strokeStyle =
    "#20242b";

  ctx.lineWidth =
    1;


  for (
    let i = 1;
    i < 4;
    i++
  ) {

    const y =
      (
        height /
        4
      ) * i;


    ctx.beginPath();

    ctx.moveTo(
      0,
      y
    );

    ctx.lineTo(
      width,
      y
    );

    ctx.stroke();
  }


  /*
   * 그래프 선
   */

  ctx.beginPath();


  values.forEach(
    (value, index) => {

      const x =
        values.length === 1
          ? 0
          : (
              index /
              (
                values.length -
                1
              )
            ) *
            (
              width -
              padding * 2
            ) +
            padding;


      const y =
        height -
        padding -
        (
          (
            value -
            min
          ) /
          range
        ) *
        (
          height -
          padding * 2
        );


      if (index === 0) {

        ctx.moveTo(
          x,
          y
        );

      } else {

        ctx.lineTo(
          x,
          y
        );
      }

    }
  );


  ctx.strokeStyle =
    "#36d39a";

  ctx.lineWidth =
    2;

  ctx.stroke();


  /*
   * 마지막 가격
   */

  const lastValue =
    values[
      values.length - 1
    ];


  const lastX =
    width - padding;


  const lastY =
    height -
    padding -
    (
      (
        lastValue -
        min
      ) /
      range
    ) *
    (
      height -
      padding * 2
    );


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
   * 현재 가격 텍스트
   */

  ctx.fillStyle =
    "#8d939d";

  ctx.font =
    "11px sans-serif";

  ctx.textAlign =
    "right";

  ctx.fillText(
    usd(lastValue),
    width - 8,
    16
  );
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
      }


      updateStockCard(
        symbol
      );


      /*
       * 가격 기록
       */

      recordPriceHistory(
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
     * 전체
     */

    updateTotal();


    /*
     * 날짜 변경 자동 일간수익
     *
     * 환율과 가격을 새로 받아온 뒤 실행
     */

    processAutomaticDailyProfit();


    /*
     * 그래프
     */

    if (selectedSymbol) {

      updateDetail(
        selectedSymbol
      );
    }


    /*
     * 시간
     */

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
   시장값
====================================================== */

function setMarketValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


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
   이벤트
====================================================== */

function setupEvents() {

  /*
   * 종목 클릭
   */

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


  /*
   * 뒤로
   */

  document
    .getElementById(
      "back-button"
    )
    .addEventListener(
      "click",
      closeDetail
    );


  /*
   * 새로고침
   */

  document
    .getElementById(
      "refresh-button"
    )
    .addEventListener(
      "click",
      loadQuotes
    );


  /*
   * 매수
   */

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


  /*
   * 매도
   */

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


  /*
   * 거래 저장
   */

  document
    .getElementById(
      "trade-submit"
    )
    .addEventListener(
      "click",
      saveTrade
    );


  /*
   * 거래 입력 실시간 계산
   */

  [
    "trade-shares",
    "trade-price",
    "trade-exchange-rate",
    "trade-total-krw"
  ]
  .forEach(id => {

    const element =
      document.getElementById(id);


    if (element) {

      element.addEventListener(
        "input",
        updateTradeCalculation
      );
    }

  });


  /*
   * 일간 열기
   */

  document
    .getElementById(
      "daily-open-button"
    )
    .addEventListener(
      "click",
      openDailyModal
    );


  /*
   * 일간 닫기
   */

  document
    .getElementById(
      "daily-close"
    )
    .addEventListener(
      "click",
      closeDailyModal
    );


  /*
   * 일간 저장
   */

  document
    .getElementById(
      "daily-save"
    )
    .addEventListener(
      "click",
      saveDaily
    );


  /*
   * 일간 초기화
   */

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


  /*
   * 모달 바깥 클릭
   */

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


  /*
   * 화면 크기 변경 시 그래프 재그리기
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


    /*
     * 1분마다 시세 갱신
     */

    setInterval(
      loadQuotes,
      60000
    );

  }
);