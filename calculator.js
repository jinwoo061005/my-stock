// calculate.js

export function calculateStock(
    symbol,
    prices,
    getTrades
) {
    const price =
        Number(prices[symbol] || 0);

    const trades =
        getTrades()[symbol] || [];

    let shares = 0;
    let totalCost = 0;

    trades.forEach(trade => {

        const tradeShares =
            Number(trade.shares || 0);

        const tradePrice =
            Number(trade.price || 0);

        if (trade.type === "buy") {

            shares += tradeShares;

            totalCost +=
                tradeShares * tradePrice;
        }

        if (trade.type === "sell") {

            shares -= tradeShares;

        }

    });

    const currentValue =
        shares * price;

    const profit =
        currentValue - totalCost;

    const profitPercent =
        totalCost > 0
            ? (profit / totalCost) * 100
            : 0;

    const averagePrice =
        shares > 0
            ? totalCost / shares
            : 0;

    return {
        symbol,
        shares,
        averagePrice,
        totalCost,
        currentPrice: price,
        currentValue,
        profit,
        profitPercent
    };
}