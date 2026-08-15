// ui.js

function calculateStock(symbol, prices, getTrades) {

    const price = Number(prices[symbol] || 0);
    const trades = getTrades()[symbol] || [];

    let shares = 0;
    let totalCost = 0;
    let realizedProfit = 0;

    trades.forEach(trade => {

        const tradeShares = Number(trade.shares || 0);
        const tradePrice = Number(trade.price || 0);

        if (trade.type === "buy") {

            shares += tradeShares;
            totalCost += tradeShares * tradePrice;

        } else if (trade.type === "sell") {

            const averagePrice =
                shares > 0
                    ? totalCost / shares
                    : 0;

            realizedProfit +=
                (tradePrice - averagePrice) * tradeShares;

            shares -= tradeShares;

            totalCost -= averagePrice * tradeShares;
        }

    });

    const currentValue = shares * price;

    const evaluationProfit =
        currentValue - totalCost;

    const profitPercent =
        totalCost > 0
            ? (evaluationProfit / totalCost) * 100
            : 0;

    const averageBuy =
        shares > 0
            ? totalCost / shares
            : 0;

    return {
        price,
        shares,
        totalCost,
        currentValue,
        evaluationProfit,
        realizedProfit,
        profitPercent,
        averageBuy
    };
}


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
            getTrades
        );

    const priceElement =
        document.getElementById(`${symbol}-price`);

    const sharesElement =
        document.getElementById(`${symbol}-shares-display`);

    const valueElement =
        document.getElementById(`${symbol}-value`);

    const profitElement =
        document.getElementById(`${symbol}-profit`);


    if (priceElement) {

        priceElement.textContent =
            stock.price > 0
                ? `$${stock.price.toFixed(2)}`
                : "--";

    }


    if (sharesElement) {

        sharesElement.textContent =
            `${stock.shares.toFixed(6)}주`;

    }


    if (valueElement) {

        valueElement.textContent =
            stock.currentValue > 0
                ? `$${stock.currentValue.toFixed(2)}`
                : "$0.00";

    }


    if (profitElement) {

        profitElement.textContent =
            `${stock.evaluationProfit >= 0 ? "+" : ""}` +
            `$${stock.evaluationProfit.toFixed(2)} ` +
            `(${stock.profitPercent.toFixed(2)}%)`;

    }

}


export function updateTotal(
    symbols,
    prices,
    usdKrw,
    getTrades
) {

    let totalUSD = 0;
    let totalCostUSD = 0;

    symbols.forEach(symbol => {

        const stock =
            calculateStock(
                symbol,
                prices,
                getTrades
            );

        totalUSD += stock.currentValue;
        totalCostUSD += stock.totalCost;

    });


    const totalKRW =
        totalUSD * usdKrw;

    const profitUSD =
        totalUSD - totalCostUSD;

    const profitKRW =
        profitUSD * usdKrw;

    const profitPercent =
        totalCostUSD > 0
            ? (profitUSD / totalCostUSD) * 100
            : 0;


    const totalValue =
        document.getElementById(
            "total-value"
        );

    const totalDollar =
        document.getElementById(
            "total-dollar"
        );

    const totalProfit =
        document.getElementById(
            "total-profit"
        );


    if (totalValue) {

        totalValue.textContent =
            `₩${Math.round(totalKRW).toLocaleString()}`;

    }


    if (totalDollar) {

        totalDollar.textContent =
            `$${totalUSD.toFixed(2)}`;

    }


    if (totalProfit) {

        totalProfit.textContent =
            `${profitKRW >= 0 ? "+" : ""}` +
            `₩${Math.round(profitKRW).toLocaleString()} ` +
            `(${profitPercent.toFixed(2)}%)`;

    }

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
            getTrades
        );


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

    const evaluationProfit =
        document.getElementById(
            "detail-evaluation-profit"
        );

    const realizedProfit =
        document.getElementById(
            "detail-realized-profit"
        );

    const totalProfit =
        document.getElementById(
            "detail-total-profit"
        );


    if (price) {

        price.textContent =
            stock.price > 0
                ? `$${stock.price.toFixed(2)}`
                : "--";

    }


    if (shares) {

        shares.textContent =
            `${stock.shares.toFixed(6)}주`;

    }


    if (averageBuy) {

        averageBuy.textContent =
            `$${stock.averageBuy.toFixed(2)}`;

    }


    if (value) {

        value.textContent =
            `$${stock.currentValue.toFixed(2)}`;

    }


    if (evaluationProfit) {

        evaluationProfit.textContent =
            `${stock.evaluationProfit >= 0 ? "+" : ""}` +
            `$${stock.evaluationProfit.toFixed(2)}`;

    }


    if (realizedProfit) {

        realizedProfit.textContent =
            `${stock.realizedProfit >= 0 ? "+" : ""}` +
            `$${stock.realizedProfit.toFixed(2)}`;

    }


    if (totalProfit) {

        totalProfit.textContent =
            `${stock.evaluationProfit >= 0 ? "+" : ""}` +
            `$${stock.evaluationProfit.toFixed(2)} ` +
            `(${stock.profitPercent.toFixed(2)}%)`;

    }

}


export function updateExchangeRate(usdKrw) {

    const element =
        document.getElementById("usdkrw");

    if (!element) return;

    element.textContent =
        usdKrw > 0
            ? `₩${Math.round(usdKrw).toLocaleString()}`
            : "--";

}


export function openDetail(symbol) {

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

}


export function closeDetail() {

    const mainScreen =
        document.getElementById(
            "main-screen"
        );

    const detailScreen =
        document.getElementById(
            "detail-screen"
        );


    if (detailScreen) {

        detailScreen.style.display =
            "none";

    }


    if (mainScreen) {

        mainScreen.style.display =
            "block";

    }

}


export function showTradeForm(
    type,
    selectedSymbol,
    prices
) {

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


    if (!form) return;


    if (title) {

        title.textContent =
            type === "buy"
                ? "매수"
                : "매도";

    }


    if (priceInput) {

        priceInput.value =
            prices[selectedSymbol] || "";

    }


    form.dataset.type =
        type;

    form.style.display =
        "block";

}