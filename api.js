// api.js

export async function loadQuotes() {

    try {

        const response =
            await fetch("/api/quotes");

        if (!response.ok) {
            throw new Error("API 오류");
        }

        const data =
            await response.json();

        return data;

    } catch (error) {

        console.error(
            "시세 불러오기 실패:",
            error
        );

        return null;
    }
}