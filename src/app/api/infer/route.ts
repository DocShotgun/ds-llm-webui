"use server"

import infer from "@/lib/inference";

function iteratorToStream(iterator: any) {
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
 
      if (done) {
        controller.close()
      } else {
        controller.enqueue(value)
      }
    },
  })
}

export async function POST(request: Request) {
  const res = await request.json()
  const stream = iteratorToStream(infer(res.messages, res.globalConfig, res.genParams))
  return new Response(stream)
}