"use server"

export async function encode (text: string, api_url: string, api_key: string = "") {
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