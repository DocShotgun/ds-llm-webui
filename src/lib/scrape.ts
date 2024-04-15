"use server"

import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { decode, encode } from './tokenization';

export async function scrape (url: string) {
    /*const r = await fetch(url,
        {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
            }
        }
    )
    if (r.status != 200) {
        throw new Error("Website scrape failed, check your URL.")
    }*/
    const raw_site = await JSDOM.fromURL(url);
    const reader = new Readability(raw_site.window.document);
    const page = reader.parse();
    let cleaned_page = page?.textContent.replace(/\s+/g, " ")
    let result = `${page?.title}\n${url}\n${cleaned_page}`;
    return result;
}

export async function shorten (text: string, tokens: number, api_url: string, api_key: string = "") {
    let tokenized_text = await encode(text, api_url, api_key);
    if (tokenized_text.length > tokens) {
        tokenized_text.length = tokens;
    }
    const shortened_text = await decode(tokenized_text, api_url, api_key);
    return shortened_text;
}