// Client side of the inference function
"use client";

import { GenParams, GlobalConfig, MessageType } from "@/types/default";

export default async function* infer_client(
  messages: MessageType[],
  globalConfig: GlobalConfig,
  genParams: GenParams,
  signal: AbortSignal
) {
  const response = await fetch("/api/infer", {
    method: "POST",
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      messages: messages,
      globalConfig: globalConfig,
      genParams: genParams,
    }),
    signal: signal,
  });
  if (response.body) {
    const reader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield value;
    }
  }
}
