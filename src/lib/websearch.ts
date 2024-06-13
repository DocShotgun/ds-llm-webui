"use server";

import { search, SafeSearchType } from "duck-duck-scrape";

export async function webSearch(query: string, max_results: number = 5) {
  const result = await search(query, { safeSearch: SafeSearchType.OFF });
  if (result.noResults) {
    throw Error(
      "Web search query failed. Please inform the user and then answer to the best of your ability."
    );
  }
  let result_urls: Array<string> = [];
  for (const elem of result.results) {
    result_urls.push(elem.url);
  }
  result_urls.length = max_results;
  return result_urls;
}
