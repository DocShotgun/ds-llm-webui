"use server"

import { resetAbort } from "@/lib/abort"

export async function GET() {
    resetAbort();
    return new Response();
}