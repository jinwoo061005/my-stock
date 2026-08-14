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
    symbol: "SKADR",
    shares: Number(localStorage.getItem("SKADR_shares")) || 0,
    buy: Number(localStorage.getItem("SKADR_buy")) || 0,
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

window.onload = () => {

  stocks.forEach(stock => {

    const s = document.getElementById(`${stock.symbol}-shares`);
    const b = document.getElementById(`${stock.symbol}-buy`);

    if (s) {
      s.value = stock.shares;

      s.onchange = () => {

        stock.shares = Number(s.value) || 0;

        localStorage.setItem(
          `${stock.symbol}_shares`,
          stock.shares
        );

        updateTotal();

      };
    }

    if (b) {
      b.value = stock.buy;

      b.onchange = () => {

        stock.buy = Number(b.value) || 0;

        localStorage.setItem(
          `${stock.symbol}_buy`,
          stock.buy
        );

        updateTotal();

      };
    }

  });

  loadQuotes();

  setInterval(loadQuotes, 60000);

};

async function loadQuotes() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("API error");
    }

    const data = await response.json();

    stocks.forEach(stock => {

      if (data[stock.symbol] !== undefined) {

        stock.previous = stock.current;
        stock.current = Number(data[stock.symbol]) || 0;

        const price = document.getElementById(`${stock.symbol}-price`);
        const value = document.getElementById(`${stock.symbol}-value`);

        if (price) {
          price.textContent = `$${stock.current.toFixed(2)}`;
        }

        if (value) {
          value.textContent =
            `${(stock.current * stock.shares).toLocaleString()}원`;
        }

      }

    });

    if (data.USD_KRW !== undefined) {
      usdKrw = Number(data.USD_KRW) || 0;
    }

    updateTotal();

  } catch (error) {

    console.error("주가 불러오기 실패:", error);

  }

}

function updateTotal() {

  let totalValue = 0;
  let totalBuy = 0;

  stocks.forEach(stock => {

    const value = stock.current * stock.shares * usdKrw;

    totalValue += value;
    totalBuy += stock.buy * stock.shares * usdKrw;

  });

  const total = document.getElementById("total-value");
  const profit = document.getElementById("total-profit");

  if (total) {
    total.textContent =
      `${Math.round(totalValue).toLocaleString()}원`;
  }

  if (profit) {

    const profitValue = totalValue - totalBuy;
    const profitPercent =
      totalBuy > 0 ? (profitValue / totalBuy) * 100 : 0;

    profit.textContent =
      `${Math.round(profitValue).toLocaleString()}원 (${profitPercent.toFixed(2)}%)`;

  }

}

function updateStockDisplay(stock) {

  const price = document.getElementById(`${stock.symbol}-price`);
  const value = document.getElementById(`${stock.symbol}-value`);
  const profit = document.getElementById(`${stock.symbol}-profit`);

  const currentValue = stock.current * stock.shares * usdKrw;
  const buyValue = stock.buy * stock.shares * usdKrw;
  const profitValue = currentValue - buyValue;

  const profitPercent =
    buyValue > 0
      ? (profitValue / buyValue) * 100
      : 0;

  if (price) {
    price.textContent =
      `$${stock.current.toFixed(2)}`;
  }

  if (value) {
    value.textContent =
      `${Math.round(currentValue).toLocaleString()}원`;
  }

  if (profit) {
    profit.textContent =
      `${profitValue >= 0 ? "+" : ""}${Math.round(profitValue).toLocaleString()}원 (${profitPercent.toFixed(2)}%)`;

    profit.classList.toggle("up", profitValue > 0);
    profit.classList.toggle("down", profitValue < 0);
  }

}
stocks.forEach(stock => {
  updateStockDisplay(stock);
});

function updateAllStocks() {
  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();
}

function formatKRW(value) {
  if (!Number.isFinite(value)) return "0원";

  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatUSD(value) {
  if (!Number.isFinite(value)) return "$0.00";

  return `$${value.toFixed(2)}`;
}

function updateStockDisplay(stock) {

  const price = document.getElementById(`${stock.symbol}-price`);
  const value = document.getElementById(`${stock.symbol}-value`);
  const profit = document.getElementById(`${stock.symbol}-profit`);

  const currentValue = stock.current * stock.shares * usdKrw;
  const buyValue = stock.buy * stock.shares * usdKrw;
  const profitValue = currentValue - buyValue;

  const profitPercent =
    buyValue > 0
      ? (profitValue / buyValue) * 100
      : 0;

  if (price) {
    price.textContent = formatUSD(stock.current);
  }

  if (value) {
    value.textContent = formatKRW(currentValue);
  }

  if (profit) {

    const sign = profitValue > 0 ? "+" : "";

    profit.textContent =
      `${sign}${formatKRW(profitValue)} (${profitPercent.toFixed(2)}%)`;

    profit.classList.remove("up", "down");

    if (profitValue > 0) {
      profit.classList.add("up");
    } else if (profitValue < 0) {
      profit.classList.add("down");
    }
  }
}

function updateAllStocks() {

  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();
}

function updateTotal() {

  let totalValue = 0;
  let totalBuy = 0;

  stocks.forEach(stock => {

    totalValue += stock.current * stock.shares * usdKrw;
    totalBuy += stock.buy * stock.shares * usdKrw;

  });

  const profitValue = totalValue - totalBuy;

  const profitPercent =
    totalBuy > 0
      ? (profitValue / totalBuy) * 100
      : 0;

  const total = document.getElementById("total-value");
  const profit = document.getElementById("total-profit");

  if (total) {
    total.textContent =
      `${Math.round(totalValue).toLocaleString("ko-KR")}원`;
  }

  if (profit) {

    profit.textContent =
      `${profitValue >= 0 ? "+" : ""}${Math.round(profitValue).toLocaleString("ko-KR")}원 (${profitPercent.toFixed(2)}%)`;

    profit.classList.remove("up", "down");

    if (profitValue > 0) {
      profit.classList.add("up");
    } else if (profitValue < 0) {
      profit.classList.add("down");
    }

  }

}

function saveStockData(stock) {

  localStorage.setItem(
    `${stock.symbol}_shares`,
    stock.shares
  );

  localStorage.setItem(
    `${stock.symbol}_buy`,
    stock.buy
  );

}

function setupStockInputs() {

  stocks.forEach(stock => {

    const sharesInput =
      document.getElementById(`${stock.symbol}-shares`);

    const buyInput =
      document.getElementById(`${stock.symbol}-buy`);

    if (sharesInput) {

      sharesInput.value = stock.shares;

      sharesInput.addEventListener("change", () => {

        stock.shares =
          Number(sharesInput.value) || 0;

        saveStockData(stock);
        updateStockDisplay(stock);
        updateTotal();

      });

    }

    if (buyInput) {

      buyInput.value = stock.buy;

      buyInput.addEventListener("change", () => {

        stock.buy =
          Number(buyInput.value) || 0;

        saveStockData(stock);
        updateStockDisplay(stock);
        updateTotal();

      });

    }

  });

}

window.onload = () => {

  setupStockInputs();

  loadQuotes();

  setInterval(() => {
    loadQuotes();
  }, 60000);

};

// 모든 주식의 현재가와 평가금액을 처음부터 표시
function initializeDisplay() {

  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();

}

// 페이지 로딩 완료 후 실행
document.addEventListener("DOMContentLoaded", () => {

  initializeDisplay();

});

// API에서 받아온 데이터를 화면에 반영
async function loadQuotes() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // 환율
    if (data.USD_KRW !== undefined) {
      usdKrw = Number(data.USD_KRW) || 0;
    }

    // 주가
    stocks.forEach(stock => {

      if (data[stock.symbol] !== undefined) {

        stock.previous = stock.current;
        stock.current = Number(data[stock.symbol]) || 0;

        updateStockDisplay(stock);

      }

    });

    updateTotal();

  } catch (error) {

    console.error("주가 업데이트 실패:", error);

  }

}

function updatePriceColor(stock) {

  const price = document.getElementById(`${stock.symbol}-price`);

  if (!price) return;

  price.classList.remove("up", "down");

  if (stock.current > stock.previous && stock.previous !== 0) {
    price.classList.add("up");
  }

  if (stock.current < stock.previous && stock.previous !== 0) {
    price.classList.add("down");
  }

}

stocks.forEach(stock => {
  updatePriceColor(stock);
});

function updateStockDisplay(stock) {

  const price = document.getElementById(`${stock.symbol}-price`);
  const value = document.getElementById(`${stock.symbol}-value`);
  const profit = document.getElementById(`${stock.symbol}-profit`);

  const currentValue = stock.current * stock.shares * usdKrw;
  const buyValue = stock.buy * stock.shares * usdKrw;
  const profitValue = currentValue - buyValue;

  const profitPercent =
    buyValue > 0
      ? (profitValue / buyValue) * 100
      : 0;

  if (price) {
    price.textContent = formatUSD(stock.current);

    price.classList.remove("up", "down");

    if (stock.previous !== 0) {
      if (stock.current > stock.previous) {
        price.classList.add("up");
      } else if (stock.current < stock.previous) {
        price.classList.add("down");
      }
    }
  }

  if (value) {
    value.textContent = formatKRW(currentValue);
  }

  if (profit) {

    profit.textContent =
      `${profitValue >= 0 ? "+" : ""}${formatKRW(profitValue)} (${profitPercent.toFixed(2)}%)`;

    profit.classList.remove("up", "down");

    if (profitValue > 0) {
      profit.classList.add("up");
    } else if (profitValue < 0) {
      profit.classList.add("down");
    }

  }

}

function updateAllStocks() {

  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();

}

function startAutoUpdate() {

  // 처음 한 번 바로 업데이트
  loadQuotes();

  // 1분마다 업데이트
  setInterval(() => {
    loadQuotes();
  }, 60000);

}

document.addEventListener("DOMContentLoaded", () => {

  setupStockInputs();
  initializeDisplay();
  startAutoUpdate();

});

// 페이지를 떠날 때 입력값 저장
window.addEventListener("beforeunload", () => {

  stocks.forEach(stock => {
    saveStockData(stock);
  });

});

// 현재가가 정상적으로 들어왔는지 확인
function hasValidQuote(stock) {

  return (
    Number.isFinite(stock.current) &&
    stock.current > 0
  );

}

// API 데이터가 없을 때 기존 가격을 유지
function getStockValue(stock) {

  if (!hasValidQuote(stock)) {
    return 0;
  }

  return stock.current * stock.shares * usdKrw;

}

function getStockProfit(stock) {

  const currentValue = getStockValue(stock);
  const buyValue = stock.buy * stock.shares * usdKrw;

  return {
    value: currentValue - buyValue,
    percent: buyValue > 0
      ? ((currentValue - buyValue) / buyValue) * 100
      : 0
  };

}

function refreshDisplay() {

  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();

}

function setStockPrice(symbol, price) {

  const stock = stocks.find(
    item => item.symbol === symbol
  );

  if (!stock) return;

  const newPrice = Number(price);

  if (!Number.isFinite(newPrice) || newPrice <= 0) {
    return;
  }

  stock.previous = stock.current;
  stock.current = newPrice;

  updateStockDisplay(stock);
  updateTotal();

}

function setExchangeRate(rate) {

  const newRate = Number(rate);

  if (!Number.isFinite(newRate) || newRate <= 0) {
    return;
  }

  usdKrw = newRate;

  refreshDisplay();

}

async function fetchExchangeRate() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.USD_KRW !== undefined) {
      setExchangeRate(data.USD_KRW);
    }

  } catch (error) {

    console.error("환율 업데이트 실패:", error);

  }

}

// 주가 + 환율을 한 번에 업데이트
async function refreshQuotes() {

  try {

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.USD_KRW !== undefined) {
      usdKrw = Number(data.USD_KRW) || usdKrw;
    }

    stocks.forEach(stock => {

      if (data[stock.symbol] !== undefined) {

        const price = Number(data[stock.symbol]);

        if (Number.isFinite(price) && price > 0) {
          stock.previous = stock.current;
          stock.current = price;
        }

      }

    });

    refreshDisplay();

  } catch (error) {

    console.error("가격 업데이트 실패:", error);

  }

}

function startRefreshTimer() {

  // 기존 타이머가 있으면 중복 실행 방지
  if (window.quoteTimer) {
    clearInterval(window.quoteTimer);
  }

  window.quoteTimer = setInterval(() => {
    refreshQuotes();
  }, 60000);

}

document.addEventListener("DOMContentLoaded", () => {

  setupStockInputs();
  initializeDisplay();
  refreshQuotes();
  startRefreshTimer();

});

// 마지막 초기화 코드
document.addEventListener("DOMContentLoaded", () => {

  setupStockInputs();

  stocks.forEach(stock => {
    updateStockDisplay(stock);
  });

  updateTotal();

  refreshQuotes();

  startRefreshTimer();

});

// 중복 실행 방지용 최종 초기화
if (!window.__stockAppStarted) {

  window.__stockAppStarted = true;

  document.addEventListener("DOMContentLoaded", () => {

    setupStockInputs();

    initializeDisplay();

    refreshQuotes();

    startRefreshTimer();

  });

}

function updateTotal() {

  let totalValue = 0;
  let totalBuy = 0;

  stocks.forEach(stock => {

    if (!Number.isFinite(stock.current) || stock.current <= 0) {
      return;
    }

    const currentValue =
      stock.current * stock.shares * usdKrw;

    const buyValue =
      stock.buy * stock.shares * usdKrw;

    totalValue += currentValue;
    totalBuy += buyValue;

  });

  const profitValue = totalValue - totalBuy;

  const profitPercent =
    totalBuy > 0
      ? (profitValue / totalBuy) * 100
      : 0;

  const total = document.getElementById("total-value");
  const profit = document.getElementById("total-profit");

  if (total) {
    total.textContent =
      `${Math.round(totalValue).toLocaleString("ko-KR")}원`;
  }

  if (profit) {

    profit.textContent =
      `${profitValue >= 0 ? "+" : ""}${Math.round(profitValue).toLocaleString("ko-KR")}원 (${profitPercent.toFixed(2)}%)`;

    profit.classList.remove("up", "down");

    if (profitValue > 0) {
      profit.classList.add("up");
    } else if (profitValue < 0) {
      profit.classList.add("down");
    }

  }

}

