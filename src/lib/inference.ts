// Server side of the inference function
"use server"

import { GenParams, GlobalConfig, MessageType } from "@/types/default";
import { shorten_prompt } from "./tokenization";
import { serverAbortController } from "./abort";

export default async function* infer(messages: MessageType[], globalConfig: GlobalConfig, genParams: GenParams) {
    const signal = serverAbortController.signal;
    const response = await fetch(globalConfig.api_url + "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "authorization": globalConfig.api_key ?? "",
          "x-api-key": globalConfig.api_key ?? "",
        },
        body: JSON.stringify({
          "messages": globalConfig.system_prompt_parsed == "" ? (await shorten_prompt(messages, globalConfig.max_seq_len, genParams.max_tokens, globalConfig.api_url, globalConfig.api_key, false)) : (await shorten_prompt([{ role: "system", content: globalConfig.system_prompt_parsed}, ...messages], globalConfig.max_seq_len, genParams.max_tokens, globalConfig.api_url, globalConfig.api_key, true)),
          "stream": true,
          "add_generation_prompt": true,
          "temperature_last": true,
          "response_prefix": globalConfig.response_prefix,
          ...genParams
        }),
        signal: signal
      }
    )
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      if (value.startsWith("data: ")) {
        const parsedvalue = value.replace("data: ", "");
        const chunk = JSON.parse(parsedvalue).choices[0];
        if (chunk.finish_reason) break;
        yield chunk.delta.content;
      }
    }
  }