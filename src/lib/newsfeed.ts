"use server"

import Parser from 'rss-parser';
import { serverAbortController } from "./abort"

export async function rss_news_get (rss_url: string, max_results: number) {
    const signal = serverAbortController.signal
    const parser = new Parser()
    const feed = await parser.parseURL(rss_url)
    let articles_list: { title: string, link: string, summary: string }[] = []
    for (const item of feed.items) {
        signal.throwIfAborted();
        if (articles_list.length < max_results) {
            articles_list = [...articles_list, {title: item.title ? item.title : "", link: item.link ? item.link : "", summary: item.contentSnippet ? item.contentSnippet : ""}]
        }
    }
    if (articles_list.length == 0) {
        throw Error("News feed query failed. Please apologize and inform the user.")
    }
    return articles_list
}