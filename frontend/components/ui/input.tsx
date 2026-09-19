import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Input — civic design system baseline
 *
 * Height: 40px (spec: ui-ux.md §35)
 * Radius: 8px
 * States: idle, focus, filled, invalid (aria-invalid), disabled
 * Error state must pair color with icon+text in the parent — never color alone.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Size — 40px height baseline (h-10 = 40px in Tailwind v4)
        "h-10 w-full min-w-0 rounded-[8px] border border-[var(--cr-border)] bg-[var(--cr-surface)] px-3 py-1 text-[14px] text-[var(--cr-text)] shadow-[var(--cr-shadow-inset)]",
        // Placeholder
        "placeholder:text-[var(--cr-text-muted)]",
        // Transitions
        "transition-[border-color,box-shadow,background-color] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        // Focus
        "outline-none focus-visible:border-[var(--cr-blue-mid)] focus-visible:shadow-[0_0_0_3px_rgba(0,85,164,0.12)] focus-visible:bg-[var(--cr-surface)]",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--cr-bg-offset)]",
        // Invalid / error — aria-invalid pairs with icon+text in parent, border alone is insufficient
        "aria-invalid:border-[var(--cr-red)] aria-invalid:shadow-[0_0_0_3px_rgba(185,28,28,0.12)]",
        // File input
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--cr-text)]",
        // Dark mode adjustments
        "dark:bg-[var(--cr-surface)] dark:focus-visible:shadow-[0_0_0_3px_rgba(74,143,217,0.18)] dark:aria-invalid:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
