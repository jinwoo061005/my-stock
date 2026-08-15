// calculator.js

export function formatUSD(value) {
    return `$${Number(value).toFixed(2)}`;
}

export function formatKRW(value) {
    return `₩${Math.round(value).toLocaleString("ko-KR")}`;
}

export function formatPercent(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function calculateStock(symbol, prices, usdKrw, getTrades) {

    const trades = getTrades(symbol);

    let shares = 0;
    let costKRW = 0;
    let realizedKRW = 0;

    trades.forEach(trade => {

        const quantity = Number(trade.shares);
        const priceUSD = Number(trade.price);
        const exchangeRate = Number(trade.exchangeRate);

        if (
            !Number.isFinite(quantity) ||
            !Number.isFinite(priceUSD) ||
            quantity <= 0 ||
            priceUSD <= 0
        ) {
            return;
        }

        const rate =
            Number.isFinite(exchangeRate) &&
            exchangeRate > 0
                ? exchangeRate
                : usdKrw;

        if (trade.type === "buy") {

            const buyCostKRW =
                quantity *
                priceUSD *
                rate;

            costKRW += buyCostKRW;
            shares += quantity;

        }

        if (trade.type === "sell") {

            if (shares <= 0) return;

            const sellQuantity =
                Math.min(quantity, shares);

            const averageCostKRW =
                costKRW / shares;

            const sellRevenueKRW =
                sellQuantity *
                priceUSD *
                rate;

            const soldCostKRW =
                averageCostKRW *
                sellQuantity;

            realizedKRW +=
                sellRevenueKRW -
                soldCostKRW;

            costKRW -=
                soldCostKRW;

            shares -=
                sellQuantity;

        }

    });

    const currentPriceUSD =
        Number(prices[symbol]) || 0;

    const marketValueKRW =
        currentPriceUSD *
        shares *
        usdKrw;

    const averageBuyKRW =
        shares > 0
            ? costKRW / shares
            : 0;

    const evaluationProfitKRW =
        marketValueKRW -
        costKRW;

    return {

        shares,

        costKRW,

        averageBuyKRW,

        currentPriceUSD,

        marketValueKRW,

        evaluationProfitKRW,

        realizedKRW

    };

}

export function calculatePortfolio(
    symbols,
    prices,
    usdKrw,
    getTrades
) {

    let totalValueKRW = 0;
    let totalCostKRW = 0;
    let totalRealizedKRW = 0;

    symbols.forEach(symbol => {

        const stock =
            calculateStock(
                symbol,
                prices,
                usdKrw,
                getTrades
            );

        totalValueKRW +=
            stock.marketValueKRW;

        totalCostKRW +=
            stock.costKRW;

        totalRealizedKRW +=
            stock.realizedKRW;

    });

    const evaluationProfitKRW =
        totalValueKRW -
        totalCostKRW;

    const totalProfitKRW =
        evaluationProfitKRW +
        totalRealizedKRW;

    const totalReturn =
        totalCostKRW > 0
            ? (totalProfitKRW / totalCostKRW) * 100
            : 0;

    return {

        totalValueKRW,

        totalCostKRW,

        totalRealizedKRW,

        evaluationProfitKRW,

        totalProfitKRW,

        totalReturn

    };

}