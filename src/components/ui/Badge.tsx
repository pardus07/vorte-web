import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide rounded-md",
  {
    variants: {
      variant: {
        default: "bg-[#1A1A1A] text-white",
        discount: "bg-red-600 text-white",
        new: "bg-[#7AC143] text-white",
        outline: "border border-gray-300 text-gray-700",
        warning: "bg-amber-500 text-white",
        success: "bg-emerald-600 text-white",
        subtle: "bg-gray-100 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
