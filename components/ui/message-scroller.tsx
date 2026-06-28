"use client";

import * as React from "react";

type MessageScrollerContextValue = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  autoScroll: boolean;
  followRef: React.RefObject<boolean>;
  scrollToEnd: () => void;
};

const MessageScrollerContext =
  React.createContext<MessageScrollerContextValue | null>(null);

function useMessageScrollerContext() {
  const context = React.useContext(MessageScrollerContext);
  if (!context) throw new Error("MessageScroller components must be nested.");
  return context;
}

export function MessageScrollerProvider({
  autoScroll = false,
  children,
}: {
  autoScroll?: boolean;
  children: React.ReactNode;
}) {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const followRef = React.useRef(autoScroll);
  const scrollToEnd = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    followRef.current = true;
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, []);

  return (
    <MessageScrollerContext.Provider
      value={{ viewportRef, autoScroll, followRef, scrollToEnd }}
    >
      {children}
    </MessageScrollerContext.Provider>
  );
}

export function MessageScroller({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return <div style={style} className={`relative flex min-h-0 flex-col ${className}`}>{children}</div>;
}

export function MessageScrollerViewport({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { viewportRef, followRef } = useMessageScrollerContext();
  return (
    <div
      ref={viewportRef}
      className={`no-bar min-h-0 flex-1 overflow-y-auto ${className}`}
      onScroll={(event) => {
        const el = event.currentTarget;
        followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
      }}
    >
      {children}
    </div>
  );
}

export function MessageScrollerContent({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { viewportRef, autoScroll, followRef } = useMessageScrollerContext();
  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !autoScroll || !followRef.current) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [autoScroll, children, followRef, viewportRef]);

  return (
    <div className={className} aria-live="polite" aria-relevant="additions text">
      {children}
    </div>
  );
}

export function MessageScrollerItem({
  messageId,
  scrollAnchor,
  className = "",
  children,
}: {
  messageId?: string;
  scrollAnchor?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-message-id={messageId}
      data-scroll-anchor={scrollAnchor ? "" : undefined}
      className={className}
    >
      {children}
    </div>
  );
}

export function MessageScrollerButton({
  className = "",
}: {
  className?: string;
}) {
  const { scrollToEnd } = useMessageScrollerContext();
  return (
    <button
      type="button"
      aria-label="Jump to latest message"
      onClick={scrollToEnd}
      className={`absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-black text-sm font-black text-white shadow-lg ${className}`}
    >
      ↓
    </button>
  );
}
