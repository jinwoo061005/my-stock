// trade.js

export function getTrades(symbol) {

    const saved =
        localStorage.getItem(
            `${symbol}_trades`
        );

    if (!saved) return [];

    try {

        return JSON.parse(saved);

    } catch {

        return [];

    }

}

export function saveTrades(
    symbol,
    trades
) {

    localStorage.setItem(
        `${symbol}_trades`,
        JSON.stringify(trades)
    );

}

export function submitTrade({

    symbol,

    type,

    shares,

    price,

    exchangeRate,

    calculateStock,

    prices,

    usdKrw

}) {

    if (!symbol) {

        alert("종목 오류");

        return false;

    }

    if (
        !Number.isFinite(shares) ||
        shares <= 0
    ) {

        alert("수량을 입력해줘.");

        return false;

    }

    if (
        !Number.isFinite(price) ||
        price <= 0
    ) {

        alert("가격을 입력해줘.");

        return false;

    }

    if (
        !Number.isFinite(exchangeRate) ||
        exchangeRate <= 0
    ) {

        alert(
            "거래 당시 환율을 입력해줘."
        );

        return false;

    }

    if (type === "sell") {

        const stock =
            calculateStock(
                symbol,
                prices,
                usdKrw,
                getTrades
            );

        if (
            shares >
            stock.shares + 0.0000001
        ) {

            alert(
                `현재 보유수량은 ${stock.shares}주입니다.`
            );

            return false;

        }

    }

    const trades =
        getTrades(symbol);

    trades.push({

        type,

        shares,

        price,

        exchangeRate,

        date:
            new Date().toISOString()

    });

    saveTrades(
        symbol,
        trades
    );

    return true;

}