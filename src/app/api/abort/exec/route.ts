import { serverAbortController } from "@/lib/abort";

export async function GET() {
  serverAbortController.abort();
  return new Response();
}

export const dynamic = "force-dynamic";
