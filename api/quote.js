export default async function handler(req, res) {

  const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

  if (!FINNHUB_API_KEY) {
    return res.status(500).json({
      error: "FINNHUB_API_KEY가 설정되지 않았습니다."
    });
  }

  const symbols = [
    "NVDY",
    "QQQM",
    "SCHD",
    "SPMO",
    "SKADR",
    "VIG"
  ];

  try {

    const results = {};

    for (const symbol of symbols) {

      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
      );

      if (!response.ok) {
        continue;
      }

      const data = await response.json();

      if (data.c && data.c > 0) {
        results[symbol] = data.c;
      }

    }

    // USD/KRW 환율
    const fxResponse = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${FINNHUB_API_KEY}`
    );

    if (fxResponse.ok) {

      const fxData = await fxResponse.json();

      if (fxData.quote && fxData.quote.KRW) {
        results.USD_KRW = fxData.quote.KRW;
      }

    }

    return res.status(200).json(results);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "주가 데이터를 가져오지 못했습니다."
    });

  }

}

// api/quote.js가 정상적으로 JSON만 반환하는지 확인하는 테스트용 코드

export default async function handler(req, res) {

  res.setHeader("Content-Type", "application/json");

  return res.status(200).json({
    NVDY: 0,
    QQQM: 0,
    SCHD: 0,
    SPMO: 0,
    SKADR: 0,
    VIG: 0,
    USD_KRW: 0
  });

}

const API_URL = "/api/quote";

async function testAPI() {

  try {

    const response = await fetch(API_URL);
    const text = await response.text();

    console.log("API 상태:", response.status);
    console.log("API 응답:", text);

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const data = JSON.parse(text);

    console.log("NVDY:", data.NVDY);
    console.log("QQQM:", data.QQQM);
    console.log("SCHD:", data.SCHD);
    console.log("SPMO:", data.SPMO);
    console.log("SKADR:", data.SKADR);
    console.log("VIG:", data.VIG);
    console.log("USD/KRW:", data.USD_KRW);

  } catch (error) {

    console.error("API 테스트 실패:", error);

  }

}

testAPI();

async function checkAPI() {

  try {

    const response = await fetch(API_URL);

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {

      const text = await response.text();

      console.error(
        "API가 JSON이 아닌 응답을 반환했습니다:",
        text
      );

      return false;
    }

    const data = await response.json();

    if (data.error) {

      console.error(
        "API 오류:",
        data.error
      );

      return false;
    }

    console.log("API 정상:", data);

    return true;

  } catch (error) {

    console.error(
      "API 연결 실패:",
      error
    );

    return false;
  }

}

checkAPI();

function showAPIStatus(isOnline) {

  const status = document.getElementById("api-status");

  if (!status) return;

  if (isOnline) {
    status.textContent = "실시간";
    status.classList.remove("offline");
    status.classList.add("online");
  } else {
    status.textContent = "연결 오류";
    status.classList.remove("online");
    status.classList.add("offline");
  }

}

async function updateAPIStatus() {

  const isOnline = await checkAPI();

  showAPIStatus(isOnline);

}

document.addEventListener("DOMContentLoaded", () => {
  updateAPIStatus();

  setInterval(() => {
    updateAPIStatus();
  }, 60000);
});

// API 상태와 주가를 함께 갱신
async function updateApp() {

  const isOnline = await checkAPI();

  showAPIStatus(isOnline);

  if (isOnline) {
    await refreshQuotes();
  }

}

document.addEventListener("DOMContentLoaded", () => {
  updateApp();

  setInterval(() => {
    updateApp();
  }, 60000);
});

export default async function handler(req, res) {
  const API_KEY = process.env.FINNHUB_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "FINNHUB_API_KEY missing"
    });
  }

  const symbols = ["NVDY", "QQQM", "SCHD", "SPMO", "SKADR", "VIG"];

  try {
    const result = {};

    for (const symbol of symbols) {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`
      );

      if (!response.ok) continue;

      const data = await response.json();

      if (data.c > 0) {
        result[symbol] = data.c;
      }
    }

    const fxResponse = await fetch(
      `https://finnhub.io/api/v1/forex/rates?base=USD&token=${API_KEY}`
    );

    if (fxResponse.ok) {
      const fxData = await fxResponse.json();

      if (fxData.quote?.KRW) {
        result.USD_KRW = fxData.quote.KRW;
      }
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to fetch stock data"
    });
  }
}