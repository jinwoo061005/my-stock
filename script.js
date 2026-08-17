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


// ======================================================
// 거래내역
// ======================================================

function getTrades(symbol) {

  const saved =
    localStorage.getItem(`${symbol}_trades`);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
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


// ======================================================
// 숫자 안전 처리
// ======================================================

function safeNumber(value) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}


// ======================================================
// 종목 계산
//
// 핵심:
//
// 1. 현재 보유 주식의 USD 원가
// 2. 현재 보유 주식의 KRW 원가
// 3. 현재 평가금
// 4. 주가수익
// 5. 환차익
// 6. 판매수익
//
// 을 완전히 분리한다.
// ======================================================

function calculateStock(symbol) {

  const trades =
    getTrades(symbol);

  let shares = 0;

  // 현재 보유분의 USD 원가
  let costUSD = 0;

  // 현재 보유분의 실제 KRW 원가
  let costKRW = 0;

  // 이미 판매해서 확정된 수익
  let realizedKRW = 0;

  // --------------------------------------------------
  // 거래내역 순서대로 계산
  // --------------------------------------------------

  trades.forEach(trade => {

    const quantity =
      safeNumber(trade.shares);

    const priceUSD =
      safeNumber(trade.price);

    const exchangeRate =
      safeNumber(trade.exchangeRate);

    if (
      quantity <= 0 ||
      priceUSD <= 0
    ) {
      return;
    }


    // 거래 당시 환율
    const rate =
      exchangeRate > 0
        ? exchangeRate
        : usdKrw;


    // ==================================================
    // 매수
    // ==================================================

    if (trade.type === "buy") {

      const buyUSD =
        quantity * priceUSD;

      const buyKRW =
        buyUSD * rate;


      // 현재 보유 원가에 추가
      shares += quantity;

      costUSD += buyUSD;

      costKRW += buyKRW;

      return;
    }


    // ==================================================
    // 매도
    // ==================================================

    if (trade.type === "sell") {

      if (shares <= 0) {
        return;
      }


      // 실제 매도 가능한 수량
      const sellQuantity =
        Math.min(
          quantity,
          shares
        );


      // ------------------------------------------------
      // 현재 보유분에서 매도한 비율
      // ------------------------------------------------

      const sellRatio =
        sellQuantity / shares;


      // ------------------------------------------------
      // 매도된 주식의 원가
      //
      // USD 원가와 KRW 원가를 각각 비례 배분
      // ------------------------------------------------

      const soldCostUSD =
        costUSD * sellRatio;

      const soldCostKRW =
        costKRW * sellRatio;


      // ------------------------------------------------
      // 매도금액
      //
      // totalKRW가 저장되어 있다면
      // 실제 입력한 원화 금액을 우선 사용
      // ------------------------------------------------

      let sellRevenueKRW;


      const recordedTotalKRW =
        safeNumber(
          trade.totalKRW
        );


      if (recordedTotalKRW > 0) {

        // 전체 매도 금액이 기록된 경우
        sellRevenueKRW =
          recordedTotalKRW;

      } else {

        // 기존 거래 데이터
        sellRevenueKRW =
          sellQuantity *
          priceUSD *
          rate;
      }


      // ------------------------------------------------
      // 판매수익
      //
      // = 실제 매도금액 - 매도한 주식의 원가
      // ------------------------------------------------

      const saleProfitKRW =
        sellRevenueKRW -
        soldCostKRW;


      realizedKRW +=
        saleProfitKRW;


      // ------------------------------------------------
      // 현재 보유 원가에서 매도분 제거
      // ------------------------------------------------

      costUSD -=
        soldCostUSD;

      costKRW -=
        soldCostKRW;

      shares -=
        sellQuantity;


      // 아주 작은 부동소수점 오차 제거
      if (Math.abs(shares) < 0.000000001) {
        shares = 0;
      }

      if (Math.abs(costUSD) < 0.000000001) {
        costUSD = 0;
      }

      if (Math.abs(costKRW) < 0.000000001) {
        costKRW = 0;
      }
    }

  });


  // ======================================================
  // 현재 가격
  // ======================================================

  const currentPriceUSD =
    safeNumber(
      prices[symbol]
    );


  // 현재 보유 주식의 USD 평가금
  const marketValueUSD =
    currentPriceUSD *
    shares;


  // 현재 보유 주식의 KRW 평가금
  const marketValueKRW =
    marketValueUSD *
    usdKrw;


  // ======================================================
  // 현재 보유분의 평균 USD 매수가
  // ======================================================

  const averageBuyUSD =
    shares > 0
      ? costUSD / shares
      : 0;


  // ======================================================
  // 현재 보유분의 평균 KRW 원가
  //
  // 매수 당시 실제 환율을 반영한 평단
  // ======================================================

  const averageBuyKRW =
    shares > 0
      ? costKRW / shares
      : 0;


  // ======================================================
  // 현재 보유분 주가수익
  //
  // 주가가 얼마나 변했는지를 현재 환율 기준으로 계산
  //
  // 예:
  // 매수 $100
  // 현재 $110
  //
  // 주가수익 = $10 × 현재환율
  // ======================================================

  const stockPriceProfitKRW =
    (
      marketValueUSD -
      costUSD
    ) * usdKrw;


  // ======================================================
  // 현재 보유분 환차익
  //
  // 매수 당시 환율과 현재 환율의 차이
  //
  // 예:
  // $1,000 매수
  // 당시 1,400원
  // 현재 1,450원
  //
  // 환차익 = $1,000 × (1,450 - 1,400)
  // ======================================================

  const fxProfitKRW =
    (
      costUSD *
      usdKrw
    ) -
    costKRW;


  // ======================================================
  // 평가금 수익
  //
  // ★ 판매수익 절대 포함하지 않음
  //
  // 현재 보유분의
  // 주가수익 + 환차익
  // ======================================================

  const evaluationProfitKRW =
    stockPriceProfitKRW +
    fxProfitKRW;


  // ======================================================
  // 현재 보유분 수익률
  // ======================================================

  const evaluationReturnRate =
    costKRW > 0
      ? (
          evaluationProfitKRW /
          costKRW
        ) * 100
      : 0;


  // ======================================================
  // USD 기준 평가수익
  // ======================================================

  const evaluationProfitUSD =
    marketValueUSD -
    costUSD;


  return {

    // 보유
    shares,

    // 현재 평가금
    marketValueUSD,
    marketValueKRW,

    // 현재 보유 원가
    costUSD,
    costKRW,

    // 평단
    averageBuyUSD,
    averageBuyKRW,

    // 현재 주가
    currentPriceUSD,

    // 주가수익
    stockPriceProfitKRW,

    // 환차익
    fxProfitKRW,

    // 평가금 수익
    evaluationProfitKRW,

    // 평가금 수익 USD
    evaluationProfitUSD,

    // 평가금 수익률
    evaluationReturnRate,

    // 판매수익
    realizedKRW
  };
}


// ======================================================
// 숫자 표시
// ======================================================

function formatUSD(value) {

  const number =
    safeNumber(value);

  return `$${number.toFixed(2)}`;
}


function formatKRW(value) {

  const number =
    safeNumber(value);

  return `₩${Math.round(number).toLocaleString("ko-KR")}`;
}


function formatPercent(value) {

  const number =
    safeNumber(value);

  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
}


// ======================================================
// 부호 포함 KRW
// ======================================================

function formatSignedKRW(value) {

  const number =
    safeNumber(value);

  return `${number >= 0 ? "+" : ""}${formatKRW(number)}`;
}


// ======================================================
// 색상 처리
//
// 상승 = up
// 하락 = down
// 0 = 둘 다 제거
// ======================================================

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


// ======================================================
// 메인 종목 카드
// ======================================================

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


  // 보유수량
  if (sharesElement) {

    sharesElement.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  // 현재 주가
  if (priceElement) {

    priceElement.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(
            stock.currentPriceUSD
          )
        : "--";
  }


  // 평가금
  if (valueElement) {

    valueElement.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(
            stock.marketValueKRW
          )
        : "--";
  }


  // 평가금 수익률
  if (profitElement) {

    profitElement.textContent =
      stock.costKRW > 0
        ? formatPercent(
            stock.evaluationReturnRate
          )
        : "--";


    applyProfitColor(
      profitElement,
      stock.evaluationReturnRate
    );
  }
}


// ======================================================
// 전체 평가금
//
// ★ 판매수익과 평가금 수익을 분리
// ======================================================

function updateTotal() {

  let totalValueKRW = 0;

  let totalValueUSD = 0;

  let totalCostKRW = 0;

  let totalCostUSD = 0;

  let totalEvaluationProfitKRW = 0;

  let totalEvaluationProfitUSD = 0;

  let totalFXProfitKRW = 0;

  let totalRealizedKRW = 0;


  // ====================================================
  // 모든 종목 합산
  // ====================================================

  symbols.forEach(symbol => {

    const stock =
      calculateStock(symbol);


    // 현재 평가금
    totalValueKRW +=
      stock.marketValueKRW;

    totalValueUSD +=
      stock.marketValueUSD;


    // 현재 보유 원가
    totalCostKRW +=
      stock.costKRW;

    totalCostUSD +=
      stock.costUSD;


    // 현재 보유 평가금 수익
    totalEvaluationProfitKRW +=
      stock.evaluationProfitKRW;

    totalEvaluationProfitUSD +=
      stock.evaluationProfitUSD;


    // 환차익
    totalFXProfitKRW +=
      stock.fxProfitKRW;


    // 판매수익
    totalRealizedKRW +=
      stock.realizedKRW;
  });


  // ====================================================
  // 평가금 수익률
  //
  // 판매수익 제외
  // ====================================================

  const evaluationReturnRate =
    totalCostKRW > 0
      ? (
          totalEvaluationProfitKRW /
          totalCostKRW
        ) * 100
      : 0;


  // ====================================================
  // 총 평가금
  // ====================================================

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


  // ====================================================
  // 총 평가금 USD
  // ====================================================

  const totalDollar =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollar) {

    totalDollar.textContent =
      formatUSD(
        totalValueUSD
      );
  }


  // ====================================================
  // 평가금 수익
  //
  // ★ 여기에는 판매수익 없음
  // ====================================================

  const totalProfit =
    document.getElementById(
      "total-profit"
    );

  if (totalProfit) {

    if (totalCostKRW > 0) {

      totalProfit.textContent =
        `${formatSignedKRW(
          totalEvaluationProfitKRW
        )} (${formatPercent(
          evaluationReturnRate
        )})`;

    } else {

      totalProfit.textContent =
        "--";
    }


    applyProfitColor(
      totalProfit,
      totalEvaluationProfitKRW
    );
  }


  // ====================================================
  // 환차익
  //
  // HTML:
  // id="total-fx-profit"
  // ====================================================

  const totalFX =
    document.getElementById(
      "total-fx-profit"
    );

  if (totalFX) {

    totalFX.textContent =
      totalCostKRW > 0
        ? formatSignedKRW(
            totalFXProfitKRW
          )
        : "--";


    applyProfitColor(
      totalFX,
      totalFXProfitKRW
    );
  }


  // ====================================================
  // 판매수익
  //
  // ★ 평가금 수익에 포함하지 않음
  // ====================================================

  const totalRealized =
    document.getElementById(
      "total-realized-profit"
    );

  if (totalRealized) {

    totalRealized.textContent =
      formatSignedKRW(
        totalRealizedKRW
      );


    applyProfitColor(
      totalRealized,
      totalRealizedKRW
    );
  }


  // ====================================================
  // 혹시 기존 HTML에서 사용하는 daily 요소
  // ====================================================

  updateDailyProfit();
}


// ======================================================
// 환율 표시
// ======================================================

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


// ======================================================
// 상세 화면 열기
// ======================================================

function openDetail(symbol) {

  selectedSymbol =
    symbol;

  tradeType = null;


  const mainScreen =
    document.getElementById(
      "main-screen"
    );

  const detailScreen =
    document.getElementById(
      "detail-screen"
    );


  if (mainScreen) {
    mainScreen.style.display =
      "none";
  }


  if (detailScreen) {
    detailScreen.style.display =
      "block";
  }


  const symbolElement =
    document.getElementById(
      "detail-symbol"
    );

  if (symbolElement) {

    symbolElement.textContent =
      symbol;
  }


  const form =
    document.getElementById(
      "trade-form"
    );

  if (form) {
    form.style.display =
      "none";
  }


  updateDetail(symbol);
}


// ======================================================
// 상세정보
// ======================================================

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


  // 현재 가격
  if (price) {

    price.textContent =
      stock.currentPriceUSD > 0
        ? formatUSD(
            stock.currentPriceUSD
          )
        : "--";
  }


  // 보유수량
  if (shares) {

    shares.textContent =
      `${stock.shares.toLocaleString("ko-KR")}주`;
  }


  // 평균매수가
  if (averageBuy) {

    averageBuy.textContent =
      stock.averageBuyKRW > 0
        ? formatKRW(
            stock.averageBuyKRW
          )
        : "--";
  }


  // 평가금
  if (value) {

    value.textContent =
      stock.shares > 0 &&
      stock.currentPriceUSD > 0
        ? formatKRW(
            stock.marketValueKRW
          )
        : "--";
  }


  // ====================================================
  // 평가손익
  //
  // 현재 보유 주식만
  // 판매수익 제외
  // ====================================================

  if (evaluation) {

    evaluation.textContent =
      stock.shares > 0
        ? formatSignedKRW(
            stock.evaluationProfitKRW
          )
        : "--";


    applyProfitColor(
      evaluation,
      stock.evaluationProfitKRW
    );
  }


  // ====================================================
  // 판매수익
  // ====================================================

  if (realized) {

    realized.textContent =
      formatSignedKRW(
        stock.realizedKRW
      );


    applyProfitColor(
      realized,
      stock.realizedKRW
    );
  }


  // ====================================================
  // 총 수익률
  //
  // 여기 역시 현재 보유분 기준
  // 판매수익 제외
  // ====================================================

  if (totalProfit) {

    totalProfit.textContent =
      stock.costKRW > 0
        ? formatPercent(
            stock.evaluationReturnRate
          )
        : "--";


    applyProfitColor(
      totalProfit,
      stock.evaluationReturnRate
    );
  }
}


// ======================================================
// 뒤로가기
// ======================================================

function closeDetail() {

  selectedSymbol = null;

  tradeType = null;


  const detailScreen =
    document.getElementById(
      "detail-screen"
    );

  const mainScreen =
    document.getElementById(
      "main-screen"
    );

  const form =
    document.getElementById(
      "trade-form"
    );


  if (detailScreen) {

    detailScreen.style.display =
      "none";
  }


  if (mainScreen) {

    mainScreen.style.display =
      "block";
  }


  if (form) {

    form.style.display =
      "none";
  }
}


// ======================================================
// 매수 / 매도 버튼
// ======================================================

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

        tradeType = "buy";

        showTradeForm();
      }
    );
  }


  if (sellButton) {

    sellButton.addEventListener(
      "click",
      () => {

        tradeType = "sell";

        showTradeForm();
      }
    );
  }
}


// ======================================================
// 거래창
// ======================================================

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

  const sharesInput =
    document.getElementById(
      "trade-shares"
    );


  if (form) {

    form.style.display =
      "block";
  }


  if (title) {

    title.textContent =
      tradeType === "buy"
        ? "매수"
        : "매도";
  }


  // 현재 주가 자동입력
  if (priceInput) {

    priceInput.value =
      prices[selectedSymbol] || "";
  }


  // 환율 직접입력
  if (exchangeRateInput) {

    exchangeRateInput.value =
      usdKrw > 0
        ? usdKrw
        : "";
  }


  if (sharesInput) {

    sharesInput.value =
      "";
  }


  // 매도용 원화 총액 입력창이
  // HTML에 존재하는 경우 초기화
  const totalKRWInput =
    document.getElementById(
      "trade-total-krw"
    );

  if (totalKRWInput) {

    totalKRWInput.value =
      "";
  }
}


// ======================================================
// 거래 실행
// ======================================================

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

  const exchangeRateInput =
    document.getElementById(
      "trade-exchange-rate"
    );


  const shares =
    safeNumber(
      sharesInput?.value
    );

  const price =
    safeNumber(
      priceInput?.value
    );

  const exchangeRate =
    safeNumber(
      exchangeRateInput?.value
    );


  // ====================================================
  // 매도 총 원화
  //
  // HTML에 있으면 사용
  // ====================================================

  const totalKRWInput =
    document.getElementById(
      "trade-total-krw"
    );


  const totalKRW =
    safeNumber(
      totalKRWInput?.value
    );


  // ====================================================
  // 수량 검사
  // ====================================================

  if (
    !Number.isFinite(shares) ||
    shares <= 0
  ) {

    alert(
      "수량을 입력해줘."
    );

    return;
  }


  // ====================================================
  // 가격 검사
  // ====================================================

  if (
    !Number.isFinite(price) ||
    price <= 0
  ) {

    alert(
      "가격을 입력해줘."
    );

    return;
  }


  // ====================================================
  // 환율 검사
  // ====================================================

  if (
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0
  ) {

    alert(
      "거래 당시 환율을 입력해줘."
    );

    return;
  }


  // ====================================================
  // 매도 가능수량 검사
  // ====================================================

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


    // 실제 총 원화를 입력하도록 만든 경우
    // 가격 × 수량 × 환율과 비교하지 않고
    // 입력값을 그대로 기록한다.
  }


  // ====================================================
  // 거래내역 가져오기
  // ====================================================

  const trades =
    getTrades(
      selectedSymbol
    );


  // ====================================================
  // 거래 저장
  // ====================================================

  const trade = {

    type:
      tradeType,

    shares:
      shares,

    price:
      price,

    exchangeRate:
      exchangeRate,

    date:
      new Date().toISOString()
  };


  // 매도 당시 실제 원화 금액을
  // 입력했다면 저장
  if (
    tradeType === "sell" &&
    totalKRW > 0
  ) {

    trade.totalKRW =
      totalKRW;
  }


  trades.push(trade);


  saveTrades(
    selectedSymbol,
    trades
  );


  // ====================================================
  // 거래창 닫기
  // ====================================================

  const form =
    document.getElementById(
      "trade-form"
    );

  if (form) {

    form.style.display =
      "none";
  }


  tradeType = null;


  // ====================================================
  // 화면 갱신
  // ====================================================

  updateStockCard(
    selectedSymbol
  );

  updateDetail(
    selectedSymbol
  );

  updateTotal();
}


// ======================================================
// 일간 수익
//
// 기존에 저장된 일간 수익 데이터가 있으면 사용.
// localStorage:
//
// daily_profit_records
//
// 형식:
// [
//   {
//     date: "2026-08-17",
//     krw: 5000,
//     usd: 3.4,
//     rate: 0.25,
//     fx: 1000
//   }
// ]
// ======================================================

function getDailyProfitRecords() {

  const saved =
    localStorage.getItem(
      "daily_profit_records"
    );

  if (!saved) {
    return [];
  }

  try {

    const records =
      JSON.parse(saved);

    return Array.isArray(records)
      ? records
      : [];

  } catch {

    return [];
  }
}


// ======================================================
// 오늘 날짜
// ======================================================

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


// ======================================================
// 일간수익 표시
// ======================================================

function updateDailyProfit() {

  const records =
    getDailyProfitRecords();


  const today =
    getTodayString();


  const todayRecord =
    records.find(
      record =>
        record.date === today
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

  const dateElement =
    document.getElementById(
      "daily-date"
    );


  if (dateElement) {

    dateElement.textContent =
      today;
  }


  if (!todayRecord) {

    if (krwElement) {
      krwElement.textContent =
        "--";
    }

    if (usdElement) {
      usdElement.textContent =
        "--";
    }

    if (rateElement) {
      rateElement.textContent =
        "--";
    }

    return;
  }


  const krw =
    safeNumber(
      todayRecord.krw
    );

  const usd =
    safeNumber(
      todayRecord.usd
    );

  const rate =
    safeNumber(
      todayRecord.rate
    );


  if (krwElement) {

    krwElement.textContent =
      formatSignedKRW(
        krw
      );

    applyProfitColor(
      krwElement,
      krw
    );
  }


  if (usdElement) {

    usdElement.textContent =
      `${usd >= 0 ? "+" : ""}${formatUSD(usd)}`;

    applyProfitColor(
      usdElement,
      usd
    );
  }


  if (rateElement) {

    rateElement.textContent =
      formatPercent(rate);

    applyProfitColor(
      rateElement,
      rate
    );
  }
}


// ======================================================
// API
// ======================================================

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


    // ==================================================
    // 환율
    // ==================================================

    const newExchangeRate =
      safeNumber(
        data.USD_KRW
      );


    if (
      newExchangeRate > 0
    ) {

      usdKrw =
        newExchangeRate;

      updateExchangeRate();
    }


    // ==================================================
    // 주가
    // ==================================================

    symbols.forEach(symbol => {

      const price =
        safeNumber(
          data[symbol]
        );


      if (price > 0) {

        prices[symbol] =
          price;
      }


      updateStockCard(
        symbol
      );
    });


    // ==================================================
    // 전체 계산
    // ==================================================

    updateTotal();


    // ==================================================
    // 상세화면
    // ==================================================

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


// ======================================================
// 이벤트
// ======================================================

function setupEvents() {

  // ====================================================
  // 종목 카드
  // ====================================================

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

          if (symbol) {

            openDetail(symbol);
          }
        }
      );

    });


  // ====================================================
  // 뒤로가기
  // ====================================================

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


  // ====================================================
  // 매수 / 매도
  // ====================================================

  setupTradeButtons();


  // ====================================================
  // 거래확인
  // ====================================================

  const tradeSubmit =
    document.getElementById(
      "trade-submit"
    );


  if (tradeSubmit) {

    tradeSubmit.addEventListener(
      "click",
      submitTrade
    );
  }
}


// ======================================================
// 시작
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadQuotes();

    updateDailyProfit();


    // 1분마다 갱신
    setInterval(
      loadQuotes,
      60000
    );
  }
);