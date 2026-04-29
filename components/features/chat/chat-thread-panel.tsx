"use client";

import type { ReactNode } from "react";

import type { ConversationThread } from "@/types";

import { ChatWindow } from "./chat-window";

type ChatThreadPanelProps = {
  thread: ConversationThread;
  viewer: "tenant" | "landlord" | "admin";
  title: string;
  subtitle: string;
  statusLine?: string | null;
  typingLabel?: string | null;
  error?: string | null;
  footerNote?: string | null;
  headerAction?: ReactNode;
  isSending?: boolean;
  isLoadingOlder?: boolean;
  onSend?: (content: string) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  onLoadOlder?: () => Promise<void>;
  onTypingChange?: (isTyping: boolean) => void;
};

export function ChatThreadPanel(props: ChatThreadPanelProps) {
  return <ChatWindow {...props} />;
}
