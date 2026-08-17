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
      num(trade.exchangeRate) || usdKrw;


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

      const buyKRW =
        buyUSD * rate;


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


      /*
       * 실제 총 원화가 기록되어 있으면
       * 그것을 판매금액으로 사용.
       *
       * 없으면
       * 수량 × 가격 × 환율
       */

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
   * 주가수익
   *
   * 현재 가격과 매수 가격의 차이
   * 현재 환율 기준
   */

  const stockProfitKRW =
    (
      marketUSD -
      costUSD
    ) * usdKrw;


  /*
   * 환차익
   *
   * 현재 보유 중인 달러 원가를
   * 현재 환율로 평가한 것과
   * 실제 매수 원화원가의 차이
   */

  const fxProfitKRW =
    (
      costUSD * usdKrw
    ) -
    costKRW;


  /*
   * 평가금 수익
   *
   * ★ 현재 보유분만
   * ★ 판매수익 제외
   *
   * 주가수익 + 환차익
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


  /* ==================================================
     총 평가금
  ================================================== */

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


  /* ==================================================
     평가금 수익
  ================================================== */

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


  /* ==================================================
     환차익
  ================================================== */

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


  /* ==================================================
     판매수익
  ================================================== */

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


  renderTradeHistory(symbol);
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


  if (price <= 0) {

    alert("가격을 입력해줘.");

    return;
  }


  if (exchangeRate <= 0) {

    alert("거래 당시 환율을 입력해줘.");

    return;
  }


  if (
    tradeType === "sell" &&
    totalKRW <= 0
  ) {

    alert(
      "매도할 때 실제 총 원화 금액을 입력해줘."
    );

    return;
  }


  const trades =
    getTrades(selectedSymbol);


  const trade = {

    type:
      tradeType,

    date,

    shares,

    price,

    exchangeRate,

    totalKRW:
      tradeType === "sell"
        ? totalKRW
        : 0
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

          /*
           * 해당 거래의 판매수익을
           * 정확하게 계산하기 위해
           * 앞의 거래만 다시 계산
           */

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
                ${!isBuy && num(trade.totalKRW) > 0
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
        quantity *
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
            getDailyRecords()
              .findIndex(
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
                  ${num(record.fx) !== 0
                    ? ` · 환차익 ${signedKrw(record.fx)}`
                    : ""}
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


  /* ==================================================
     일간 수익률 합계
     ★ 사용자가 요청한 방식:
       모든 날짜의 일간 수익률을 단순 합산
  ================================================== */

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
      fxValue
  };


  if (
    editingDailyIndex === null
  ) {

    /*
     * 같은 날짜가 이미 있으면
     * 새로 하나 더 만드는 대신 수정
     */

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
    });


    /* ==================================================
       주요시장
       
       API에서 값이 넘어오는 경우 표시.
       현재 /api/quote에 없는 값은 -- 유지.
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


    updateTotal();


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