import { loadQuotes } from "./api.js";

async function refreshQuotes() {

  try {

    const data = await loadQuotes();

    updateMarketData(data);

  } catch (e) {

    console.error(e);

  }

}

document.addEventListener("DOMContentLoaded", () => {

  setupEvents();

  refreshQuotes();

  setInterval(refreshQuotes,60000);

});