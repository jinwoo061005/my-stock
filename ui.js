// ui.js (1/2)

import {
    calculateStock,
    calculatePortfolio,
    formatUSD,
    formatKRW,
    formatPercent
} from "./calculator.js";

export function updateStockCard(
    symbol,
    prices,
    usdKrw,
    getTrades
) {

    const stock =
        calculateStock(
            symbol,
            prices,
            usdKrw,
            getTrades
        );

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
            `${stock.shares.toLocaleString("ko-KR")}주`;

    }

    if (priceElement) {

        priceElement.textContent =
            stock.currentPriceUSD > 0
                ? formatUSD(stock.currentPriceUSD)
                : "--";

    }

    if (valueElement) {

        valueElement.textContent =
            stock.shares > 0 &&
            stock.currentPriceUSD > 0
                ? formatKRW(stock.marketValueKRW)
                : "--";

    }

    const totalProfitKRW =
        stock.evaluationProfitKRW +
        stock.realizedKRW;

    const returnRate =
        stock.costKRW > 0
            ? (totalProfitKRW / stock.costKRW) * 100
            : 0;

    if (profitElement) {

        profitElement.textContent =
            stock.costKRW > 0
                ? formatPercent(returnRate)
                : "--";

        profitElement.classList.remove(
            "up",
            "down"
        );

        if (returnRate > 0)
            profitElement.classList.add("up");

        if (returnRate < 0)
            profitElement.classList.add("down");

    }

}

export function updateTotal(
    symbols,
    prices,
    usdKrw,
    getTrades
) {

    const portfolio =
        calculatePortfolio(
            symbols,
            prices,
            usdKrw,
            getTrades
        );

    const totalValue =
        document.getElementById(
            "total-value"
        );

    if (totalValue) {

        totalValue.textContent =
            formatKRW(
                portfolio.totalValueKRW
            );

    }

    const totalDollar =
        document.getElementById(
            "total-dollar"
        );

    if (totalDollar) {

        const usd =
            usdKrw > 0
                ? portfolio.totalValueKRW /
                  usdKrw
                : 0;

        totalDollar.textContent =
            formatUSD(usd);

    }

    const totalProfit =
        document.getElementById(
            "total-profit"
        );

    if (totalProfit) {

        totalProfit.textContent =
            portfolio.totalCostKRW > 0
                ? `${portfolio.totalProfitKRW >= 0 ? "+" : ""}${formatKRW(portfolio.totalProfitKRW)} (${formatPercent(portfolio.totalReturn)})`
                : "--";

        totalProfit.classList.remove(
            "up",
            "down"
        );

        if (portfolio.totalProfitKRW > 0)
            totalProfit.classList.add("up");

        if (portfolio.totalProfitKRW < 0)
            totalProfit.classList.add("down");

    }

}

export function updateExchangeRate(
    usdKrw
) {

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

// ui.js (2/2)

import {
    calculateStock,
    formatUSD,
    formatKRW,
    formatPercent
} from "./calculator.js";

export function openDetail(symbol) {

    document.getElementById("main-screen").style.display = "none";
    document.getElementById("detail-screen").style.display = "block";
    document.getElementById("detail-symbol").textContent = symbol;
    document.getElementById("trade-form").style.display = "none";

}

export function closeDetail() {

    document.getElementById("detail-screen").style.display = "none";
    document.getElementById("main-screen").style.display = "block";
    document.getElementById("trade-form").style.display = "none";

}

export function updateDetail(
    symbol,
    prices,
    usdKrw,
    getTrades
) {

    const stock =
        calculateStock(
            symbol,
            prices,
            usdKrw,
            getTrades
        );

    document.getElementById("detail-price").textContent =
        stock.currentPriceUSD > 0
            ? formatUSD(stock.currentPriceUSD)
            : "--";

    document.getElementById("detail-shares").textContent =
        `${stock.shares.toLocaleString("ko-KR")}주`;

    document.getElementById("detail-average-buy").textContent =
        stock.averageBuyKRW > 0
            ? formatKRW(stock.averageBuyKRW)
            : "--";

    document.getElementById("detail-value").textContent =
        stock.shares > 0 && stock.currentPriceUSD > 0
            ? formatKRW(stock.marketValueKRW)
            : "--";

    const evaluation =
        document.getElementById("detail-evaluation-profit");

    evaluation.textContent =
        stock.shares > 0
            ? `${stock.evaluationProfitKRW >= 0 ? "+" : ""}${formatKRW(stock.evaluationProfitKRW)}`
            : "--";

    evaluation.classList.remove("up", "down");

    if (stock.evaluationProfitKRW > 0)
        evaluation.classList.add("up");

    if (stock.evaluationProfitKRW < 0)
        evaluation.classList.add("down");

    const realized =
        document.getElementById("detail-realized-profit");

    realized.textContent =
        `${stock.realizedKRW >= 0 ? "+" : ""}${formatKRW(stock.realizedKRW)}`;

    realized.classList.remove("up", "down");

    if (stock.realizedKRW > 0)
        realized.classList.add("up");

    if (stock.realizedKRW < 0)
        realized.classList.add("down");

    const total =
        document.getElementById("detail-total-profit");

    const totalProfitKRW =
        stock.evaluationProfitKRW +
        stock.realizedKRW;

    const returnRate =
        stock.costKRW > 0
            ? (totalProfitKRW / stock.costKRW) * 100
            : 0;

    total.textContent =
        stock.costKRW > 0
            ? formatPercent(returnRate)
            : "--";

    total.classList.remove("up", "down");

    if (returnRate > 0)
        total.classList.add("up");

    if (returnRate < 0)
        total.classList.add("down");

}

export function showTradeForm(
    tradeType,
    selectedSymbol,
    prices
) {

    document.getElementById("trade-form").style.display = "block";

    document.getElementById("trade-title").textContent =
        tradeType === "buy"
            ? "매수"
            : "매도";

    document.getElementById("trade-price").value =
        prices[selectedSymbol] || "";

    document.getElementById("trade-exchange-rate").value = "";

    document.getElementById("trade-shares").value = "";

}