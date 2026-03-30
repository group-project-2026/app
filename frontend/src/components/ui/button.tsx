"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-sky-300/80 focus-visible:ring-3 focus-visible:ring-sky-300/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-60 disabled:saturate-50 aria-invalid:border-red-400/70 aria-invalid:ring-3 aria-invalid:ring-red-400/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-sky-400/60 bg-sky-400 text-slate-950 shadow-sm hover:border-sky-300 hover:bg-sky-300 active:bg-sky-200",
        outline:
          "border-slate-500/80 bg-slate-900/80 text-slate-100 hover:border-slate-300 hover:bg-slate-800 hover:text-white aria-expanded:border-slate-300 aria-expanded:bg-slate-800 aria-expanded:text-white",
        secondary:
          "border-slate-500/70 bg-slate-700 text-slate-100 hover:border-slate-300 hover:bg-slate-600 aria-expanded:border-slate-300 aria-expanded:bg-slate-600",
        ghost:
          "text-slate-200 hover:bg-slate-800/90 hover:text-white aria-expanded:bg-slate-800 aria-expanded:text-white",
        destructive:
          "border-red-400/50 bg-red-500/20 text-red-200 hover:border-red-300 hover:bg-red-500/30 focus-visible:border-red-300/90 focus-visible:ring-red-300/30",
        link: "border-none p-0 text-sky-300 underline-offset-4 hover:text-sky-200 hover:underline"
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
