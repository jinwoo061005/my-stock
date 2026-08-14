console.log("SCRIPT LOADED");
const API_URL = "/api/quote";

const stocks = [
  {
    symbol: "NVDY",
    shares: Number(localStorage.getItem("NVDY_shares")) || 0,
    buy: Number(localStorage.getItem("NVDY_buy")) || 0,
    current: 0,
    previous: 0
  },
  {
    symbol: "QQQM",
    shares: Number(localStorage.getItem("QQQM_shares")) || 0,
    buy: Number(localStorage.getItem("QQQM_buy")) || 0,
    current: 0,
    previous: 0
  },
  {
    symbol: "SCHD",
    shares: Number(localStorage.getItem("SCHD_shares")) || 0,
    buy: Number(localStorage.getItem("SCHD_buy")) || 0,
    current: 0,
    previous: 0
  },
  {
    symbol: "SPMO",
    shares: Number(localStorage.getItem("SPMO_shares")) || 0,
    buy: Number(localStorage.getItem("SPMO_buy")) || 0,
    current: 0,
    previous: 0
  },
  {
    symbol: "SKHY",
    shares: Number(localStorage.getItem("SKHY_shares")) || 0,
    buy: Number(localStorage.getItem("SKHY_buy")) || 0,
    current: 0,
    previous: 0
  },
  {
    symbol: "VIG",
    shares: Number(localStorage.getItem("VIG_shares")) || 0,
    buy: Number(localStorage.getItem("VIG_buy")) || 0,
    current: 0,
    previous: 0
  }
];

let usdKrw = 0;


// 숫자 표시
function formatKRW(value) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatUSD(value) {
  return `$${Number(value).toFixed(2)}`;
}


// 입력값 연결
function setupStockInputs() {

  stocks.forEach(stock => {

    const sharesInput =
      document.getElementById(`${stock.symbol}-shares`);

    const buyInput =
      document.getElementById(`${stock.symbol}-buy`);


    if (sharesInput) {

      sharesInput.value =
        stock.shares || "";

      sharesInput.addEventListener("change", () => {

        stock.shares =
          Number(sharesInput.value) || 0;

        localStorage.setItem(
          `${stock.symbol}_shares`,
          stock.shares
        );

        updateStockDisplay(stock);
        updateTotal();

      });

    }


    if (buyInput) {

      buyInput.value =
        stock.buy || "";

      buyInput.addEventListener("change", () => {

        stock.buy =
          Number(buyInput.value) || 0;

        localStorage.setItem(
          `${stock.symbol}_buy`,
          stock.buy
        );

        updateStockDisplay(stock);
        updateTotal();

      });

    }

  });

}


// 개별 종목 화면 업데이트
function updateStockDisplay(stock) {

  const price =
    document.getElementById(`${stock.symbol}-price`);

  const value =
    document.getElementById(`${stock.symbol}-value`);

  const profit =
    document.getElementById(`${stock.symbol}-profit`);


  const currentValue =
    stock.current *
    stock.shares *
    usdKrw;

  const buyValue =
    stock.buy *
    stock.shares *
    usdKrw;

  const profitValue =
    currentValue - buyValue;

  const profitPercent =
    buyValue > 0
      ? (profitValue / buyValue) * 100
      : 0;


  if (price) {

    price.textContent =
      stock.current > 0
        ? formatUSD(stock.current)
        : "--";

    price.classList.remove("up", "down");

    if (stock.previous > 0) {

      if (stock.current > stock.previous) {
        price.classList.add("up");
      }

      if (stock.current < stock.previous) {
        price.classList.add("down");
      }

    }

  }


  if (value) {

    value.textContent =
      stock.current > 0
        ? formatKRW(currentValue)
        : "--";

  }


  if (profit) {

    if (stock.current <= 0 || stock.buy <= 0) {

      profit.textContent = "--";

    } else {

      profit.textContent =
        `${profitValue >= 0 ? "+" : ""}` +
        `${formatKRW(profitValue)} ` +
        `(${profitPercent.toFixed(2)}%)`;

      profit.classList.remove("up", "down");

      if (profitValue > 0) {
        profit.classList.add("up");
      }

      if (profitValue < 0) {
        profit.classList.add("down");
      }

    }

  }

}


// 총 평가금
function updateTotal() {

  let totalValue = 0;
  let totalBuy = 0;


  stocks.forEach(stock => {

    if (stock.current <= 0) {
      return;
    }

    totalValue +=
      stock.current *
      stock.shares *
      usdKrw;

    totalBuy +=
      stock.buy *
      stock.shares *
      usdKrw;

  });


  const profitValue =
    totalValue - totalBuy;

  const profitPercent =
    totalBuy > 0
      ? (profitValue / totalBuy) * 100
      : 0;


  const totalValueElement =
    document.getElementById("total-value");

  const totalDollarElement =
    document.getElementById("total-dollar");

  const totalProfitElement =
    document.getElementById("total-profit");


  if (totalValueElement) {

    totalValueElement.textContent =
      formatKRW(totalValue);

  }


  if (totalDollarElement) {

    const dollarValue =
      usdKrw > 0
        ? totalValue / usdKrw
        : 0;

    totalDollarElement.textContent =
      formatUSD(dollarValue);

  }


  if (totalProfitElement) {

    if (totalBuy > 0) {

      totalProfitElement.textContent =
        `${profitValue >= 0 ? "+" : ""}` +
        `${formatKRW(profitValue)} ` +
        `(${profitPercent.toFixed(2)}%)`;

      totalProfitElement.classList.remove(
        "up",
        "down"
      );

      if (profitValue > 0) {
        totalProfitElement.classList.add("up");
      }

      if (profitValue < 0) {
        totalProfitElement.classList.add("down");
      }

    } else {

      totalProfitElement.textContent = "--";

    }

  }

}


// 환율 표시
function updateExchangeRate() {

  const element =
    document.getElementById("usdkrw");

  if (!element) {
    return;
  }

  if (usdKrw > 0) {

    element.textContent =
      usdKrw.toLocaleString("ko-KR", {
        maximumFractionDigits: 2
      });

  } else {

    element.textContent = "--";

  }

}


// API에서 주가와 환율 가져오기
async function loadQuotes() {

  try {

    const response =
      await fetch(API_URL, {
        cache: "no-store"
      });

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
    stocks.forEach(stock => {

      const newPrice =
        Number(data[stock.symbol]);

      if (
        Number.isFinite(newPrice) &&
        newPrice > 0
      ) {

        stock.previous =
          stock.current;

        stock.current =
          newPrice;

      }

      updateStockDisplay(stock);

    });


    updateTotal();


  } catch (error) {

    console.error(
      "주가 업데이트 실패:",
      error
    );

  }

}


// 초기 실행
document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupStockInputs();

    stocks.forEach(stock => {
      updateStockDisplay(stock);
    });

    updateTotal();

    loadQuotes();

    // 1분마다 업데이트
    setInterval(
      loadQuotes,
      60000
    );

  }
);