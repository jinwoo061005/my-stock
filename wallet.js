// wallet.js

const STORAGE_KEY = "wallet";

const DEFAULT_WALLET = {
    krw: 0,
    usd: 0,
    usdCostKRW: 0
};

export function getWallet() {

    const saved =
        localStorage.getItem(STORAGE_KEY);

    if (!saved) {

        saveWallet(DEFAULT_WALLET);

        return { ...DEFAULT_WALLET };

    }

    try {

        return JSON.parse(saved);

    } catch {

        saveWallet(DEFAULT_WALLET);

        return { ...DEFAULT_WALLET };

    }

}

export function saveWallet(wallet) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(wallet)
    );

}

export function resetWallet() {

    saveWallet(DEFAULT_WALLET);

}

export function depositKRW(amount) {

    const wallet = getWallet();

    wallet.krw += Number(amount);

    saveWallet(wallet);

    return wallet;

}

export function withdrawKRW(amount) {

    const wallet = getWallet();

    wallet.krw -= Number(amount);

    if (wallet.krw < 0)
        wallet.krw = 0;

    saveWallet(wallet);

    return wallet;

}

export function exchangeToUSD(
    krw,
    rate
) {

    const wallet =
        getWallet();

    const usd =
        krw / rate;

    wallet.krw -= krw;

    wallet.usd += usd;

    wallet.usdCostKRW += krw;

    saveWallet(wallet);

    return wallet;

}

export function exchangeToKRW(
    usd,
    rate
) {

    const wallet =
        getWallet();

    const krw =
        usd * rate;

    wallet.usd -= usd;

    if (wallet.usd < 0)
        wallet.usd = 0;

    wallet.krw += krw;

    saveWallet(wallet);

    return wallet;

}

export function getAverageExchangeRate() {

    const wallet =
        getWallet();

    if (wallet.usd <= 0)
        return 0;

    return (
        wallet.usdCostKRW /
        wallet.usd
    );

}