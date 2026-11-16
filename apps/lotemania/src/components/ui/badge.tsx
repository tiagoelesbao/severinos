import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Primitivo perdido: o arquivo ficou com 0 bytes em 2026-10-24 08:27, no
// mesmo minuto em que avatar/button/card/dialog foram escritos intactos.
// Reescrito no padrão dos outros primitivos daqui (cva + cn + data-slot),
// com as quatro variantes que os sete arquivos consumidores já usam:
// default, secondary, outline e destructive.

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border border-transparent bg-clip-padding px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
