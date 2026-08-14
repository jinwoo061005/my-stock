const API_URL = "/api/quote";

const stocks = [
  {
    symbol: "NVDY",
    shares: Number(localStorage.getItem("NVDY_shares")) || 0,
    buy: Number(localStorage.getItem("NVDY_buy")) || 0
  },
  {
    symbol: "QQQM",
    shares: Number(localStorage.getItem("QQQM_shares")) || 0,
    buy: Number(localStorage.getItem("QQQM_buy")) || 0
  },
  {
    symbol: "SCHD",
    shares: Number(localStorage.getItem("SCHD_shares")) || 0,
    buy: Number(localStorage.getItem("SCHD_buy")) || 0
  },
  {
    symbol: "SPMO",
    shares: Number(localStorage.getItem("SPMO_shares")) || 0,
    buy: Number(localStorage.getItem("SPMO_buy")) || 0
  },
{
  symbol: "VIG",
  shares: Number(localStorage.getItem("VIG_shares")) || 0,
  buy: Number(localStorage.getItem("VIG_buy")) || 0
},
  {
    symbol: "SKADR",
    shares: Number(localStorage.getItem("SKADR_shares")) || 0,
    buy: Number(localStorage.getItem("SKADR_buy")) || 0
  }
];

let usdKrw = 0;

function saveValue(symbol) {

  const shares =
    Number(
      document.getElementById(symbol + "-shares").value
    ) || 0;

  const buy =
    Number(
      document.getElementById(symbol + "-buy").value
    ) || 0;

  localStorage.setItem(
    symbol + "_shares",
    shares
  );

  localStorage.setItem(
    symbol + "_buy",
    buy
  );

  const stock =
    stocks.find(
      s => s.symbol === symbol
    );

  stock.shares = shares;
  stock.buy = buy;

  updateTotal();
}

stocks.forEach(stock => {

  window.addEventListener(
    "load",
    () => {

      const s =
        document.getElementById(
          stock.symbol + "-shares"
        );

      const b =
        document.getElementById(
          stock.symbol + "-buy"
        );

      if (s) {

        s.value = stock.shares;

        s.onchange = () =>
          saveValue(stock.symbol);

      }

      if (b) {

        b.value = stock.buy;

        b.onchange = () =>
          saveValue(stock.symbol);

      }

    }
  );

});

async function loadQuotes() {

  const symbols =
    stocks
      .map(s => s.symbol)
      .join(",");

  const res =
    await fetch(
      `${API_URL}?symbols=${symbols}`
    );

  const data =
    await res.json();

  usdKrw =
    data.usdKrw || 0;

  document.getElementById(
    "usdkrw"
  ).textContent =
    usdKrw
      ? usdKrw.toLocaleString()
      : "--";

  let totalUSD = 0;

  stocks.forEach(stock => {

    const quote =
      data.stocks[
        stock.symbol
      ];

    if (!quote) return;

    const price =
      quote.current;

    const prev =
      quote.previousClose;

    const value =
      price *
      stock.shares;

    const changeDollar =
      (price - prev) *
      stock.shares;

    const changeRate =
      prev === 0
        ? 0
        : ((price - prev) /
            prev) *
          100;

    totalUSD += value;

    document.getElementById(
      stock.symbol + "-price"
    ).textContent =
      "$" +
      price.toFixed(2);

    const changeEl =
      document.getElementById(
        stock.symbol + "-change"
      );

    changeEl.textContent =
      `${changeDollar >= 0 ? "▲" : "▼"} ${
        changeDollar >= 0
          ? "+"
          : ""
      }$${Math.abs(
        changeDollar
      ).toFixed(2)}
      (${changeRate.toFixed(
        2
      )}%)`;

    changeEl.style.color =
      changeDollar >= 0
        ? "#00d26a"
        : "#ff4d4f";

    document.getElementById(
      stock.symbol + "-value"
    ).textContent =
      "$" +
      value.toFixed(2);

  });

  updateTotal(
    totalUSD
  );

}

function updateTotal(totalUSD) {

  const totalKRW =
    totalUSD * usdKrw;

  document.getElementById(
    "totalAsset"
  ).innerHTML =
    "₩" +
    Math.round(
      totalKRW
    ).toLocaleString();

  document.getElementById(
    "totalDollar"
  ).textContent =
    "$" +
    totalUSD.toFixed(2);

  let todayUSD = 0;

  stocks.forEach(stock => {

    const price = Number(
      document.getElementById(
        stock.symbol + "-price"
      ).textContent.replace(
        "$",
        ""
      )
    );

    if (!price) return;

    fetch(
      `${API_URL}?symbols=${stock.symbol}`
    )
      .then(r => r.json())
      .then(d => {

        const q =
          d.stocks[
            stock.symbol
          ];

        if (!q) return;

        todayUSD +=
          (q.current -
            q.previousClose) *
          stock.shares;

        const rate =
          totalUSD === 0
            ? 0
            : (todayUSD /
                totalUSD) *
              100;

        document.getElementById(
          "todayProfit"
        ).textContent =
          `${todayUSD >= 0 ? "▲" : "▼"} ${
            todayUSD >= 0
              ? "+"
              : ""
          }${rate.toFixed(
            2
          )}%`;

        document.getElementById(
          "todayDollar"
        ).textContent =
          `${todayUSD >= 0 ? "▲" : "▼"} ${
            todayUSD >= 0
              ? "+"
              : ""
          }$${Math.abs(
            todayUSD
          ).toFixed(2)}`;

        document.getElementById(
          "todayWon"
        ).textContent =
          `${todayUSD >= 0 ? "▲" : "▼"} ${
            todayUSD >= 0
              ? "+"
              : ""
          }₩${Math.round(
            todayUSD *
              usdKrw
          ).toLocaleString()}`;

      });

  });

}

loadQuotes();

setInterval(
  loadQuotes,
  60000
);