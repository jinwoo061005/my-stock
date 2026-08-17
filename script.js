/* =========================================================
   My Stock
   - 현재 보유주식 평가수익
   - 환차익
   - 판매수익
   - 일간수익 별도 관리
   ========================================================= */


/* =========================================================
   보유 종목
========================================================= */

const stocks = [
  {
    symbol: "NVDY",
    shares: 14,
    averageBuy: 0
  },
  {
    symbol: "QQQM",
    shares: 0.759174,
    averageBuy: 0
  },
  {
    symbol: "SCHD",
    shares: 5,
    averageBuy: 0
  },
  {
    symbol: "SPMO",
    shares: 1.336567,
    averageBuy: 0
  },
  {
    symbol: "SKHY",
    shares: 3,
    averageBuy: 0
  },
  {
    symbol: "VIG",
    shares: 0.651781,
    averageBuy: 0
  }
];


/* =========================================================
   판매수익
========================================================= */

let realizedProfit =
  Number(localStorage.getItem("realizedProfit") || 0);


/* =========================================================
   일간 수익 데이터
========================================================= */

const DAILY_STORAGE_KEY = "dailyProfitRecords";


function loadDailyRecords() {

  try {

    const saved =
      localStorage.getItem(DAILY_STORAGE_KEY);

    if (!saved) {
      return {};
    }

    return JSON.parse(saved);

  } catch (error) {

    console.error(
      "일간 수익 데이터 로딩 실패",
      error
    );

    return {};
  }
}


let dailyRecords = loadDailyRecords();


function saveDailyRecords() {

  localStorage.setItem(
    DAILY_STORAGE_KEY,
    JSON.stringify(dailyRecords)
  );
}


/* =========================================================
   날짜
========================================================= */

function getDateString(date) {

  const year =
    date.getFullYear();

  const month =
    String(date.getMonth() + 1)
      .padStart(2, "0");

  const day =
    String(date.getDate())
      .padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function getLast30Days() {

  const result = [];

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  for (let i = 0; i < 30; i++) {

    const date =
      new Date(today);

    date.setDate(
      today.getDate() - i
    );

    result.push(
      getDateString(date)
    );
  }

  return result;
}


/* =========================================================
   수익 색상
========================================================= */

function setProfitColor(
  element,
  value
) {

  if (!element) {
    return;
  }

  element.classList.remove(
    "profit-up",
    "profit-down",
    "profit-zero"
  );

  if (value > 0) {

    element.classList.add(
      "profit-up"
    );

  } else if (value < 0) {

    element.classList.add(
      "profit-down"
    );

  } else {

    element.classList.add(
      "profit-zero"
    );
  }
}


/* =========================================================
   숫자 포맷
========================================================= */

function formatKRW(value) {

  if (!Number.isFinite(value)) {
    return "₩0";
  }

  const sign =
    value > 0
      ? "+"
      : value < 0
        ? "-"
        : "";

  return (
    sign +
    "₩" +
    Math.abs(value)
      .toLocaleString("ko-KR", {
        maximumFractionDigits: 0
      })
  );
}


function formatUSD(value) {

  if (!Number.isFinite(value)) {
    return "$0.00";
  }

  const sign =
    value > 0
      ? "+"
      : value < 0
        ? "-"
        : "";

  return (
    sign +
    "$" +
    Math.abs(value)
      .toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
  );
}


function formatRate(value) {

  if (!Number.isFinite(value)) {
    return "0.00%";
  }

  const sign =
    value > 0
      ? "+"
      : "";

  return (
    sign +
    value.toFixed(2) +
    "%"
  );
}


/* =========================================================
   API
========================================================= */

async function loadMarketData() {

  try {

    const response =
      await fetch("/api/quote");

    if (!response.ok) {
      throw new Error(
        "API 오류"
      );
    }

    const data =
      await response.json();


    /* 환율 */

    const usdKrw =
      Number(data.USD_KRW || 0);

    const usdElement =
      document.getElementById(
        "usdkrw"
      );

    if (usdElement) {

      usdElement.textContent =
        usdKrw
          ? `₩${usdKrw.toLocaleString(
              "ko-KR",
              {
                maximumFractionDigits: 2
              }
            )}`
          : "--";
    }


    /* 미국주식 */

    stocks.forEach(stock => {

      const price =
        Number(
          data[stock.symbol] || 0
        );

      const priceElement =
        document.getElementById(
          `${stock.symbol}-price`
        );

      const valueElement =
        document.getElementById(
          `${stock.symbol}-value`
        );

      const sharesElement =
        document.getElementById(
          `${stock.symbol}-shares-display`
        );


      if (sharesElement) {

        sharesElement.textContent =
          `${stock.shares}주`;
      }


      if (priceElement) {

        priceElement.textContent =
          price
            ? `$${price.toFixed(2)}`
            : "--";
      }


      if (valueElement) {

        const valueUSD =
          price * stock.shares;

        valueElement.textContent =
          usdKrw
            ? `₩${Math.round(
                valueUSD * usdKrw
              ).toLocaleString()}`
            : `$${valueUSD.toFixed(2)}`;
      }


      if (
        stock.averageBuy > 0 &&
        priceElement
      ) {

        const profitRate =
          (
            (price -
              stock.averageBuy) /
            stock.averageBuy
          ) * 100;

        const profitElement =
          document.getElementById(
            `${stock.symbol}-profit`
          );

        if (profitElement) {

          profitElement.textContent =
            formatRate(
              profitRate
            );

          setProfitColor(
            profitElement,
            profitRate
          );
        }
      }

    });


    updateTotalAsset(
      data,
      usdKrw
    );

  } catch (error) {

    console.error(
      "시장 데이터 오류:",
      error
    );
  }
}


/* =========================================================
   총 평가금 / 평가수익
========================================================= */

function updateTotalAsset(
  data,
  usdKrw
) {

  let totalUSD = 0;

  let totalCostUSD = 0;


  stocks.forEach(stock => {

    const price =
      Number(
        data[stock.symbol] || 0
      );

    const value =
      price * stock.shares;

    totalUSD += value;


    if (stock.averageBuy > 0) {

      totalCostUSD +=
        stock.averageBuy *
        stock.shares;
    }

  });


  const totalKRW =
    totalUSD * usdKrw;


  /* 총 평가금 */

  const totalValueElement =
    document.getElementById(
      "total-value"
    );

  if (totalValueElement) {

    totalValueElement.textContent =
      `₩${Math.round(
        totalKRW
      ).toLocaleString()}`;
  }


  const totalDollarElement =
    document.getElementById(
      "total-dollar"
    );

  if (totalDollarElement) {

    totalDollarElement.textContent =
      `$${totalUSD.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`;
  }


  /* 평가수익 */

  let evaluationProfitUSD = 0;

  if (totalCostUSD > 0) {

    evaluationProfitUSD =
      totalUSD -
      totalCostUSD;
  }


  const evaluationProfitKRW =
    evaluationProfitUSD *
    usdKrw;


  const profitElement =
    document.getElementById(
      "total-profit"
    );


  if (profitElement) {

    profitElement.textContent =
      `${formatKRW(
        evaluationProfitKRW
      )} (${formatUSD(
        evaluationProfitUSD
      )})`;

    setProfitColor(
      profitElement,
      evaluationProfitKRW
    );
  }


  /* 판매수익 */

  const realizedElement =
    document.getElementById(
      "total-realized-profit"
    );

  if (realizedElement) {

    realizedElement.textContent =
      formatKRW(
        realizedProfit
      );

    setProfitColor(
      realizedElement,
      realizedProfit
    );
  }


  /* 환차익 */

  const fxElement =
    document.getElementById(
      "total-fx-profit"
    );

  if (fxElement) {

    const fxProfit =
      calculateFXProfit(
        usdKrw
      );

    fxElement.textContent =
      formatKRW(
        fxProfit
      );

    setProfitColor(
      fxElement,
      fxProfit
    );
  }

}


/* =========================================================
   환차익
========================================================= */

function calculateFXProfit(
  currentExchangeRate
) {

  let fxProfit = 0;

  stocks.forEach(stock => {

    const savedRate =
      Number(
        localStorage.getItem(
          `${stock.symbol}_exchangeRate`
        ) || 0
      );

    if (
      savedRate > 0 &&
      currentExchangeRate > 0
    ) {

      fxProfit +=
        stock.shares *
        stock.averageBuy *
        (
          currentExchangeRate -
          savedRate
        );
    }

  });

  return fxProfit;
}


/* =========================================================
   일간 수익 화면
========================================================= */

function openDailyScreen() {

  document.getElementById(
    "main-screen"
  ).style.display = "none";

  document.getElementById(
    "daily-screen"
  ).style.display = "block";

  renderDailyRecords();
}


function closeDailyScreen() {

  document.getElementById(
    "daily-screen"
  ).style.display = "none";

  document.getElementById(
    "main-screen"
  ).style.display = "block";
}


/* =========================================================
   일간 수익 렌더링
========================================================= */

function renderDailyRecords() {

  const container =
    document.getElementById(
      "daily-record-list"
    );

  if (!container) {
    return;
  }

  container.innerHTML = "";


  const dates =
    getLast30Days();


  let cumulativeRate = 0;


  /*
   * 오래된 날짜부터 누적 계산
   */
  const chronologicalDates =
    [...dates].reverse();


  chronologicalDates.forEach(date => {

    const record =
      dailyRecords[date] || {
        krw: 0,
        usd: 0,
        rate: 0
      };

    cumulativeRate +=
      Number(record.rate || 0);
  });


  /*
   * 다시 오늘부터 표시
   */
  cumulativeRate = 0;

  chronologicalDates.forEach(date => {

    const record =
      dailyRecords[date] || {
        krw: 0,
        usd: 0,
        rate: 0
      };

    cumulativeRate +=
      Number(record.rate || 0);

    record._cumulative =
      cumulativeRate;
  });


  dates.forEach((date, index) => {

    const record =
      dailyRecords[date] || {
        krw: 0,
        usd: 0,
        rate: 0
      };


    const row =
      document.createElement(
        "div"
      );

    row.className =
      "daily-record";


    const rate =
      Number(record.rate || 0);


    const cumulative =
      Number(
        record._cumulative || 0
      );


    const dateObject =
      new Date(
        `${date}T00:00:00`
      );


    const formattedDate =
      dateObject.toLocaleDateString(
        "ko-KR",
        {
          month: "long",
          day: "numeric"
        }
      );


    const day =
      dateObject.toLocaleDateString(
        "ko-KR",
        {
          weekday: "short"
        }
      );


    row.innerHTML = `

      <div class="daily-record-top">

        <div class="daily-date">

          ${formattedDate}

          <small>
            ${day}${index === 0 ? " · 오늘" : ""}
          </small>

        </div>


        <div
          class="daily-rate
          ${
            rate > 0
              ? "profit-up"
              : rate < 0
                ? "profit-down"
                : "profit-zero"
          }"
        >
          ${formatRate(rate)}
        </div>

      </div>


      <div class="daily-values">

        <div class="daily-value">
          원화
          <strong>
            ${formatKRW(
              Number(record.krw || 0)
            )}
          </strong>
        </div>


        <div class="daily-value">
          달러
          <strong>
            ${formatUSD(
              Number(record.usd || 0)
            )}
          </strong>
        </div>


        <div class="daily-cumulative">
          누적
          <strong
            class="${
              cumulative > 0
                ? "profit-up"
                : cumulative < 0
                  ? "profit-down"
                  : "profit-zero"
            }"
          >
            ${formatRate(cumulative)}
          </strong>
        </div>

      </div>


      <button
        class="daily-edit-button"
        data-date="${date}"
      >
        수정
      </button>

    `;


    container.appendChild(row);

  });


  updateDailyTotalRate();
  attachDailyEditEvents();
}


/* =========================================================
   30일 누적 수익률
========================================================= */

function updateDailyTotalRate() {

  const dates =
    getLast30Days();

  let total = 0;

  dates.forEach(date => {

    const record =
      dailyRecords[date];

    if (record) {

      total +=
        Number(
          record.rate || 0
        );
    }

  });


  const element =
    document.getElementById(
      "daily-total-rate"
    );


  if (!element) {
    return;
  }


  element.textContent =
    formatRate(total);


  setProfitColor(
    element,
    total
  );
}


/* =========================================================
   일간 수익 수정
========================================================= */

function attachDailyEditEvents() {

  document
    .querySelectorAll(
      ".daily-edit-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const date =
            button.dataset.date;


          const old =
            dailyRecords[date] || {
              krw: 0,
              usd: 0,
              rate: 0
            };


          const rateInput =
            prompt(
              `${date} 수익률 (%)`,
              old.rate
            );


          if (
            rateInput === null
          ) {
            return;
          }


          const krwInput =
            prompt(
              `${date} 원화 수익`,
              old.krw
            );


          if (
            krwInput === null
          ) {
            return;
          }


          const usdInput =
            prompt(
              `${date} 달러 수익`,
              old.usd
            );


          if (
            usdInput === null
          ) {
            return;
          }


          const rate =
            Number(
              rateInput
            );

          const krw =
            Number(
              krwInput
            );

          const usd =
            Number(
              usdInput
            );


          if (
            !Number.isFinite(rate) ||
            !Number.isFinite(krw) ||
            !Number.isFinite(usd)
          ) {

            alert(
              "숫자만 입력하세요."
            );

            return;
          }


          dailyRecords[date] = {
            rate,
            krw,
            usd
          };


          saveDailyRecords();

          renderDailyRecords();

        }
      );

    });
}


/* =========================================================
   이벤트
========================================================= */

document
  .getElementById(
    "daily-profit-button"
  )
  ?.addEventListener(
    "click",
    openDailyScreen
  );


document
  .getElementById(
    "daily-back-button"
  )
  ?.addEventListener(
    "click",
    closeDailyScreen
  );


/* =========================================================
   시작
========================================================= */

loadMarketData();


/*
 * 1분마다 갱신
 */
setInterval(
  loadMarketData,
  60 * 1000
);