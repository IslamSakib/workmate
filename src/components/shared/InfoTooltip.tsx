import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/** A small "?" hint icon with a plain-language explanation, used to guide users through a page or field without cluttering the UI. */
export function InfoTooltip({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            className
          )}
          aria-label="Help"
          onClick={(e) => e.preventDefault()}
        >
          <Info className="size-full" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-center text-balance">{text}</TooltipContent>
    </Tooltip>
  )
}
