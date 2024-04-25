import { resetAbort } from "@/lib/abort"

export async function GET() {
    resetAbort();
    return new Response();
}

export const dynamic = 'force-dynamic';