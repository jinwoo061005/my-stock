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