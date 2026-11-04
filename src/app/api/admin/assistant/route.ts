import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import type { ResponseInputItem } from "openai/resources/responses/responses";
import { requireAdminApi } from "@/lib/admin";
import { getAssistantConfig, runAssistantTurn } from "@/lib/assistant";
import { logError } from "@/lib/log";

// One turn of the admin AI assistant, streamed back as newline-delimited JSON
// events (see AssistantEvent). The browser sends the whole conversation so far.

const bodySchema = z.object({
  question: z.string().trim().min(1).max(4000),
  // Opaque items from earlier "done" events, sent back untouched
  history: z.array(z.record(z.string(), z.unknown())).max(400),
});

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  if (!(await getAssistantConfig()).apiKey) {
    return NextResponse.json(
      { error: "The AI assistant isn't set up: add an OpenAI API key in Settings → AI." },
      { status: 503 }
    );
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { question, history } = parsed.data;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for await (const event of runAssistantTurn(history as unknown as ResponseInputItem[], question)) {
          send(event);
        }
      } catch (e) {
        logError("assistant", "AI assistant turn failed", e);
        let message = "Something went wrong talking to the AI. Please try again.";
        if (e instanceof OpenAI.AuthenticationError) message = "The OpenAI API key was rejected — check it in Settings → AI.";
        else if (e instanceof OpenAI.RateLimitError) message = "OpenAI rate limit or quota reached — wait a minute, or check billing.";
        else if (e instanceof OpenAI.APIError) message = `OpenAI error ${e.status ?? ""}: ${e.message}`.slice(0, 400);
        else if (e instanceof Error) message = e.message.slice(0, 400);
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
      // Stops Caddy's gzip from holding chunks back, so text arrives as it is written
      "Content-Encoding": "identity",
    },
  });
}
