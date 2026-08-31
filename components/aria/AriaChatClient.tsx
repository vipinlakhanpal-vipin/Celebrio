"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Who has a birthday coming up?",
  "Rewrite a message for my best friend",
  "How does the approval flow work?",
  "Suggest a message for a colleague's birthday",
];

export function AriaChatClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },

      });
      const json = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: json.reply || "Sorry, something went wrong." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-10.75rem)] flex-col md:h-[calc(100dvh-8.5rem)]">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-sm"
          style={{ background: "var(--accent)" }}
        >
          <Sparkles size={20} />
        </span>
        <div>
          <p className="font-display text-lg font-semibold text-[var(--fg)]">Aria</p>
          <p className="text-xs text-[var(--muted)]">Your birthday &amp; greetings assistant</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--accent-soft)" }}
            >
              <Sparkles className="text-[var(--accent)]" size={26} />
            </span>
            <p className="max-w-xs text-sm text-[var(--muted)]">
              Ask me about upcoming birthdays, or ask me to draft or rewrite a greeting message.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn-secondary !text-xs">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user" ? "rounded-br-sm text-[var(--accent-fg)]" : "rounded-bl-sm bg-[var(--bg-elevated)] text-[var(--fg)]"
                  }`}
                  style={m.role === "user" ? { background: "var(--accent)" } : undefined}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[var(--bg-elevated)] px-4 py-2.5">
                  <Loader2 size={15} className="animate-spin text-[var(--muted)]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          className="input"
          placeholder="Ask Aria anything…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={sending || !input.trim()} className="btn-primary !px-3.5">
          {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
        </button>
      </form>
    </div>
  );
}
