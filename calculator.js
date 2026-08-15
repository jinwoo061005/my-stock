// calculate.js

export function calculateStock(
    symbol,
    prices,
    getTrades
) {

    const price =
        Number(
            prices[symbol] || 0
        );


    const allTrades =
        getTrades();


    const trades =
        allTrades[symbol] || [];


    let shares = 0;

    let totalCost = 0;

    let realizedProfit = 0;


    trades.forEach(trade => {

        const tradeShares =
            Number(
                trade.shares || 0
            );


        const tradePrice =
            Number(
                trade.price || 0
            );


        if (trade.type === "buy") {

            shares +=
                tradeShares;


            totalCost +=
                tradeShares *
                tradePrice;

        }


        if (trade.type === "sell") {

            const averagePrice =
                shares > 0
                    ? totalCost / shares
                    : 0;


            realizedProfit +=
                (
                    tradePrice -
                    averagePrice
                ) *
                tradeShares;


            shares -=
                tradeShares;


            totalCost -=
                averagePrice *
                tradeShares;

        }

    });


    const currentValue =
        shares * price;


    const evaluationProfit =
        currentValue -
        totalCost;


    const profitPercent =
        totalCost > 0
            ? (
                evaluationProfit /
                totalCost
            ) * 100
            : 0;


    const averageBuy =
        shares > 0
            ? totalCost / shares
            : 0;


    return {

        symbol,

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