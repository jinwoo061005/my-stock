// trade.js

const STORAGE_KEY = "stockTrades";

export function getTrades() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return {};
    }

    try {
        return JSON.parse(saved);
    } catch {
        return {};
    }
}

function saveTrades(trades) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(trades)
    );
}

export function submitTrade({
    symbol,
    type,
    shares,
    price,
    exchangeRate,
    prices,
    usdKrw,
    getTrades,
    calculateStock
}) {

    if (!symbol) {
        alert("종목을 선택해주세요.");
        return false;
    }

    if (!shares || shares <= 0) {
        alert("수량을 입력해주세요.");
        return false;
    }

    if (!price || price <= 0) {
        alert("가격을 입력해주세요.");
        return false;
    }

    const trades =
        getTrades();

    if (!trades[symbol]) {
        trades[symbol] = [];
    }

    trades[symbol].push({

        type,

        shares,

        price,

        exchangeRate,

        date:
            new Date().toISOString()

    });

    saveTrades(trades);

    return true;
}