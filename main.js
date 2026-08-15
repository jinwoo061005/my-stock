// main.js

import { getTrades, submitTrade } from "./trade.js";
import { getWallet } from "./wallet.js";

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
    "VIG",
    "SKHY"
];


const prices = {};

let usdKrw = 0;

let selectedSymbol = null;


/* =========================
   API
========================= */

async function loadQuotes() {

    const response =
        await fetch(
            "/api/quotes?_=" +
            Date.now(),
            {
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            `API ERROR ${response.status}`
        );

    }


    return await response.json();

}


/* =========================
   주가를 HTML에 직접 표시
========================= */

function renderPrices(data) {

    symbols.forEach(symbol => {

        const price =
            Number(
                data[symbol]
            );


        prices[symbol] =
            Number.isFinite(price)
                ? price
                : 0;


        const element =
            document.getElementById(
                symbol + "-price"
            );


        if (!element) {

            console.error(
                "HTML 요소 없음:",
                symbol + "-price"
            );

            return;

        }


        if (
            prices[symbol] > 0
        ) {

            element.textContent =
                "$" +
                prices[symbol].toFixed(2);

        } else {

            element.textContent =
                "--";

        }

    });


    usdKrw =
        Number(
            data.USD_KRW
        );


    const usdElement =
        document.getElementById(
            "usdkrw"
        );


    if (
        usdElement &&
        usdKrw > 0
    ) {

        usdElement.textContent =
            "₩" +
            Math.round(usdKrw)
                .toLocaleString();

    }

}


/* =========================
   전체 갱신
========================= */

async function refresh() {

    try {

        const data =
            await loadQuotes();


        console.log(
            "QUOTE DATA:",
            data
        );


        /* 주가 */

        renderPrices(
            data
        );


        /* 기존 UI 계산 */

        symbols.forEach(symbol => {

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


    } catch (error) {

        console.error(
            "주가 갱신 실패:",
            error
        );

    }

}


/* =========================
   시작
========================= */

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


/* =========================
   상세
========================= */

window.openDetail = symbol => {

    selectedSymbol =
        symbol;


    openDetail(
        symbol
    );


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


/* =========================
   거래
========================= */

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

            getTrades

        });


    if (!success) {

        return;

    }


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