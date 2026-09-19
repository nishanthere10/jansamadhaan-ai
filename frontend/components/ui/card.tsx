import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// ── Card elevation variants ────────────────────────────────────────────────
// flat     → tables / structural containers — no shadow, simple border
// raised   → KPI cards / important content — shadow + subtle hover lift
// floating → modal / popover / temporary surfaces — prominent shadow
const cardVariants = cva(
  "group/card flex flex-col gap-4 overflow-hidden rounded-xl bg-card text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl",
  {
    variants: {
      elevation: {
        flat: "border border-[var(--cr-border)] py-4",
        raised:
          "border border-[var(--cr-border)] py-4 shadow-[var(--cr-shadow)] transition-[box-shadow,transform] duration-[var(--motion-base)] ease-[var(--ease-standard)] hover:shadow-[var(--cr-shadow-md)] hover:-translate-y-0.5",
        floating:
          "border border-[var(--cr-border-strong)] py-4 shadow-[var(--cr-shadow-lg)]",
      },
      size: {
        default: "gap-4 py-4",
        sm: "gap-3 py-3",
      },
    },
    defaultVariants: {
      elevation: "raised",
      size: "default",
    },
  }
)

function Card({
  className,
  elevation,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-elevation={elevation}
      data-size={size}
      className={cn(cardVariants({ elevation, size }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-xl px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-semibold group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-xl border-t bg-muted/50 p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
