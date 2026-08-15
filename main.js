// main.js

import { loadQuotes } from "./api.js";

import { getTrades, submitTrade } from "./trade.js";

import { getWallet } from "./wallet.js";

import { calculateStock } from "./calculate.js";

import {
    updateStockCard,
    updateTotal,
    updateDetail,
    updateExchangeRate,
    openDetail,
    closeDetail,
    showTradeForm
} from "./ui.js";

const symbols = [
    "NVDY",
    "QQQM",
    "SCHD",
    "SPMO",
    "VIG"
];

const prices = {};

let usdKrw = 0;

let selectedSymbol = null;

async function refresh() {

    const data = await loadQuotes();

    if (!data) return;

    usdKrw = Number(data.USD_KRW || 0);

    updateExchangeRate(usdKrw);

    symbols.forEach(symbol => {

        prices[symbol] =
            Number(data[symbol] || 0);

        updateStockCard(
            symbol,
            prices,
            usdKrw,
            getTrades
        );

    });

    updateTotal(
        symbols,
        prices,
        usdKrw,
        getTrades
    );

    if (selectedSymbol) {

        updateDetail(
            selectedSymbol,
            prices,
            usdKrw,
            getTrades
        );

    }

}

window.addEventListener(
    "DOMContentLoaded",
    async () => {

        getWallet();

        await refresh();

        setInterval(
            refresh,
            60000
        );

    }
);

window.openDetail = symbol => {

    selectedSymbol = symbol;

    openDetail(symbol);

    updateDetail(
        symbol,
        prices,
        usdKrw,
        getTrades
    );

};

window.closeDetail = () => {

    closeDetail();

};

window.showTradeForm = type => {

    showTradeForm(
        type,
        selectedSymbol,
        prices
    );

};

window.submitTrade = tradeType => {

    const shares =
        Number(
            document.getElementById(
                "trade-shares"
            ).value
        );

    const price =
        Number(
            document.getElementById(
                "trade-price"
            ).value
        );

    const exchangeRate =
        Number(
            document.getElementById(
                "trade-exchange-rate"
            ).value
        );

    const success =
        submitTrade({

            symbol:
                selectedSymbol,

            type:
                tradeType,

            shares,

            price,

            exchangeRate,

            prices,

            usdKrw,

            getTrades,

            calculateStock

        });

    if (!success)
        return;

    updateStockCard(
        selectedSymbol,
        prices,
        usdKrw,
        getTrades
    );

    updateTotal(
        symbols,
        prices,
        usdKrw,
        getTrades
    );

    updateDetail(
        selectedSymbol,
        prices,
        usdKrw,
        getTrades
    );

};