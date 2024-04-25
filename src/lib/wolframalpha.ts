"use server"

import { serverAbortController } from "./abort"

export async function getWolfram(query: string, appid: string = "DEMO") {
    const signal = serverAbortController.signal
    const baseURL = "https://www.wolframalpha.com/api/v1/llm-api?"
    const r = await fetch(baseURL + new URLSearchParams({
        input: query,
        appid: appid
    }),
    {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
        },
        signal: signal
    })
    if (r.status != 200) {
        throw Error("Wolfram Alpha query failed. Please inform the user and then answer to the best of your ability.")
    }
    const result = await(r.text())
    return result.trim()
}