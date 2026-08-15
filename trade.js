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
    getTrades
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


    if (!exchangeRate || exchangeRate <= 0) {

        alert("거래 당시 환율을 입력해주세요.");

        return false;

    }


    const trades =
        getTrades();


    if (!trades[symbol]) {

        trades[symbol] = [];

    }


    if (type === "sell") {

        let currentShares = 0;

        trades[symbol].forEach(trade => {

            if (trade.type === "buy") {

                currentShares +=
                    Number(trade.shares || 0);

            }

            if (trade.type === "sell") {

                currentShares -=
                    Number(trade.shares || 0);

            }

        });


        if (shares > currentShares) {

            alert("보유 수량보다 많이 매도할 수 없습니다.");

            return false;

        }

    }


    trades[symbol].push({

        type,

        shares:
            Number(shares),

        price:
            Number(price),

        exchangeRate:
            Number(exchangeRate),

        date:
            new Date().toISOString()

    });


    saveTrades(trades);


    const form =
        document.getElementById(
            "trade-form"
        );


    if (form) {

        form.style.display =
            "none";

    }


    return true;

}