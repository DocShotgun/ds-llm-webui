"use server"

import { MessageType } from "@/types/default"

export async function encode (text: string | MessageType[], api_url: string, api_key: string = "") {
    const r = await fetch(api_url + "/v1/token/encode",
        {
            method: "POST",
            headers: {
            "Content-type": "application/json; charset=UTF-8",
            "authorization": api_key,
            "x-api-key": api_key,
            },
            body: JSON.stringify({
            "text": text,
            "add_bos_token": false
            })
        }
    )
    if (r.status != 200) {
        throw new Error("Token encode failed. Check your API URL and key.")
    }
    const responseData = await(r.json())
    return responseData.tokens
}

export async function decode (tokens: number[], api_url: string, api_key: string = "") {
    const r = await fetch(api_url + "/v1/token/decode",
        {
            method: "POST",
            headers: {
            "Content-type": "application/json; charset=UTF-8",
            "authorization": api_key,
            "x-api-key": api_key,
            },
            body: JSON.stringify({
            "tokens": tokens,
            "add_bos_token": false
            })
        }
    )
    if (r.status != 200) {
        throw new Error("Token decode failed. Check your API URL and key.")
    }
    const responseData = await(r.json())
    return responseData.text
}

export async function shorten_prompt (prompt: MessageType[], max_seq_len: number, max_tokens: number, api_url: string, api_key: string = "", keepfirst: boolean = true) {
    while ((await encode(prompt, api_url, api_key)).length >= (max_seq_len - max_tokens)) {
        if (keepfirst) prompt.splice(1,1) // Remove the second element of the array, because the first one is the system prompt
        else prompt.shift()
    }
    return prompt
}