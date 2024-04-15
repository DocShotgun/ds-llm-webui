"use server"

import { GlobalConfig, MessageType, ToolStatus } from "@/types/default";
import { getWolfram } from "./wolframalpha";
import { webSearch } from "./websearch";
import { scrape, shorten } from "./scrape";
import { fetchAbstracts, pubMedSearch } from "./pubmed";

export default async function tool_use(messages: MessageType[], globalConfig: GlobalConfig, functionList: Array<{ name: string ; description: string ; params: object}>, toolStatus: ToolStatus) {

    // Determine available tools
    let activeTools: Array<{ name: string ; description: string ; params: object}> = [];
    for (const fn of functionList) {
      if (toolStatus[fn.name]) {
        activeTools = [...activeTools, fn]
      };
    };
    if (activeTools.length <= 1) return null; // Just return and do standard inference if no active tools (besides directly_answer)

    // Ask the model which tool to use
    let tool_use_prompt = "Given the preceding context and the following list of available tools, select the most appropriate tool to facilitate answering the user's request. Respond in JSON:"
    let fn_names: Array<string> = []
    for (const fn of activeTools) {
        tool_use_prompt = `${tool_use_prompt}\n\nTool: ${fn.name}\nDescription: ${fn.description}`
        fn_names = [...fn_names, fn.name]
    }
    const function_schema = {
        "type": "object",
        "properties": {
          "function": {
            "type": "string",
            "enum": fn_names
          }
        },
        "required": [
          "function"
        ]
    }
    let r = await fetch(globalConfig.api_url + "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "authorization": globalConfig.api_key ?? "",
          "x-api-key": globalConfig.api_key ?? "",
        },
        body: JSON.stringify({
          "messages": [{ role: "system", content: globalConfig.system_prompt}, ...messages, { role: "system", content: tool_use_prompt}],
          "stream": false,
          "add_generation_prompt": true,
          "top_k": 1,
          "json_schema": function_schema
        })
      }
    )
    let responseData = await(r.json());
    const chosen_fn = JSON.parse(responseData.choices[0].message.content).function;

    // Just return and do standard inference if directly_answer is chosen
    if (chosen_fn == "directly_answer") {
        return null
    }

    // Ask the model for tool params
    let param_prompt = ""
    let chosen_fn_params: {[key:string] : {[key : string]: string | string[]}} = {}
    const chosen_fn_obj = functionList.find((element) => element.name == chosen_fn)
    if (chosen_fn_obj) {
      param_prompt = `Given the preceding context, select the most appropriate parameters for the tool "${chosen_fn}" to facilitate answering the user's request. Respond in JSON:\n\nTool: ${chosen_fn}\nDescription: ${chosen_fn_obj.description}\nParameters: ${JSON.stringify(chosen_fn_obj.params, null, 2)}`;
      for (const param in chosen_fn_obj.params) {
        chosen_fn_params[param] = { "type": "string" }
      }
    }
    const params_schema = {
        "type": "object",
        "properties": {
          "params": {
            "type": "object",
            "properties": chosen_fn_params
          }
        },
        "required": [
          "params"
        ]
    }
    r = await fetch(globalConfig.api_url + "/v1/chat/completions",
    {
        method: "POST",
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "authorization": globalConfig.api_key ?? "",
            "x-api-key": globalConfig.api_key ?? "",
        },
        body: JSON.stringify({
            "messages": [{ role: "system", content: globalConfig.system_prompt}, ...messages, { role: "system", content: param_prompt}],
            "stream": false,
            "add_generation_prompt": true,
            "top_k": 1,
            "json_schema": params_schema
        })
      }
    )
    responseData = await(r.json());
    const chosen_params = JSON.parse(responseData.choices[0].message.content).params;

    // Use chosen_func and chosen_params to execute function call
    let function_output = "No tool results available. Please inform the user and then answer to the best of your ability."
    if (chosen_fn == "wolfram_alpha") {
      try {
        const results = await(getWolfram(chosen_params.query, globalConfig.wolfram_appid))
        function_output = `Use the following results from Wolfram Alpha to augment your response:\n<results>\n${results}\n</results>\nDisplay image URLs with Markdown syntax: ![alt text](URL)\nALWAYS use this exponent notation: '6*10^14', NEVER '6e14'.\nALWAYS use proper Markdown formatting for all math, scientific, and chemical formulas, symbols, etc.:  '$$\n[expression]\n$$' for standalone cases and '\( [expression] \)' when inline.`
      }
      catch {
        function_output = "Wolfram Alpha query failed. Please inform the user and then answer to the best of your ability."
      }
    }
    else if (chosen_fn == "web_search") {
      try {
        const search_urls = await(webSearch(chosen_params.keywords))
        let results = ""
        for (const site of search_urls) {
          let text = await(scrape(site))
          text = await(shorten(text, 700, globalConfig.api_url, globalConfig.api_key))
          results = results == "" ? text : `${results}\n***\n${text}`
        }
        function_output = `Use the following search results to augment your response:\n<results>\n${results}\n</results>`
      }
      catch {
        function_output = "Web search query failed. Please inform the user and then answer to the best of your ability."
      }
    }
    else if (chosen_fn == "grab_text") {
      try {
        const scraped_page = await(scrape(chosen_params.url))
        function_output = `Use the following extracted web content to augment your response:\n<results>\n${scraped_page}\n</results>`
      }
      catch {
        function_output = "Web scrape failed. Please inform the user and then answer to the best of your ability."
      }
    }
    else if (chosen_fn == "pubmed_search") {
      try {
        const article_ids = await(pubMedSearch(chosen_params.keywords, chosen_params.category, 5, "relevance"))
        const abstracts = await(fetchAbstracts(article_ids))
        function_output = `Use the following results from PubMed to augment your response:\n<results>\n${abstracts}\n</results>\nALWAYS provide citations for any sources utilized to formulate your response.`
      }
      catch {
        function_output = "PubMed query failed. Please inform the user and then answer to the best of your ability."
      }
    }

    // Return the tool outputs
    return function_output
  }