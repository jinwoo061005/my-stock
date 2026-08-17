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
   일간 수익 직접 수정
   =====================================================

   여기만 수정하면 날짜별 일간 수익을 직접 바꿀 수 있음.

   krw  = 원화 수익
   usd  = 달러 수익
   rate = 수익률

   예:
   "2026-08-17": {
     krw: 10000,
     usd: 6.9,
     rate: 0.4
   }

   손실은 음수로 입력.
===================================================== */

const dailyProfitRecords = {

  "2026-08-17": {
    krw: 0,
    usd: 0,
    rate: 0
  },

  // 예시
  // "2026-08-16": {
  //   krw: -3000,
  //   usd: -2.05,
  //   rate: -0.12
  // }

};


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


/* =====================================================
   숫자 포맷
===================================================== */

function formatUSD(value) {

  return `$${Number(value).toFixed(2)}`;
}


function formatKRW(value) {

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}


function formatPercent(value) {

  return `${value >= 0 ? "+" : ""}${Number(value).toFixed(2)}%`;
}


function formatShares(value) {

  return Number(value).toLocaleString(
    "ko-KR",
    {
      maximumFractionDigits: 6
    }
  );
}


/* =====================================================
   수익 색상
===================================================== */

function setProfitColor(element, value) {

  if (!element) return;

  element.classList.remove(
    "up",
    "down"
  );

  if (value > 0) {

    element.classList.add("up");

  } else if (value < 0) {

    element.classList.add("down");

  }
}


/* =====================================================
   거래 계산
===================================================== */

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  let costKRW = 0;

  let realizedKRW = 0;

  let totalBuyKRW = 0;

  let totalBuyUSD = 0;

  let totalSellKRW = 0;

  let totalSellUSD = 0;


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


    const rate =
      Number.isFinite(exchangeRate) &&
      exchangeRate > 0

        ? exchangeRate

        : usdKrw;


    /* =========================
       매수
    ========================= */

    if (trade.type === "buy") {

      const buyKRW =
        Number(trade.krw) > 0

          ? Number(trade.krw)

          : quantity *
            priceUSD *
            rate;


      costKRW += buyKRW;

      shares += quantity;

      totalBuyKRW += buyKRW;

      totalBuyUSD +=
        quantity * priceUSD;
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


      const sellKRW =
        Number(trade.krw) > 0

          ? Number(trade.krw)

          : sellQuantity *
            priceUSD *
            rate;


      const soldCostKRW =
        averageCostKRW *
        sellQuantity;


      /*
        사용자가 실제 판매수익을 입력했으면
        그 값을 우선 사용.
      */

      let saleProfit;


      if (
        Number.isFinite(
          Number(trade.realizedKRW)
        )
      ) {

        saleProfit =
          Number(
            trade.realizedKRW
          );

      } else {

        saleProfit =
          sellKRW -
          soldCostKRW;

      }


      realizedKRW +=
        saleProfit;


      costKRW -=
        soldCostKRW;


      shares -=
        sellQuantity;


      totalSellKRW +=
        sellKRW;


      totalSellUSD +=
        sellQuantity *
        priceUSD;
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


  return {

    shares,

    costKRW,

    averageBuyKRW,

    currentPriceUSD,

    marketValueKRW,

    evaluationProfitKRW,

    realizedKRW,

    totalBuyKRW,

    totalBuyUSD,

    totalSellKRW,

    totalSellUSD

  };
}


/* =====================================================
   환차익
===================================================== */

function calculateFXProfit(symbol) {

  const trades =
    getTrades(symbol);


  let fxProfitKRW = 0;


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
      !Number.isFinite(exchangeRate) ||
      quantity <= 0 ||
      priceUSD <= 0 ||
      exchangeRate <= 0
    ) {
      return;
    }


    /*
      매수한 달러의 원화 원가와
      현재 환율 기준 가치를 비교.

      매도는 판매 당시 환율을 기준으로
      실제 판매금액에 반영되므로
      여기서는 현재 보유분의 환차익만 계산.
    */

    if (trade.type === "buy") {

      const usdAmount =
        quantity *
        priceUSD;


      const currentValueKRW =
        usdAmount *
        usdKrw;


      const originalValueKRW =
        usdAmount *
        exchangeRate;


      fxProfitKRW +=
        currentValueKRW -
        originalValueKRW;
    }

  });


  return fxProfitKRW;
}


/* =====================================================
   전체 환차익
===================================================== */

function calculateTotalFXProfit() {

  let totalFX = 0;


  symbols.forEach(symbol => {

    totalFX +=
      calculateFXProfit(symbol);

  });


  return totalFX;
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
      `${formatShares(stock.shares)}주`;

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


    setProfitColor(
      profitElement,
      returnRate
    );

  }

}


/* =====================================================
   전체 평가금
===================================================== */

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


  /*
    평가손익

    판매수익은 전체수익에서 제외.
  */

  const evaluationProfitKRW =
    totalValueKRW -
    totalCostKRW;


  /*
    환차익
  */

  const fxProfitKRW =
    calculateTotalFXProfit();


  /*
    전체수익

    평가손익 + 환차익

    판매수익은 제외.
  */

  const totalProfitKRW =
    evaluationProfitKRW +
    fxProfitKRW;


  const totalReturn =
    totalCostKRW > 0

      ? (
          totalProfitKRW /
          totalCostKRW
        ) * 100

      : 0;


  /* =========================
     총 평가금
  ========================= */

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


  /* =========================
     전체수익
  ========================= */

  const totalProfit =
    document.getElementById(
      "total-profit"
    );


  if (totalProfit) {

    if (totalCostKRW > 0) {

      totalProfit.textContent =
        `${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)} (${formatPercent(totalReturn)})`;

    } else {

      totalProfit.textContent =
        "--";
    }


    setProfitColor(
      totalProfit,
      totalProfitKRW
    );

  }


  /* =========================
     환차익
  ========================= */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );


  if (fxElement) {

    fxElement.textContent =
      `${fxProfitKRW >= 0 ? "+" : ""}${formatKRW(fxProfitKRW)}`;


    setProfitColor(
      fxElement,
      fxProfitKRW
    );

  }


  /* =========================
     판매수익
  ========================= */

  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );


  if (realizedElement) {

    realizedElement.textContent =
      `${totalRealizedKRW >= 0 ? "+" : ""}${formatKRW(totalRealizedKRW)}`;


    setProfitColor(
      realizedElement,
      totalRealizedKRW
    );

  }


  updateDailyProfit();

  updateAssetAllocation();

}


/* =====================================================
   일간수익 계산
===================================================== */

function getDailyRecords() {

  return Object.entries(
    dailyProfitRecords
  )
    .sort(
      (a, b) =>
        new Date(b[0]) -
        new Date(a[0])
    );

}


/* =====================================================
   오늘 일간수익
===================================================== */

function updateDailyProfit() {

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  const record =
    dailyProfitRecords[today];


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


  const dateElement =
    document.getElementById(
      "daily-date"
    );


  if (dateElement) {

    dateElement.textContent =
      today;

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


  const krw =
    Number(record.krw) || 0;

  const usd =
    Number(record.usd) || 0;

  const rate =
    Number(record.rate) || 0;


  if (krwElement) {

    krwElement.textContent =
      `${krw >= 0 ? "+" : ""}${formatKRW(krw)}`;

    setProfitColor(
      krwElement,
      krw
    );

  }


  if (usdElement) {

    usdElement.textContent =
      `${usd >= 0 ? "+" : ""}${formatUSD(usd)}`;

    setProfitColor(
      usdElement,
      usd
    );

  }


  if (rateElement) {

    rateElement.textContent =
      formatPercent(rate);

    setProfitColor(
      rateElement,
      rate
    );

  }


  updateDailyHistory();

}


/* =====================================================
   날짜별 일간수익
===================================================== */

function updateDailyHistory() {

  const container =
    document.getElementById(
      "daily-history-list"
    );


  if (!container) {
    return;
  }


  const records =
    getDailyRecords();


  if (records.length === 0) {

    container.innerHTML =
      `<div class="empty-history">
        기록된 일간 수익이 없습니다.
      </div>`;

    return;
  }


  let cumulativeRate = 0;

  let html = "";


  records.forEach(
    ([date, record]) => {

      const krw =
        Number(record.krw) || 0;

      const usd =
        Number(record.usd) || 0;

      const rate =
        Number(record.rate) || 0;


      cumulativeRate += rate;


      html += `

        <div class="daily-history-item">

          <div class="daily-history-date">
            ${date}
          </div>

          <div class="daily-history-values">

            <span
              class="daily-history-krw ${krw >= 0 ? "up" : "down"}"
            >
              ${krw >= 0 ? "+" : ""}${formatKRW(krw)}
            </span>


            <div class="daily-history-right">

              <span
                class="daily-history-usd"
              >
                ${usd >= 0 ? "+" : ""}${formatUSD(usd)}
              </span>

              <span
                class="daily-history-rate ${rate >= 0 ? "up" : "down"}"
              >
                ${formatPercent(rate)}
                (${formatPercent(cumulativeRate)})
              </span>

            </div>

          </div>

        </div>

      `;

    }
  );


  container.innerHTML =
    html;

}


/* =====================================================
   일간수익 클릭
===================================================== */

function setupDailyProfitClick() {

  const card =
    document.getElementById(
      "daily-profit-card"
    );


  const history =
    document.getElementById(
      "daily-history"
    );


  if (!card || !history) {
    return;
  }


  card.addEventListener(
    "click",
    () => {

      const isHidden =
        history.style.display === "none";


      history.style.display =
        isHidden
          ? "block"
          : "none";


      if (isHidden) {

        updateDailyHistory();

      }

    }
  );

}


/* =====================================================
   환율 표시
===================================================== */

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


/* =====================================================
   상세 화면
===================================================== */

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

  updateTradeHistory(symbol);

}


/* =====================================================
   상세 정보
===================================================== */

function updateDetail(symbol) {

  const stock =
    calculateStock(symbol);


  const fxProfit =
    calculateFXProfit(symbol);


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


  const fxElement =
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
      `${formatShares(stock.shares)}주`;

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
      `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`;

    setProfitColor(
      evaluation,
      stock.evaluationProfitKRW
    );

  }


  if (fxElement) {

    fxElement.textContent =
      `${fxProfit >= 0 ? "+" : ""}${formatKRW(fxProfit)}`;

    setProfitColor(
      fxElement,
      fxProfit
    );

  }


  if (realized) {

    realized.textContent =
      `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;

    setProfitColor(
      realized,
      stock.realizedKRW
    );

  }


  /*
    상세 총수익률도 판매수익 제외
  */

  const totalProfitKRW =
    stock.evaluationProfitKRW +
    fxProfit;


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


    setProfitColor(
      totalProfit,
      returnRate
    );

  }

}


/* =====================================================
   상세 닫기
===================================================== */

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


/* =====================================================
   매수 / 매도 버튼
===================================================== */

function setupTradeButtons() {

  const buyButton =
    document.getElementById(
      "detail-buy-button"
    );


  const sellButton =
    document.getElementById(
      "detail-sell-button"
    );


  if (buyButton) {

    buyButton.addEventListener(
      "click",
      () => {

        tradeType =
          "buy";

        showTradeForm();

      }
    );

  }


  if (sellButton) {

    sellButton.addEventListener(
      "click",
      () => {

        tradeType =
          "sell";

        showTradeForm();

      }
    );

  }

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


  const krwInput =
    document.getElementById(
      "trade-krw"
    );


  const realizedInput =
    document.getElementById(
      "trade-realized-profit"
    );


  if (!form) {
    return;
  }


  form.style.display =
    "block";


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  /*
    오늘 날짜 자동 입력
  */

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);


  dateInput.value =
    today;


  /*
    현재 주가 자동 입력
  */

  priceInput.value =
    prices[selectedSymbol] || "";


  /*
    나머지는 직접 입력
  */

  document.getElementById(
    "trade-shares"
  ).value = "";


  document.getElementById(
    "trade-exchange-rate"
  ).value = "";


  krwInput.value =
    "";


  realizedInput.value =
    "";


  /*
    판매수익 입력칸은
    매도일 때만 의미 있음
  */

  realizedInput.style.display =
    tradeType === "sell"
      ? "block"
      : "none";

}


/* =====================================================
   거래 실행
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


  const krw =
    Number(
      document.getElementById(
        "trade-krw"
      ).value
    );


  const realizedInput =
    document.getElementById(
      "trade-realized-profit"
    );


  const realizedKRW =
    Number(
      realizedInput.value
    );


  /* =========================
     기본 검사
  ========================= */

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


  if (
    tradeType === "sell"
  ) {

    const stock =
      calculateStock(
        selectedSymbol
      );


    if (
      shares >
      stock.shares + 0.0000001
    ) {

      alert(
        `현재 보유수량은 ${formatShares(stock.shares)}주입니다.`
      );

      return;

    }

  }


  /* =========================
     거래 저장
  ========================= */

  const trades =
    getTrades(
      selectedSymbol
    );


  const trade = {

    type:
      tradeType,

    shares:
      shares,

    price:
      price,

    exchangeRate:
      exchangeRate,

    krw:
      Number.isFinite(krw) &&
      krw > 0
        ? krw
        : null,

    date:
      date

  };


  /*
    매도 시 실제 판매수익 입력 가능
  */

  if (
    tradeType === "sell" &&
    Number.isFinite(realizedKRW)
  ) {

    trade.realizedKRW =
      realizedKRW;

  }


  trades.push(
    trade
  );


  saveTrades(
    selectedSymbol,
    trades
  );


  /* =========================
     화면 갱신
  ========================= */

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


  updateTradeHistory(
    selectedSymbol
  );


  updateTotal();

}


/* =====================================================
   거래내역 표시
===================================================== */

function updateTradeHistory(symbol) {

  const container =
    document.getElementById(
      "trade-history-list"
    );


  if (!container) {
    return;
  }


  const trades =
    getTrades(symbol);


  if (trades.length === 0) {

    container.innerHTML =
      `<div class="empty-history">
        거래내역이 없습니다.
      </div>`;

    return;

  }


  let html = "";


  trades
    .map(
      (trade, index) => ({
        trade,
        index
      })
    )
    .reverse()
    .forEach(
      ({ trade, index }) => {

        const isBuy =
          trade.type === "buy";


        const typeText =
          isBuy
            ? "매수"
            : "매도";


        const typeClass =
          isBuy
            ? "up"
            : "down";


        const krw =
          Number(trade.krw) || 0;


        const price =
          Number(trade.price) || 0;


        const exchangeRate =
          Number(
            trade.exchangeRate
          ) || 0;


        const realized =
          Number(
            trade.realizedKRW
          );


        html += `

          <div class="trade-history-item">

            <div class="trade-history-top">

              <span
                class="trade-history-type ${typeClass}"
              >
                ${typeText}
              </span>

              <span
                class="trade-history-date"
              >
                ${trade.date || "-"}
              </span>

            </div>


            <div class="trade-history-info">

              <span>
                ${formatShares(trade.shares)}주
              </span>

              <span>
                ${formatUSD(price)}
              </span>

              <span>
                ₩${exchangeRate.toLocaleString("ko-KR")}
              </span>

            </div>


            <div class="trade-history-info">

              <span>
                원화금액
              </span>

              <span>
                ${krw > 0 ? formatKRW(krw) : "--"}
              </span>

            </div>


            ${
              !isBuy &&
              Number.isFinite(realized)

                ? `

                  <div
                    class="trade-history-profit ${
                      realized >= 0
                        ? "up"
                        : "down"
                    }"
                  >
                    판매수익:
                    ${realized >= 0 ? "+" : ""}
                    ${formatKRW(realized)}
                  </div>

                `

                : ""
            }


            <div class="trade-history-buttons">

              <button
                onclick="editTrade('${symbol}', ${index})"
              >
                수정
              </button>

              <button
                onclick="deleteTrade('${symbol}', ${index})"
              >
                삭제
              </button>

            </div>

          </div>

        `;

      }
    );


  container.innerHTML =
    html;

}


/* =====================================================
   거래 수정
===================================================== */

function editTrade(
  symbol,
  index
) {

  const trades =
    getTrades(symbol);


  const trade =
    trades[index];


  if (!trade) {
    return;
  }


  selectedSymbol =
    symbol;


  tradeType =
    trade.type;


  const form =
    document.getElementById(
      "trade-form"
    );


  form.style.display =
    "block";


  document.getElementById(
    "trade-title"
  ).textContent =
    trade.type === "buy"
      ? "매수 수정"
      : "매도 수정";


  document.getElementById(
    "trade-date"
  ).value =
    trade.date || "";


  document.getElementById(
    "trade-shares"
  ).value =
    trade.shares || "";


  document.getElementById(
    "trade-price"
  ).value =
    trade.price || "";


  document.getElementById(
    "trade-exchange-rate"
  ).value =
    trade.exchangeRate || "";


  document.getElementById(
    "trade-krw"
  ).value =
    trade.krw || "";


  document.getElementById(
    "trade-realized-profit"
  ).value =
    trade.realizedKRW ?? "";


  document.getElementById(
    "trade-realized-profit"
  ).style.display =
    trade.type === "sell"
      ? "block"
      : "none";


  /*
    확인 버튼을 수정 모드로 변경
  */

  const submitButton =
    document.getElementById(
      "trade-submit"
    );


  submitButton.dataset.editIndex =
    index;

}


/* =====================================================
   수정 / 저장 구분
===================================================== */

const originalSubmitTrade =
  submitTrade;


function handleTradeSubmit() {

  const submitButton =
    document.getElementById(
      "trade-submit"
    );


  const editIndex =
    submitButton.dataset.editIndex;


  /*
    수정 모드
  */

  if (
    editIndex !== undefined &&
    editIndex !== ""
  ) {

    saveEditedTrade(
      Number(editIndex)
    );

    return;

  }


  /*
    새 거래
  */

  originalSubmitTrade();

}


/* =====================================================
   수정된 거래 저장
===================================================== */

function saveEditedTrade(index) {

  if (!selectedSymbol) {
    return;
  }


  const trades =
    getTrades(
      selectedSymbol
    );


  const oldTrade =
    trades[index];


  if (!oldTrade) {
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


  const krw =
    Number(
      document.getElementById(
        "trade-krw"
      ).value
    );


  const realized =
    Number(
      document.getElementById(
        "trade-realized-profit"
      ).value
    );


  if (!date) {

    alert(
      "날짜를 입력해줘."
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
      "환율을 입력해줘."
    );

    return;

  }


  trades[index] = {

    type:
      oldTrade.type,

    shares:
      shares,

    price:
      price,

    exchangeRate:
      exchangeRate,

    krw:
      Number.isFinite(krw) &&
      krw > 0
        ? krw
        : null,

    date:
      date

  };


  if (
    oldTrade.type === "sell" &&
    Number.isFinite(realized)
  ) {

    trades[index].realizedKRW =
      realized;

  }


  saveTrades(
    selectedSymbol,
    trades
  );


  delete document
    .getElementById(
      "trade-submit"
    )
    .dataset.editIndex;


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


  updateTradeHistory(
    selectedSymbol
  );


  updateTotal();

}


/* =====================================================
   거래 삭제
===================================================== */

function deleteTrade(
  symbol,
  index
) {

  const trades =
    getTrades(symbol);


  if (!trades[index]) {
    return;
  }


  const confirmed =
    confirm(
      "이 거래내역을 삭제할까요?"
    );


  if (!confirmed) {
    return;
  }


  trades.splice(
    index,
    1
  );


  saveTrades(
    symbol,
    trades
  );


  updateStockCard(
    symbol
  );


  updateTotal();


  if (
    selectedSymbol === symbol
  ) {

    updateDetail(
      symbol
    );

    updateTradeHistory(
      symbol
    );

  }

}


/* =====================================================
   자산 구성 비율
   현재 HTML에 차트 영역이 없으면
   자동으로 생성
===================================================== */

function updateAssetAllocation() {

  let totalValue = 0;


  const values = {};


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    values[symbol] =
      stock.marketValueKRW;


    totalValue +=
      stock.marketValueKRW;

  });


  /*
    현재 HTML에 별도 차트 영역을
    자동 생성
  */

  let section =
    document.getElementById(
      "asset-allocation"
    );


  if (!section) {

    section =
      document.createElement(
        "section"
      );


    section.id =
      "asset-allocation";


    section.className =
      "card market-card";


    const stocks =
      document.getElementById(
        "stocks"
      );


    if (stocks) {

      stocks.parentNode.insertBefore(
        section,
        stocks
      );

    }

  }


  let html =
    `<div class="section-title">
      자산 구성
    </div>`;


  symbols.forEach(symbol => {

    const value =
      values[symbol];


    const percent =
      totalValue > 0

        ? (
            value /
            totalValue
          ) * 100

        : 0;


    html += `

      <div class="market-row">

        <span>
          ${symbol}
        </span>

        <span>
          ${percent.toFixed(1)}%
        </span>

      </div>

    `;

  });


  section.innerHTML =
    html;

}


/* =====================================================
   시장지수
===================================================== */

function updateMarketIndexes(data) {

  const mappings = {

    SP500:
      "sp500",

    NASDAQ:
      "nasdaq",

    KOSPI:
      "kospi",

    KOSDAQ:
      "kosdaq"

  };


  Object.entries(
    mappings
  ).forEach(
    ([key, id]) => {

      const element =
        document.getElementById(id);


      if (!element) {
        return;
      }


      const value =
        Number(data[key]);


      element.textContent =
        Number.isFinite(value) &&
        value !== 0

          ? value.toLocaleString(
              "ko-KR",
              {
                maximumFractionDigits: 2
              }
            )

          : "--";

    }
  );

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


    /* =========================
       환율
    ========================= */

    if (
      Number.isFinite(
        Number(data.USD_KRW)
      )
    ) {

      usdKrw =
        Number(
          data.USD_KRW
        );


      updateExchangeRate();

    }


    /* =========================
       주가
    ========================= */

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


    /* =========================
       시장지수
    ========================= */

    updateMarketIndexes(
      data
    );


    updateTotal();


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


/* =====================================================
   이벤트
===================================================== */

function setupEvents() {

  /*
    종목 클릭
  */

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


  /*
    뒤로가기
  */

  const backButton =
    document.getElementById(
      "back-button"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      closeDetail
    );

  }


  /*
    매수 / 매도
  */

  setupTradeButtons();


  /*
    거래 확인
  */

  document
    .getElementById(
      "trade-submit"
    )
    .addEventListener(
      "click",
      handleTradeSubmit
    );


  /*
    일간수익
  */

  setupDailyProfitClick();

}


/* =====================================================
   시작
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    /*
      1분마다 갱신
    */

    setInterval(
      loadQuotes,
      60000
    );

  }
);