import type { Metadata } from "next";
import Link from "next/link";
import { getAssistantConfig } from "@/lib/assistant";
import { AssistantChat } from "./assistant-chat";

export const metadata: Metadata = { title: "Ask AI" };

export default async function AdminAssistantPage() {
  const configured = !!(await getAssistantConfig()).apiKey;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Ask AI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about your sales, customers, products and costs. The AI reads the store
          database (read-only) and answers with your own numbers. Customer phone numbers
          and emails are masked before anything is sent to OpenAI.
        </p>
      </div>
      {configured ? (
        <AssistantChat />
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          Not set up yet: add your OpenAI API key in{" "}
          <Link href="/admin/settings" className="underline">
            Settings → AI
          </Link>
          .
        </p>
      )}
    </div>
  );
}
