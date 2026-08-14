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


// =========================
// 거래 데이터
// =========================

function getTrades(symbol) {

  const saved =
    localStorage.getItem(`${symbol}_trades`);

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


// =========================
// 거래 계산
// =========================

function calculateStock(symbol) {

  const trades = getTrades(symbol);

  let shares = 0;
  let cost = 0;
  let realized = 0;

  trades.forEach(trade => {

    const quantity = Number(trade.shares);
    const price = Number(trade.price);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(price)
    ) {
      return;
    }


    // 매수
    if (trade.type === "buy") {

      cost += quantity * price;
      shares += quantity;

    }


    // 매도
    if (trade.type === "sell") {

      if (shares <= 0) return;

      const averageBuy =
        cost / shares;

      const sellQuantity =
        Math.min(quantity, shares);

      realized +=
        (price - averageBuy) *
        sellQuantity;

      cost -=
        averageBuy *
        sellQuantity;

      shares -= sellQuantity;

    }

  });


  const averageBuy =
    shares > 0
      ? cost / shares
      : 0;


  const currentPrice =
    Number(prices[symbol]) || 0;


  const marketValue =
    currentPrice *
    shares;


  const evaluationProfit =
    (currentPrice - averageBuy) *
    shares;


  return {
    shares,
    cost,
    averageBuy,
    currentPrice,
    marketValue,
    evaluationProfit,
    realized
  };

}


// =========================
// 숫자 표시
// =========================

function usd(value) {

  return `$${Number(value).toFixed(2)}`;

}


function krw(value) {

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;

}


function percent(value) {

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

}


// =========================
// 종목 화면 업데이트
// =========================

function updateStock(symbol) {

  const stock =
    calculateStock(symbol);

  const price =
    stock.currentPrice;

  const shares =
    stock.shares;

  const valueKRW =
    stock.marketValue * usdKrw;

  const evaluationKRW =
    stock.evaluationProfit * usdKrw;

  const realizedKRW =
    stock.realized * usdKrw;


  const totalInvested =
    stock.cost * usdKrw;


  const totalProfit =
    evaluationKRW +
    realizedKRW;


  const totalReturn =
    totalInvested > 0
      ? (totalProfit / totalInvested) * 100
      : 0;


  // 보유수량
  const sharesDisplay =
    document.getElementById(
      `${symbol}-shares-display`
    );

  if (sharesDisplay) {

    sharesDisplay.textContent =
      `${shares.toLocaleString("ko-KR")}주`;

  }


  const sharesDetail =
    document.getElementById(
      `${symbol}-shares`
    );

  if (sharesDetail) {

    sharesDetail.textContent =
      `${shares.toLocaleString("ko-KR")}주`;

  }


  // 현재가
  const priceElement =
    document.getElementById(
      `${symbol}-price`
    );

  if (priceElement) {

    priceElement.textContent =
      price > 0
        ? usd(price)
        : "--";

  }


  // 평가금
  const valueElement =
    document.getElementById(
      `${symbol}-value`
    );

  if (valueElement) {

    valueElement.textContent =
      price > 0 && shares > 0
        ? krw(valueKRW)
        : "--";

  }


  const detailValue =
    document.getElementById(
      `${symbol}-detail-value`
    );

  if (detailValue) {

    detailValue.textContent =
      price > 0 && shares > 0
        ? krw(valueKRW)
        : "--";

  }


  // 평균매수가
  const averageBuy =
    document.getElementById(
      `${symbol}-average-buy`
    );

  if (averageBuy) {

    averageBuy.textContent =
      stock.averageBuy > 0
        ? usd(stock.averageBuy)
        : "--";

  }


  // 평가손익
  const evaluationElement =
    document.getElementById(
      `${symbol}-evaluation-profit`
    );

  if (evaluationElement) {

    evaluationElement.textContent =
      shares > 0
        ? `${evaluationKRW >= 0 ? "+" : ""}${krw(evaluationKRW)}`
        : "--";

    evaluationElement.classList.remove(
      "up",
      "down"
    );

    if (evaluationKRW > 0) {
      evaluationElement.classList.add("up");
    }

    if (evaluationKRW < 0) {
      evaluationElement.classList.add("down");
    }

  }


  // 실현손익
  const realizedElement =
    document.getElementById(
      `${symbol}-realized-profit`
    );

  if (realizedElement) {

    realizedElement.textContent =
      `${realizedKRW >= 0 ? "+" : ""}${krw(realizedKRW)}`;

    realizedElement.classList.remove(
      "up",
      "down"
    );

    if (realizedKRW > 0) {
      realizedElement.classList.add("up");
    }

    if (realizedKRW < 0) {
      realizedElement.classList.add("down");
    }

  }


  // 총 수익률
  const totalProfitElement =
    document.getElementById(
      `${symbol}-total-profit`
    );

  if (totalProfitElement) {

    totalProfitElement.textContent =
      totalInvested > 0
        ? `${percent(totalReturn)}`
        : "--";

    totalProfitElement.classList.remove(
      "up",
      "down"
    );

    if (totalReturn > 0) {
      totalProfitElement.classList.add("up");
    }

    if (totalReturn < 0) {
      totalProfitElement.classList.add("down");
    }

  }


  // 카드에 표시되는 수익률
  const profitElement =
    document.getElementById(
      `${symbol}-profit`
    );

  if (profitElement) {

    profitElement.textContent =
      totalInvested > 0
        ? percent(totalReturn)
        : "--";

    profitElement.classList.remove(
      "up",
      "down"
    );

    if (totalReturn > 0) {
      profitElement.classList.add("up");
    }

    if (totalReturn < 0) {
      profitElement.classList.add("down");
    }

  }

}


// =========================
// 전체 평가금
// =========================

function updateTotal() {

  let totalValue = 0;
  let totalInvested = 0;
  let totalRealized = 0;


  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);

    totalValue +=
      stock.marketValue;

    totalInvested +=
      stock.cost;

    totalRealized +=
      stock.realized;

  });


  const totalValueKRW =
    totalValue * usdKrw;

  const investedKRW =
    totalInvested * usdKrw;

  const realizedKRW =
    totalRealized * usdKrw;


  const evaluationProfitKRW =
    totalValueKRW -
    investedKRW;


  const totalProfitKRW =
    evaluationProfitKRW +
    realizedKRW;


  const totalReturn =
    investedKRW > 0
      ? (totalProfitKRW / investedKRW) * 100
      : 0;


  // 총 평가금
  const totalValueElement =
    document.getElementById(
      "total-value"
    );

  if (totalValueElement) {

    totalValueElement.textContent =
      krw(totalValueKRW);

  }


  // 달러 평가금
  const totalDollarElement =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollarElement) {

    totalDollarElement.textContent =
      usd(totalValue);

  }


  // 총 수익
  const totalProfitElement =
    document.getElementById(
      "total-profit"
    );

  if (totalProfitElement) {

    totalProfitElement.textContent =
      investedKRW > 0
        ? `${totalProfitKRW >= 0 ? "+" : ""}${krw(totalProfitKRW)} (${percent(totalReturn)})`
        : "--";

    totalProfitElement.classList.remove(
      "up",
      "down"
    );

    if (totalProfitKRW > 0) {
      totalProfitElement.classList.add("up");
    }

    if (totalProfitKRW < 0) {
      totalProfitElement.classList.add("down");
    }

  }

}


// =========================
// 환율
// =========================

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


// =========================
// API
// =========================

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


    // 환율
    if (
      Number.isFinite(
        Number(data.USD_KRW)
      )
    ) {

      usdKrw =
        Number(data.USD_KRW);

      updateExchangeRate();

    }


    // 주가
    symbols.forEach(symbol => {

      if (
        Number.isFinite(
          Number(data[symbol])
        )
      ) {

        prices[symbol] =
          Number(data[symbol]);

      }

      updateStock(symbol);

    });


    updateTotal();


  } catch (error) {

    console.error(
      "API 오류:",
      error
    );

  }

}


// =========================
// 종목 클릭
// =========================

function setupStockCards() {

  document
    .querySelectorAll(".stock-card")
    .forEach(card => {

      card.addEventListener(
        "click",
        event => {

          // 버튼이나 입력창을 눌렀을 때는
          // 카드 열림/닫힘 방지
          if (
            event.target.closest(
              "button"
            ) ||
            event.target.closest(
              "input"
            )
          ) {
            return;
          }


          card.classList.toggle(
            "open"
          );

        }
      );

    });

}


// =========================
// 매수/매도 버튼
// =========================

let tradeType = {};


function setupTradeButtons() {

  document
    .querySelectorAll(".buy-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const symbol =
            button.dataset.symbol;

          tradeType[symbol] =
            "buy";

          showTradeForm(symbol);

        }
      );

    });


  document
    .querySelectorAll(".sell-button")
    .forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.stopPropagation();

          const symbol =
            button.dataset.symbol;

          tradeType[symbol] =
            "sell";

          showTradeForm(symbol);

        }
      );

    });

}


// =========================
// 거래 입력창 표시
// =========================

function showTradeForm(symbol) {

  const form =
    document.getElementById(
      `${symbol}-trade-form`
    );

  if (!form) return;


  form.classList.add(
    "show"
  );


  const sharesInput =
    document.getElementById(
      `${symbol}-trade-shares`
    );

  const priceInput =
    document.getElementById(
      `${symbol}-trade-price`
    );


  if (sharesInput) {
    sharesInput.value = "";
  }

  if (priceInput) {

    priceInput.value =
      prices[symbol] || "";

  }

}


// =========================
// 거래 확인
// =========================

function setupTradeSubmit() {

  symbols.forEach(symbol => {

    const button =
      document.getElementById(
        `${symbol}-trade-submit`
      );


    if (!button) return;


    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();


        const type =
          tradeType[symbol];

        if (!type) return;


        const sharesInput =
          document.getElementById(
            `${symbol}-trade-shares`
          );

        const priceInput =
          document.getElementById(
            `${symbol}-trade-price`
          );


        const shares =
          Number(sharesInput.value);

        const price =
          Number(priceInput.value);


        if (
          !Number.isFinite(shares) ||
          shares <= 0
        ) {

          alert("수량을 입력해줘.");

          return;

        }


        if (
          !Number.isFinite(price) ||
          price <= 0
        ) {

          alert("가격을 입력해줘.");

          return;

        }


        // 매도 가능 수량 확인
        if (type === "sell") {

          const stock =
            calculateStock(symbol);

          if (
            shares >
            stock.shares + 0.0000001
          ) {

            alert(
              `현재 보유수량은 ${stock.shares}주입니다.`
            );

            return;

          }

        }


        const trades =
          getTrades(symbol);


        trades.push({

          type,

          shares,

          price,

          date:
            new Date().toISOString()

        });


        saveTrades(
          symbol,
          trades
        );


        const form =
          document.getElementById(
            `${symbol}-trade-form`
          );

        if (form) {

          form.classList.remove(
            "show"
          );

        }


        updateStock(symbol);

        updateTotal();

      }
    );

  });

}


// =========================
// 시작
// =========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupStockCards();

    setupTradeButtons();

    setupTradeSubmit();

    loadQuotes();

    setInterval(
      loadQuotes,
      60000
    );

  }
);