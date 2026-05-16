import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        positive: "bg-[#3f8500]/10 text-[#3f8500]",
        warning: "bg-[#ef9100]/10 text-[#ef9100]",
        negative: "bg-[#e52020]/10 text-[#e52020]",
        default:
          "border border-[#cccccc] bg-white text-[#000000]",
        accent:
          "border border-[#76b900] bg-[#76b900]/10 text-[#000000]",
        outline:
          "border border-[#cccccc] bg-transparent text-[#000000]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
