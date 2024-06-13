"use server";

import {
  GlobalConfig,
  MessageType,
  Tool,
  ToolStatus,
} from "@/types/default";
import { getWolfram } from "./wolframalpha";
import { webSearch } from "./websearch";
import { scrape, shorten } from "./scrape";
import { fetchAbstracts, pubMedSearch } from "./pubmed";
import { shorten_prompt } from "./tokenization";
import { serverAbortController } from "./abort";
import { rss_news_get } from "./newsfeed";

export default async function tool_use(
  messages: MessageType[],
  globalConfig: GlobalConfig,
  functionList: Tool[],
  toolStatus: ToolStatus
) {
  // Set abort controller
  const signal = serverAbortController.signal;

  // Determine available tools
  let activeTools: Tool[] = [];
  for (const fn of functionList) {
    if (toolStatus[fn.name]) {
      activeTools = [...activeTools, fn];
    }
  }
  if (activeTools.length <= 1) return null; // Just return and do standard inference if no active tools (besides directly_answer)
  signal.throwIfAborted();

  // Ask the model which tool to use
  let tool_use_prompt =
    "Given the preceding context and the following list of available tools, select the most appropriate tool to facilitate answering the user's request. Respond in JSON:";
  let fn_names: string[] = [];
  for (const fn of activeTools) {
    tool_use_prompt = `${tool_use_prompt}\n\nTool: ${fn.name}\nDescription: ${fn.description}`;
    fn_names = [...fn_names, fn.name];
  }
  const function_schema = {
    type: "object",
    properties: {
      function: {
        type: "string",
        enum: fn_names,
      },
    },
    required: ["function"],
  };
  let r = await fetch(globalConfig.api_url + "/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      authorization: globalConfig.api_key ?? "",
      "x-api-key": globalConfig.api_key ?? "",
    },
    body: JSON.stringify({
      messages:
        globalConfig.system_prompt_parsed == ""
          ? await shorten_prompt(
              [...messages, { role: "system", content: tool_use_prompt }],
              globalConfig.max_seq_len,
              512,
              globalConfig.api_url,
              globalConfig.api_key,
              false
            )
          : await shorten_prompt(
              [
                { role: "system", content: globalConfig.system_prompt_parsed },
                ...messages,
                { role: "system", content: tool_use_prompt },
              ],
              globalConfig.max_seq_len,
              512,
              globalConfig.api_url,
              globalConfig.api_key,
              true
            ),
      stream: false,
      add_generation_prompt: true,
      max_tokens: 512,
      top_k: 1,
      json_schema: function_schema,
    }),
    signal,
  });
  let responseData = await r.json();
  const chosen_fn = JSON.parse(
    responseData.choices[0].message.content
  ).function;
  console.log(`Selected function: ${chosen_fn}`);
  signal.throwIfAborted();

  // Just return and do standard inference if directly_answer is chosen
  if (chosen_fn == "directly_answer") {
    return null;
  }

  // Use chosen_func to execute function call for functions with no params
  let function_output =
    "No tool results available. Please inform the user and then answer to the best of your ability.";
  if (chosen_fn == "newsfeed") {
    try {
      let results = "";
      let article_list: { title: string; link: string; summary: string }[] = [];
      if (globalConfig.newsfeed_rss_sources.length > 0) {
        for (const source of globalConfig.newsfeed_rss_sources) {
          article_list = [...article_list, ...(await rss_news_get(source, 5))];
        }
        for (const article of article_list) {
          let text = `${article.title ? article.title : ""}${
            article.link ? `\nURL: ${article.link}` : ""
          }${article.summary ? `\n${article.summary}` : ""}`;
          results = results == "" ? text : `${results}\n***\n${text}`;
        }
        function_output = `Use the following newsfeed results to augment your response:\n<results>\n${results}\n</results>`;
      } else {
        function_output =
          "No newsfeed sources available. Please apologize and inform the user.";
      }
    } catch {
      function_output =
        "Newsfeed query failed. Please apologize and inform the user.";
    }
    return function_output;
  }

  // Ask the model for tool params
  let param_prompt = "";
  let param_guide = "";
  let chosen_fn_params: { [key: string]: { type: string; enum?: any[] } } = {};
  const chosen_fn_obj = functionList.find(
    (element) => element.name == chosen_fn
  );
  if (chosen_fn_obj) {
    for (const param of chosen_fn_obj.params) {
      param_guide += `\n  ${param.name}: ${param.description}`;
      chosen_fn_params[param.name] = { type: param.type };
      if (param.enum) {
        Object.assign(chosen_fn_params[param.name], { enum: param.enum });
      }
    }
    param_prompt = `Given the preceding context, select the most appropriate parameters for the tool "${chosen_fn}" to facilitate answering the user's most recent request. Respond in JSON:\n\nTool: ${chosen_fn}\nDescription: ${chosen_fn_obj.description}\nParameters:${param_guide}`;
  }
  const params_schema = {
    type: "object",
    properties: {
      params: {
        type: "object",
        properties: chosen_fn_params,
      },
    },
    required: ["params"],
  };
  r = await fetch(globalConfig.api_url + "/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
      authorization: globalConfig.api_key ?? "",
      "x-api-key": globalConfig.api_key ?? "",
    },
    body: JSON.stringify({
      messages:
        globalConfig.system_prompt_parsed == ""
          ? await shorten_prompt(
              [...messages, { role: "system", content: param_prompt }],
              globalConfig.max_seq_len,
              512,
              globalConfig.api_url,
              globalConfig.api_key,
              false
            )
          : await shorten_prompt(
              [
                { role: "system", content: globalConfig.system_prompt_parsed },
                ...messages,
                { role: "system", content: param_prompt },
              ],
              globalConfig.max_seq_len,
              512,
              globalConfig.api_url,
              globalConfig.api_key,
              true
            ),
      stream: false,
      add_generation_prompt: true,
      max_tokens: 512,
      top_k: 1,
      json_schema: params_schema,
    }),
    signal,
  });
  responseData = await r.json();
  const chosen_params = JSON.parse(
    responseData.choices[0].message.content
  ).params;
  console.log(
    `Selected parameters:\n${JSON.stringify(chosen_params, null, 2)}`
  );
  signal.throwIfAborted();

  // Use chosen_func and chosen_params to execute function call
  if (chosen_fn == "wolfram_alpha") {
    try {
      const results = await getWolfram(
        chosen_params.query,
        globalConfig.wolfram_appid
      );
      function_output = `Use the following results from Wolfram Alpha to augment your response:\n<results>\n${results}\n</results>\nDisplay image URLs with Markdown syntax: ![alt text](URL)\nALWAYS use this exponent notation: '6*10^14', NEVER '6e14'.\nALWAYS use proper Markdown formatting for all math, scientific, and chemical formulas, symbols, etc.:  '$$\n[expression]\n$$' for standalone cases and '\( [expression] \)' when inline.`;
    } catch {
      function_output =
        "Wolfram Alpha query failed. Please inform the user and then answer to the best of your ability.";
    }
  } else if (chosen_fn == "web_search") {
    try {
      const search_urls = await webSearch(chosen_params.keywords);
      let results = "";
      for (const site of search_urls) {
        let text = await scrape(site);
        text = await shorten(
          text,
          700,
          globalConfig.api_url,
          globalConfig.api_key
        );
        results = results == "" ? text : `${results}\n***\n${text}`;
      }
      function_output = `Use the following search results to augment your response:\n<results>\n${results}\n</results>`;
    } catch {
      function_output =
        "Web search query failed. Please inform the user and then answer to the best of your ability.";
    }
  } else if (chosen_fn == "grab_text") {
    try {
      const scraped_page = await scrape(chosen_params.url);
      function_output = `Use the following extracted web content to augment your response:\n<results>\n${scraped_page}\n</results>`;
    } catch {
      function_output =
        "Web scrape failed. Please inform the user and then answer to the best of your ability.";
    }
  } else if (chosen_fn == "pubmed_search") {
    try {
      const article_ids = await pubMedSearch(
        chosen_params.keywords,
        chosen_params.category,
        5,
        "relevance"
      );
      const abstracts = await fetchAbstracts(article_ids);
      function_output = `Use the following results from PubMed to augment your response:\n<results>\n${abstracts}\n</results>\nALWAYS provide citations for any sources utilized to formulate your response.`;
    } catch {
      function_output =
        "PubMed query failed. Please inform the user and then answer to the best of your ability.";
    }
  }

  // Return the tool outputs
  return function_output;
}
