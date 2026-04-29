"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { CHAT_TYPING_TIMEOUT_MS } from "@/config/chat";
import { Button } from "@/components/ui/button";

type ChatInputProps = {
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  onSend: (content: string) => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
};

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className} aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function ChatInput({
  disabled = false,
  isSending = false,
  placeholder = "Type a message",
  onSend,
  onTypingChange
}: ChatInputProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, [draft]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (isTypingRef.current) {
        onTypingChange?.(false);
      }
    };
  }, [onTypingChange]);

  function scheduleTypingReset() {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingChange?.(false);
      }
    }, CHAT_TYPING_TIMEOUT_MS);
  }

  function handleDraftChange(value: string) {
    setDraft(value);

    if (!onTypingChange) {
      return;
    }

    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingChange(true);
    }

    if (!value.trim() && isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange(false);
      return;
    }

    if (value.trim()) {
      scheduleTypingReset();
    }
  }

  async function handleSubmit() {
    const normalizedDraft = draft.trim();

    if (!normalizedDraft || disabled || isSending) {
      return;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      onTypingChange?.(false);
    }

    await onSend(normalizedDraft);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <div className="flex items-end gap-2 border-t border-border/70 bg-white p-2">
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => handleDraftChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className="max-h-[120px] min-h-[38px] flex-1 resize-none rounded-2xl border border-border bg-muted/30 px-3 py-2 text-sm leading-5 text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:bg-white"
      />
      <Button
        type="button"
        size="md"
        className="h-9 w-9 rounded-full px-0"
        disabled={disabled || isSending || !draft.trim()}
        onClick={() => void handleSubmit()}
        aria-label={isSending ? "Sending message" : "Send message"}
      >
        <SendIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
