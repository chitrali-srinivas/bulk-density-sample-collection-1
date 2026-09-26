import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";
import type { PlotStatus } from "@/lib/types";
import { cn } from "cn";

const statusClassName: Record<PlotStatus, string> = {
  enrolled: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

export function StatusBadge({
  status,
  scope = "plot",
  className,
}: {
  status: PlotStatus;
  scope?: "plot" | "farmer";
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn("h-6 px-2.5 font-medium", statusClassName[status], className)}
    >
      {statusLabel(status, scope)}
    </Badge>
  );
}
