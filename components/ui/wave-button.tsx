import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const waveButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center border text-sm font-medium whitespace-nowrap transition-all duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[#76b900] text-[#000000] hover:bg-[#5a8d00] active:scale-[0.98] focus-visible:ring-[#76b900]/30",
        secondary:
          "border-transparent bg-[#f7f7f7] text-[#000000] hover:bg-[#e5e5e5] active:scale-[0.98] focus-visible:ring-[#757575]/30",
        outline:
          "border-[#76b900] bg-white text-[#000000] hover:bg-[#f7f7f7] active:scale-[0.98] focus-visible:ring-[#76b900]/30",
        "outline-on-dark":
          "border-[#ffffff] bg-transparent text-[#ffffff] hover:bg-[#ffffff]/10 active:scale-[0.98] focus-visible:ring-white/30",
      },
      size: {
        default: "h-11 gap-2 px-6 rounded-sm",
        sm: "h-9 gap-1.5 px-4 rounded-sm text-xs",
        lg: "h-12 gap-2 px-8 rounded-sm text-base",
        icon: "h-10 w-10 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface WaveButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof waveButtonVariants> {
  asChild?: boolean;
}

function WaveButton({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: WaveButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="wave-button"
      data-variant={variant}
      data-size={size}
      className={cn(waveButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { WaveButton, waveButtonVariants };
