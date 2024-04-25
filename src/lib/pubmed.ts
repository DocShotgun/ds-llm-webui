"use server"

import { serverAbortController } from "./abort"

export async function pubMedSearch (query: string, category: string, max_results: number = 5, sort: string = "relevance") {
    const signal = serverAbortController.signal
    const baseURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?"

    // Parse query
    let parsed_query = 'medline[sb] AND "has abstract"[filter]'
    if (category.toLowerCase() == "therapy") parsed_query += " AND Therapy/Broad[filter]"
    else if (category.toLowerCase() == "diagnosis") parsed_query += " AND Diagnosis/Broad[filter]"
    else if (category.toLowerCase() == "etiology") parsed_query += " AND Etiology/Broad[filter]"
    else if (category.toLowerCase() == "prognosis") parsed_query += " AND Prognosis/Broad[filter]"
    else if (category.toLowerCase() == "clinical prediction guides") parsed_query += " AND Clinical Prediction Guides/Broad[filter]"
    for (const term of query.split(",")) {
        parsed_query = `${parsed_query} AND "${term.trim()}"[tw]`
    }
    signal.throwIfAborted();

    const r = await fetch(baseURL + new URLSearchParams({
        db: "pubmed",
        term: parsed_query,
        sort: sort,
        retmax: max_results.toString(),
        retmode: "json"
    }),
    {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
        },
        signal: signal
    })
    if (r.status != 200) {
        throw Error("PubMed query failed. Please inform the user and then answer to the best of your ability.")
    }
    const result = await(r.json())
    return result.esearchresult.idlist
}

export async function fetchAbstracts (ids: string[]) {
    const signal = serverAbortController.signal
    const baseURL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?"
    const r = await fetch(baseURL + new URLSearchParams({
        db: "pubmed",
        id: ids.toString(),
        rettype: "abstract",
        retmode: "text"
    }),
    {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36"
        },
        signal: signal
    })
    if (r.status != 200) {
        throw Error("PubMed query failed. Please inform the user and then answer to the best of your ability.")
    }
    const result = await(r.text())
    return result.trim()
}