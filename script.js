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


// =========================
// 거래내역
// =========================

function getTrades(symbol) {
  const saved = localStorage.getItem(`${symbol}_trades`);

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

  // 현재 보유주식의 실제 원화 매입원가
  let costKRW = 0;

  // 실현손익
  let realizedKRW = 0;

  trades.forEach(trade => {

    const quantity = Number(trade.shares);
    const priceUSD = Number(trade.price);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(priceUSD) ||
      quantity <= 0 ||
      priceUSD <= 0
    ) {
      return;
    }


    // 거래 당시 환율
    let exchangeRate =
      Number(trade.exchangeRate);

    // 예전 거래에 환율이 없다면
    // 현재 환율을 임시 사용
    if (
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0
    ) {
      exchangeRate = usdKrw;
    }


    // =========================
    // 매수
    // =========================

    if (trade.type === "buy") {

      const buyCostKRW =
        quantity *
        priceUSD *
        exchangeRate;

      costKRW += buyCostKRW;

      shares += quantity;

    }


    // =========================
    // 매도
    // =========================

    if (trade.type === "sell") {

      if (shares <= 0) {
        return;
      }


      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      // 현재 보유주식의 평균 원화 매입단가
      const averageCostKRW =
        costKRW / shares;


      // 매도 당시 실제 원화 매도금액
      const sellRevenueKRW =
        sellQuantity *
        priceUSD *
        exchangeRate;


      // 매도한 주식의 원화 매입원가
      const soldCostKRW =
        averageCostKRW *
        sellQuantity;


      // 실현손익
      realizedKRW +=
        sellRevenueKRW -
        soldCostKRW;


      // 보유 원가 감소
      costKRW -=
        soldCostKRW;


      shares -=
        sellQuantity;

    }

  });


  // =========================
  // 현재 평가
  // =========================

  const currentPriceUSD =
    Number(prices[symbol]) || 0;


  // 현재 환율 기준 현재 평가금
  const marketValueKRW =
    currentPriceUSD *
    shares *
    usdKrw;


  // 현재 보유주식 평균 원화 매입단가
  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  // 현재 평가손익
  const evaluationProfitKRW =
    marketValueKRW -
    costKRW;


  return {

    shares,

    // 원화 기준 실제 매입원가
    costKRW,

    // 원화 기준 평균매수가
    averageBuyKRW,

    currentPriceUSD,

    marketValueKRW,

    evaluationProfitKRW,

    realizedKRW

  };

}


// =========================
// 표시용 숫자
// =========================

function formatUSD(value) {

  return `$${Number(value).toFixed(2)}`;

}


function formatKRW(value) {

  return `₩${Math.round(value).toLocaleString("ko-KR")}`;

}


function formatPercent(value) {

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

}


// =========================
// 메인 종목 카드 업데이트
// =========================

function updateStockCard(symbol) {

  const stock =
    calculateStock(symbol);


  const sharesDisplay =
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


  // 보유수량

  if (sharesDisplay) {

    sharesDisplay.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;

  }


  // 현재가

  if (priceElement) {

    priceElement.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(stock.currentPriceUSD)
        : "--";

  }


  // 평가금

  if (valueElement) {

    valueElement.textContent =
      stock.currentPriceUSD > 0 &&
      stock.shares > 0
        ? formatKRW(stock.marketValueKRW)
        : "--";

  }


  // 수익률

  const totalProfitKRW =
    stock.evaluationProfitKRW +
    stock.realizedKRW;


  const investedKRW =
    stock.costKRW;


  const returnRate =
    investedKRW > 0
      ? (
          totalProfitKRW /
          investedKRW
        ) * 100
      : 0;


  if (profitElement) {

    profitElement.textContent =
      investedKRW > 0
        ? formatPercent(returnRate)
        : "--";


    profitElement.classList.remove(
      "up",
      "down"
    );


    if (returnRate > 0) {

      profitElement.classList.add(
        "up"
      );

    }


    if (returnRate < 0) {

      profitElement.classList.add(
        "down"
      );

    }

  }

}


// =========================
// 전체 평가금
// =========================

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


  // 현재 평가손익

  const evaluationProfitKRW =
    totalValueKRW -
    totalCostKRW;


  // 전체 손익

  const totalProfitKRW =
    evaluationProfitKRW +
    totalRealizedKRW;


  // 전체 수익률

  const totalReturn =
    totalCostKRW > 0
      ? (
          totalProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  // =========================
  // 총 평가금
  // =========================

  const totalValueElement =
    document.getElementById(
      "total-value"
    );


  if (totalValueElement) {

    totalValueElement.textContent =
      formatKRW(totalValueKRW);

  }


  // =========================
  // 총 달러 평가금
  // =========================

  const totalDollarElement =
    document.getElementById(
      "total-dollar"
    );


  if (totalDollarElement) {

    const totalUSD =
      usdKrw > 0
        ? totalValueKRW / usdKrw
        : 0;


    totalDollarElement.textContent =
      formatUSD(totalUSD);

  }


  // =========================
  // 총 손익
  // =========================

  const totalProfitElement =
    document.getElementById(
      "total-profit"
    );


  if (totalProfitElement) {

    totalProfitElement.textContent =
      totalCostKRW > 0
        ? `${totalProfitKRW >= 0 ? "+" : ""}${formatKRW(totalProfitKRW)} (${formatPercent(totalReturn)})`
        : "--";


    totalProfitElement.classList.remove(
      "up",
      "down"
    );


    if (totalProfitKRW > 0) {

      totalProfitElement.classList.add(
        "up"
      );

    }


    if (totalProfitKRW < 0) {

      totalProfitElement.classList.add(
        "down"
      );

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
// 상세 화면 열기
// =========================

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

}


// =========================
// 상세 정보
// =========================

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


  // 현재가

  price.textContent =
    stock.currentPriceUSD > 0
      ? formatUSD(
          stock.currentPriceUSD
        )
      : "--";


  // 보유수량

  shares.textContent =
    `${stock.shares.toLocaleString("ko-KR")}주`;


  // 평균매수가
  // 원화 기준

  averageBuy.textContent =
    stock.averageBuyKRW > 0
      ? formatKRW(
          stock.averageBuyKRW
        )
      : "--";


  // 평가금

  value.textContent =
    stock.shares > 0 &&
    stock.currentPriceUSD > 0
      ? formatKRW(
          stock.marketValueKRW
        )
      : "--";


  // 평가손익

  evaluation.textContent =
    stock.shares > 0
      ? `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`
      : "--";


  evaluation.classList.remove(
    "up",
    "down"
  );


  if (
    stock.evaluationProfitKRW > 0
  ) {

    evaluation.classList.add(
      "up"
    );

  }


  if (
    stock.evaluationProfitKRW < 0
  ) {

    evaluation.classList.add(
      "down"
    );

  }


  // 실현손익

  realized.textContent =
    `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;


  realized.classList.remove(
    "up",
    "down"
  );


  if (
    stock.realizedKRW > 0
  ) {

    realized.classList.add(
      "up"
    );

  }


  if (
    stock.realizedKRW < 0
  ) {

    realized.classList.add(
      "down"
    );

  }


  // 전체 수익률

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


  totalProfit.classList.remove(
    "up",
    "down"
  );


  if (returnRate > 0) {

    totalProfit.classList.add(
      "up"
    );

  }


  if (returnRate < 0) {

    totalProfit.classList.add(
      "down"
    );

  }

}


// =========================
// 뒤로가기
// =========================

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


// =========================
// 매수 / 매도 버튼
// =========================

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


// =========================
// 거래창
// =========================

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


  form.style.display =
    "block";


  title.textContent =
    tradeType === "buy"
      ? "매수"
      : "매도";


  // 현재 주가 자동 입력

  priceInput.value =
    prices[selectedSymbol] || "";


  document.getElementById(
    "trade-shares"
  ).value =
    "";

}


// =========================
// 거래 실행
// =========================

function submitTrade() {

  if (
    !selectedSymbol ||
    !tradeType
  ) {
    return;
  }


  const sharesInput =
    document.getElementById(
      "trade-shares"
    );

  const priceInput =
    document.getElementById(
      "trade-price"
    );


  const shares =
    Number(
      sharesInput.value
    );


  const price =
    Number(
      priceInput.value
    );


  // 수량 검사

  if (
    !Number.isFinite(shares) ||
    shares <= 0
  ) {

    alert(
      "수량을 입력해줘."
    );

    return;

  }


  // 가격 검사

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert(
      "가격을 입력해줘."
    );

    return;

  }


  // 환율 검사

  if (
    !Number.isFinite(usdKrw) ||
    usdKrw <= 0
  ) {

    alert(
      "현재 환율을 불러오지 못했습니다."
    );

    return;

  }


  // =========================
  // 매도 가능 수량 확인
  // =========================

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


  // =========================
  // 거래 저장
  // =========================

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

    // ★ 거래 당시 환율 저장

    exchangeRate:
      usdKrw,

    date:
      new Date().toISOString()

  });


  saveTrades(
    selectedSymbol,
    trades
  );


  // 거래창 닫기

  document.getElementById(
    "trade-form"
  ).style.display =
    "none";


  tradeType =
    null;


  // 화면 갱신

  updateStockCard(
    selectedSymbol
  );


  updateDetail(
    selectedSymbol
  );


  updateTotal();

}


// =========================
// API에서 주가/환율 가져오기
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


    // =========================
    // 환율
    // =========================

    if (
      Number.isFinite(
        Number(data.USD_KRW)
      )
    ) {

      usdKrw =
        Number(data.USD_KRW);

      updateExchangeRate();

    }


    // =========================
    // 주가
    // =========================

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


    // 전체 평가금 갱신

    updateTotal();


    // 상세 화면도 갱신

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


// =========================
// 이벤트
// =========================

function setupEvents() {


  // 종목 클릭

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


  // 뒤로가기

  document.getElementById(
    "back-button"
  ).addEventListener(
    "click",
    closeDetail
  );


  // 매수 / 매도

  setupTradeButtons();


  // 거래 확인

  document.getElementById(
    "trade-submit"
  ).addEventListener(
    "click",
    submitTrade
  );

}


// =========================
// 시작
// =========================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    // 1분마다 업데이트

    setInterval(
      loadQuotes,
      60000
    );

  }
);