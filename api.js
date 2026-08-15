// api.js

export async function loadQuotes() {

    try {

        const response =
            await fetch(
                "/api/quotes",
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.error(
            "주가 불러오기 실패:",
            error
        );

        return null;

    }

}