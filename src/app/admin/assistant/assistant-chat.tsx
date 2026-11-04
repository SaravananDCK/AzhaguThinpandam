"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Database, Loader2, RotateCcw, Send, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AssistantEvent } from "@/lib/assistant";

type Query = { purpose: string; sql: string; rows?: number; error?: string };
type Turn = { question: string; answer: string; queries: Query[]; error?: string; pending: boolean };

const SUGGESTIONS = [
  "What improvements can I make to increase sales?",
  "How can I reduce what I spend on packing materials?",
  "Which products sell best, and which barely sell?",
  "Who are my repeat customers and what do they buy?",
  "Am I making money on delivery charges?",
];

// Long conversations get slower and costlier; a fresh chat is cheap
const MAX_TURNS = 20;

export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  // The model's own record of the conversation, sent back verbatim each turn
  const [history, setHistory] = useState<unknown[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function update(fn: (t: Turn) => Turn) {
    setTurns((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);
  }

  async function ask(question: string) {
    question = question.trim();
    if (!question || busy) return;
    setBusy(true);
    setInput("");
    setTurns((all) => [...all, { question, answer: "", queries: [], pending: true }]);

    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AssistantEvent;
          if (event.type === "text") {
            update((t) => ({ ...t, answer: t.answer + event.text }));
          } else if (event.type === "query") {
            update((t) => ({ ...t, queries: [...t.queries, { purpose: event.purpose, sql: event.sql }] }));
          } else if (event.type === "query_result") {
            update((t) => {
              const queries = [...t.queries];
              const i = queries.findLastIndex((q) => q.rows === undefined && q.error === undefined);
              if (i >= 0) queries[i] = { ...queries[i], rows: event.rows, error: event.error };
              return { ...t, queries };
            });
          } else if (event.type === "done") {
            // Only a completed turn joins the history; a failed one is dropped
            setHistory((h) => [...h, ...event.items]);
            finished = true;
          } else if (event.type === "error") {
            update((t) => ({ ...t, error: event.message }));
          }
        }
      }
      if (!finished) update((t) => ({ ...t, error: t.error ?? "The answer stopped part-way. Please ask again." }));
    } catch (e) {
      update((t) => ({ ...t, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      update((t) => ({ ...t, pending: false }));
      setBusy(false);
    }
  }

  function reset() {
    setTurns([]);
    setHistory([]);
  }

  const full = turns.length >= MAX_TURNS;

  return (
    <div className="space-y-4">
      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border bg-card px-3 py-1.5 text-left text-sm hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.map((t, i) => (
        <div key={i} className="space-y-3">
          <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
            {t.question}
          </div>
          <div className="rounded-2xl border bg-card px-4 py-3">
            {t.queries.length > 0 && (
              <details className="mb-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">
                  <Database className="mr-1 inline size-3.5" />
                  Looked at the data {t.queries.length} time{t.queries.length === 1 ? "" : "s"}
                  {t.pending && t.queries.at(-1)?.rows === undefined && !t.queries.at(-1)?.error
                    ? ` — ${t.queries.at(-1)?.purpose}…`
                    : ""}
                </summary>
                <ul className="mt-2 space-y-2">
                  {t.queries.map((q, j) => (
                    <li key={j}>
                      <p className="font-medium text-foreground">
                        {q.purpose}{" "}
                        <span className="font-normal text-muted-foreground">
                          {q.error ? "— failed, retried" : q.rows !== undefined ? `— ${q.rows} rows` : "…"}
                        </span>
                      </p>
                      <pre className="mt-1 overflow-x-auto rounded bg-muted p-2 text-[11px] leading-snug">{q.sql}</pre>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {t.answer ? (
              <div className="text-sm leading-relaxed [&_table]:block [&_table]:overflow-x-auto [&_table]:text-xs [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h2]:mt-3 [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:font-semibold [&_p]:my-1.5">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.answer}</ReactMarkdown>
              </div>
            ) : (
              t.pending && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  {t.queries.length ? "Analysing the numbers…" : "Thinking…"}
                </p>
              )
            )}
            {t.error && (
              <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {t.error}
              </p>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />

      <form
        className="sticky bottom-0 space-y-2 border-t bg-background pt-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        {full ? (
          <p className="text-sm text-muted-foreground">
            This chat is getting long — start a new one to keep answers quick and cheap.
          </p>
        ) : (
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            placeholder="Ask about sales, products, customers, costs…"
            disabled={busy}
          />
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            The chat lives in this tab — refreshing starts over.
          </p>
          <div className="flex gap-2">
            {turns.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={reset} disabled={busy}>
                <RotateCcw className="size-4" /> New chat
              </Button>
            )}
            <Button type="submit" size="sm" disabled={busy || full || !input.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Ask
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
