// ui.js

function calculateStock(symbol, prices, getTrades) {

    const price = Number(prices[symbol] || 0);

    const allTrades = getTrades();
    const trades = allTrades[symbol] || [];

    let shares = 0;
    let totalCost = 0;
    let realizedProfit = 0;

    trades.forEach(trade => {

        const tradeShares = Number(trade.shares || 0);
        const tradePrice = Number(trade.price || 0);

        if (trade.type === "buy") {

            shares += tradeShares;

            totalCost +=
                tradeShares * tradePrice;

        }

        if (trade.type === "sell") {

            const averagePrice =
                shares > 0
                    ? totalCost / shares
                    : 0;

            realizedProfit +=
                (tradePrice - averagePrice) *
                tradeShares;

            shares -= tradeShares;

            totalCost -=
                averagePrice * tradeShares;

        }

    });

    const currentValue =
        shares * price;

    const evaluationProfit =
        currentValue - totalCost;

    const totalProfit =
        evaluationProfit + realizedProfit;

    const profitPercent =
        totalCost > 0
            ? (evaluationProfit / totalCost) * 100
            : 0;

    const averageBuy =
        shares > 0
            ? totalCost / shares
            : 0;

    return {
        shares,
        totalCost,
        currentValue,
        evaluationProfit,
        realizedProfit,
        totalProfit,
        profitPercent,
        averageBuy,
        price
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
        document.getElementById(
            `${symbol}-price`
        );

    const sharesElement =
        document.getElementById(
            `${symbol}-shares-display`
        );

    const valueElement =
        document.getElementById(
            `${symbol}-value`
        );

    const profitElement =
        document.getElementById(
            `${symbol}-profit`
        );


    if (priceElement) {

        priceElement.textContent =
            `$${stock.price.toFixed(2)}`;

    }


    if (sharesElement) {

        sharesElement.textContent =
            `${stock.shares.toFixed(6)}주`;

    }


    if (valueElement) {

        valueElement.textContent =
            `$${stock.currentValue.toFixed(2)}`;

    }


    if (profitElement) {

        profitElement.textContent =
            `${stock.evaluationProfit >= 0 ? "+" : ""}$${stock.evaluationProfit.toFixed(2)} ` +
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

        totalUSD +=
            stock.currentValue;

        totalCostUSD +=
            stock.totalCost;

    });


    const totalKRW =
        totalUSD * usdKrw;


    const totalProfitUSD =
        totalUSD - totalCostUSD;


    const totalProfitKRW =
        totalProfitUSD * usdKrw;


    const totalProfitPercent =
        totalCostUSD > 0
            ? (totalProfitUSD / totalCostUSD) * 100
            : 0;


    const totalValueElement =
        document.getElementById(
            "total-value"
        );

    const totalDollarElement =
        document.getElementById(
            "total-dollar"
        );

    const totalProfitElement =
        document.getElementById(
            "total-profit"
        );


    if (totalValueElement) {

        totalValueElement.textContent =
            `₩${Math.round(totalKRW).toLocaleString()}`;

    }


    if (totalDollarElement) {

        totalDollarElement.textContent =
            `$${totalUSD.toFixed(2)}`;

    }


    if (totalProfitElement) {

        totalProfitElement.textContent =
            `${totalProfitKRW >= 0 ? "+" : ""}` +
            `₩${Math.round(totalProfitKRW).toLocaleString()} ` +
            `(${totalProfitPercent.toFixed(2)}%)`;

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


    const symbolElement =
        document.getElementById(
            "detail-symbol"
        );

    const priceElement =
        document.getElementById(
            "detail-price"
        );

    const sharesElement =
        document.getElementById(
            "detail-shares"
        );

    const averageElement =
        document.getElementById(
            "detail-average-buy"
        );

    const valueElement =
        document.getElementById(
            "detail-value"
        );

    const evaluationProfitElement =
        document.getElementById(
            "detail-evaluation-profit"
        );

    const realizedProfitElement =
        document.getElementById(
            "detail-realized-profit"
        );

    const totalProfitElement =
        document.getElementById(
            "detail-total-profit"
        );


    if (symbolElement) {

        symbolElement.textContent =
            symbol;

    }


    if (priceElement) {

        priceElement.textContent =
            `$${stock.price.toFixed(2)}`;

    }


    if (sharesElement) {

        sharesElement.textContent =
            `${stock.shares.toFixed(6)}주`;

    }


    if (averageElement) {

        averageElement.textContent =
            `$${stock.averageBuy.toFixed(2)}`;

    }


    if (valueElement) {

        valueElement.textContent =
            `$${stock.currentValue.toFixed(2)}`;

    }


    if (evaluationProfitElement) {

        evaluationProfitElement.textContent =
            `${stock.evaluationProfit >= 0 ? "+" : ""}` +
            `$${stock.evaluationProfit.toFixed(2)}`;

    }


    if (realizedProfitElement) {

        realizedProfitElement.textContent =
            `${stock.realizedProfit >= 0 ? "+" : ""}` +
            `$${stock.realizedProfit.toFixed(2)}`;

    }


    if (totalProfitElement) {

        totalProfitElement.textContent =
            `${stock.totalProfit >= 0 ? "+" : ""}` +
            `$${stock.totalProfit.toFixed(2)} ` +
            `(${stock.profitPercent.toFixed(2)}%)`;

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


    if (!usdKrw) {

        element.textContent =
            "--";

        return;

    }


    element.textContent =
        `₩${Math.round(usdKrw).toLocaleString()}`;

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


export function setupUI() {

    const stockCards =
        document.querySelectorAll(
            ".stock-card"
        );


    stockCards.forEach(card => {

        card.addEventListener(
            "click",
            () => {

                const symbol =
                    card.dataset.symbol;

                if (
                    window.openDetail &&
                    symbol
                ) {

                    window.openDetail(
                        symbol
                    );

                }

            }
        );

    });


    const backButton =
        document.getElementById(
            "back-button"
        );


    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                if (
                    window.closeDetail
                ) {

                    window.closeDetail();

                }

            }
        );

    }


    const buyButton =
        document.getElementById(
            "detail-buy-button"
        );


    if (buyButton) {

        buyButton.addEventListener(
            "click",
            () => {

                if (
                    window.showTradeForm
                ) {

                    window.showTradeForm(
                        "buy"
                    );

                }

            }
        );

    }


    const sellButton =
        document.getElementById(
            "detail-sell-button"
        );


    if (sellButton) {

        sellButton.addEventListener(
            "click",
            () => {

                if (
                    window.showTradeForm
                ) {

                    window.showTradeForm(
                        "sell"
                    );

                }

            }
        );

    }

}