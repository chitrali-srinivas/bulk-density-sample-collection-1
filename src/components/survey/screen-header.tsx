import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

export function ScreenHeader({
  title,
  onBack,
  close,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  close?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 border-b bg-white px-2">
      {onBack ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          onClick={onBack}
          aria-label={close ? "Close" : "Back"}
        >
          {close ? <XIcon /> : <ChevronLeftIcon />}
        </Button>
      ) : (
        <span className="size-9" />
      )}
      <h1 className="flex-1 truncate text-center text-base font-semibold tracking-tight">
        {title}
      </h1>
      <span className="flex size-9 items-center justify-center">{trailing}</span>
    </header>
  );
}
