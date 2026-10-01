"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { fetchNewMessages, fetchOlderMessages, markChatRead, sendMessage } from "../actions";
import type { ChatMessage } from "../service";
import { MESSAGE_MAX, MESSAGES_PAGE, POLL_MS } from "../constants";


interface Props {
  conversationId: string;
  meId: string;
  initial: ChatMessage[];
  hasMore: boolean;
  canSend: boolean;
  /** Clan chat shows sender names above other people's messages. */
  showNames: boolean;
}

/**
 * Not real-time on purpose: while the tab is visible the open conversation asks for new messages
 * every 10 s (and right after you send). Older messages load with a button at the top.
 */
export function ChatView({ conversationId, meId, initial, hasMore: initialHasMore, canSend, showNames }: Props) {
  const t = useTranslations("chat");
  const format = useFormatter();
  const [messages, setMessages] = useState(initial);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingOlder, startOlder] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const latest = useRef(initial.at(-1)?.createdAt ?? new Date(0).toISOString());

  const append = useCallback((fresh: ChatMessage[]) => {
    if (!fresh.length) return;
    setMessages((prev) => {
      // Dedupe across and within batches (after sending, the poll also returns our own message).
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...fresh.filter((m) => !seen.has(m.id) && seen.add(m.id))];
    });
    latest.current = fresh.at(-1)!.createdAt;
    requestAnimationFrame(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }, []);

  // Opening the chat marks it read (refreshes the unread badge).
  useEffect(() => {
    void markChatRead(conversationId);
    bottom.current?.scrollIntoView({ block: "end" });
  }, [conversationId]);

  // Poll while visible.
  useEffect(() => {
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      append(await fetchNewMessages(conversationId, latest.current).catch(() => []));
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [conversationId, append]);

  // Not a transition: its state updates would only land when the whole send finishes, wiping
  // whatever was typed meanwhile. The box clears right away; on failure the text comes back.
  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const r = await sendMessage(conversationId, body);
      if (!r.ok) {
        setError(t(`errors.${r.error}`));
        setText((current) => current || body);
        return;
      }
      setError(null);
      // Pick up anything that arrived meanwhile, then our own message.
      const fresh = await fetchNewMessages(conversationId, latest.current).catch(() => []);
      append([...fresh, r.message].sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    } catch {
      setError(t("errors.network"));
      setText((current) => current || body);
    } finally {
      setSending(false);
    }
  };

  const loadOlder = () =>
    startOlder(async () => {
      const first = messages[0];
      if (!first) return;
      const older = await fetchOlderMessages(conversationId, { createdAt: first.createdAt, id: first.id });
      setHasMore(older.length >= MESSAGES_PAGE);
      setMessages((prev) => [...older, ...prev]);
    });

  const dayOf = (iso: string) => format.dateTime(new Date(iso), { day: "numeric", month: "long", timeZone: "Asia/Tashkent" });
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-1 py-3">
        {hasMore && (
          <button type="button" onClick={loadOlder} disabled={loadingOlder} className="mx-auto mb-2 text-sm font-semibold text-brand hover:underline disabled:opacity-60">
            {loadingOlder ? <Loader2 className="size-4 animate-spin" /> : t("older")}
          </button>
        )}
        {messages.length === 0 && <p className="m-auto py-16 text-center text-sm text-muted">{t("emptyConversation")}</p>}
        {messages.map((m, i) => {
          const mine = m.senderId === meId;
          const date = new Date(m.createdAt);
          const day = dayOf(m.createdAt);
          const showDay = i === 0 || dayOf(messages[i - 1].createdAt) !== day;
          const sameSender = i > 0 && messages[i - 1].senderId === m.senderId && !showDay;
          return (
            <div key={m.id} className="flex flex-col">
              {showDay && <p className="my-3 self-center rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted">{day}</p>}
              <div className={`flex max-w-[80%] flex-col ${mine ? "items-end self-end" : "items-start self-start"} ${sameSender ? "" : "mt-1.5"}`}>
                {showNames && !mine && !sameSender && <span className="mb-0.5 px-2 text-xs font-bold text-brand">{m.senderName}</span>}
                <div
                  className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
                    mine ? "rounded-br-md bg-grad-brand text-white" : "rounded-bl-md border border-border bg-surface"
                  }`}
                >
                  {m.body}
                  <time dateTime={m.createdAt} className={`ml-2 inline-block translate-y-0.5 text-[10px] ${mine ? "text-white/70" : "text-muted"}`}>
                    {format.dateTime(date, { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" })}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {canSend ? (
        <form
          className="sticky bottom-0 flex items-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter = new line (phones: the send button)
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            maxLength={MESSAGE_MAX}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-2.5 text-[15px] outline-none field-sizing-content focus:border-brand focus:ring-4 focus:ring-brand/15"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label={t("send")}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-grad-brand text-white shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:opacity-50"
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
          </button>
        </form>
      ) : (
        <p className="border-t border-border py-4 text-center text-sm text-muted">{t("cannotSend")}</p>
      )}
      {error && <p className="pb-2 text-center text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
