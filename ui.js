// ui.js

export function updateStockCard(
    symbol,
    prices,
    usdKrw,
    getTrades
) {

    const price =
        Number(prices[symbol] || 0);

    const trades =
        getTrades()[symbol] || [];

    let shares = 0;
    let totalCostUSD = 0;

    trades.forEach(trade => {

        const quantity =
            Number(trade.shares || 0);

        const tradePrice =
            Number(trade.price || 0);

        if (trade.type === "buy") {

            shares += quantity;

            totalCostUSD +=
                quantity * tradePrice;

        }

        if (trade.type === "sell") {

            shares -= quantity;

        }

    });

    const valueUSD =
        shares * price;

    const averagePrice =
        shares > 0
            ? totalCostUSD / shares
            : 0;

    const profitUSD =
        valueUSD -
        totalCostUSD;

    const profitPercent =
        totalCostUSD > 0
            ? (profitUSD / totalCostUSD) * 100
            : 0;

    const priceElement =
        document.getElementById(
            `${symbol}-price`
        );

    const sharesElement =
        document.getElementById(
            `${symbol}-shares`
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
            `$${price.toFixed(2)}`;

    }

    if (sharesElement) {

        sharesElement.textContent =
            `${shares.toFixed(6)}주`;

    }

    if (valueElement) {

        valueElement.textContent =
            `$${valueUSD.toFixed(2)}`;

    }

    if (profitElement) {

        profitElement.textContent =
            `${profitUSD >= 0 ? "+" : ""}$${profitUSD.toFixed(2)} (${profitPercent.toFixed(2)}%)`;

    }
}


export function updateTotal(
    symbols,
    prices,
    usdKrw,
    getTrades
) {

    let totalUSD = 0;

    symbols.forEach(symbol => {

        const price =
            Number(prices[symbol] || 0);

        const trades =
            getTrades()[symbol] || [];

        let shares = 0;

        trades.forEach(trade => {

            const quantity =
                Number(trade.shares || 0);

            if (trade.type === "buy") {

                shares += quantity;

            }

            if (trade.type === "sell") {

                shares -= quantity;

            }

        });

        totalUSD +=
            shares * price;

    });

    const totalKRW =
        totalUSD * usdKrw;

    const totalElement =
        document.getElementById(
            "total-asset"
        );

    const totalUSDElement =
        document.getElementById(
            "total-asset-usd"
        );

    if (totalElement) {

        totalElement.textContent =
            `${Math.round(totalKRW).toLocaleString()}원`;

    }

    if (totalUSDElement) {

        totalUSDElement.textContent =
            `$${totalUSD.toFixed(2)}`;

    }
}


export function updateDetail(
    symbol,
    prices,
    usdKrw,
    getTrades
) {

    const price =
        Number(prices[symbol] || 0);

    const trades =
        getTrades()[symbol] || [];

    let shares = 0;
    let totalCost = 0;

    trades.forEach(trade => {

        const quantity =
            Number(trade.shares || 0);

        const tradePrice =
            Number(trade.price || 0);

        if (trade.type === "buy") {

            shares += quantity;

            totalCost +=
                quantity * tradePrice;

        }

        if (trade.type === "sell") {

            shares -= quantity;

        }

    });

    const value =
        shares * price;

    const profit =
        value - totalCost;

    const averagePrice =
        shares > 0
            ? totalCost / shares
            : 0;

    const detailPrice =
        document.getElementById(
            "detail-price"
        );

    const detailShares =
        document.getElementById(
            "detail-shares"
        );

    const detailAverage =
        document.getElementById(
            "detail-average"
        );

    const detailValue =
        document.getElementById(
            "detail-value"
        );

    const detailProfit =
        document.getElementById(
            "detail-profit"
        );

    if (detailPrice) {

        detailPrice.textContent =
            `$${price.toFixed(2)}`;

    }

    if (detailShares) {

        detailShares.textContent =
            `${shares.toFixed(6)}주`;

    }

    if (detailAverage) {

        detailAverage.textContent =
            `$${averagePrice.toFixed(2)}`;

    }

    if (detailValue) {

        detailValue.textContent =
            `$${value.toFixed(2)}`;

    }

    if (detailProfit) {

        detailProfit.textContent =
            `${profit >= 0 ? "+" : ""}$${profit.toFixed(2)}`;

    }
}


export function updateExchangeRate(
    usdKrw
) {

    const element =
        document.getElementById(
            "exchange-rate"
        );

    if (!element) return;

    element.textContent =
        `${Math.round(usdKrw).toLocaleString()}원`;

}


export function openDetail(
    symbol
) {

    const modal =
        document.getElementById(
            "detail-modal"
        );

    if (!modal) return;

    const title =
        document.getElementById(
            "detail-symbol"
        );

    if (title) {

        title.textContent =
            symbol;

    }

    modal.style.display =
        "block";

}


export function closeDetail() {

    const modal =
        document.getElementById(
            "detail-modal"
        );

    if (!modal) return;

    modal.style.display =
        "none";

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

    if (!form) return;

    const title =
        document.getElementById(
            "trade-form-title"
        );

    const priceInput =
        document.getElementById(
            "trade-price"
        );

    const symbolElement =
        document.getElementById(
            "trade-symbol"
        );

    if (title) {

        title.textContent =
            type === "buy"
                ? "매수"
                : "매도";

    }

    if (symbolElement) {

        symbolElement.textContent =
            selectedSymbol || "";

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