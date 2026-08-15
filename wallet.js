// wallet.js

const WALLET_KEY = "stockWallet";

export function getWallet() {

    const saved =
        localStorage.getItem(WALLET_KEY);

    if (!saved) {

        const wallet = {
            cashKRW: 0,
            cashUSD: 0
        };

        localStorage.setItem(
            WALLET_KEY,
            JSON.stringify(wallet)
        );

        return wallet;
    }

    try {

        return JSON.parse(saved);

    } catch {

        return {
            cashKRW: 0,
            cashUSD: 0
        };

    }
}

export function saveWallet(wallet) {

    localStorage.setItem(
        WALLET_KEY,
        JSON.stringify(wallet)
    );

}

export function updateWallet({
    type,
    amountKRW = 0,
    amountUSD = 0
}) {

    const wallet =
        getWallet();

    if (type === "deposit") {

        wallet.cashKRW +=
            Number(amountKRW);

        wallet.cashUSD +=
            Number(amountUSD);

    }

    if (type === "withdraw") {

        wallet.cashKRW -=
            Number(amountKRW);

        wallet.cashUSD -=
            Number(amountUSD);

    }

    saveWallet(wallet);

    return wallet;
}