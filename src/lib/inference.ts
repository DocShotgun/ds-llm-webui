"use client"
//TODO: figure out how to get this working on server, likely with SSE stream between server and client

import { GenParams } from "@/app/page";

export default async function* infer(messages: Array<{ role: string ; content: string }>, api_url: string, api_key: string = "", system_prompt: string = "", genParams: GenParams) {
    const response = await fetch(api_url + "/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-type": "application/json; charset=UTF-8",
          "authorization": api_key,
          "x-api-key": api_key,
        },
        body: JSON.stringify({
          "messages": system_prompt == "" ? messages : [{ role: "system", content: system_prompt}, ...messages],
          "stream": true,
          "add_generation_prompt": true,
          "temperature_last": true,
          ...genParams
        })
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