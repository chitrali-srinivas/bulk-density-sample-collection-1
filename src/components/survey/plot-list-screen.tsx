"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/survey/screen-header";
import { StatusBadge } from "@/components/survey/status-badge";
import {
  formatShortDate,
  googleMapsDirectionsUrl,
  initials,
  plotLabel,
  plotSampleStatus,
} from "@/lib/format";
import type { FarmerGroup, PlotRow } from "@/lib/types";

export function PlotListScreen({
  farmer,
  plots,
  onBack,
  onOpenPlot,
}: {
  farmer: FarmerGroup;
  plots: PlotRow[];
  onBack: () => void;
  onOpenPlot: (rowId: string) => void;
}) {
  return (
    <div className="h-full overflow-auto">
      <ScreenHeader title={farmer.farmer_name} onBack={onBack} />
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(farmer.farmer_name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{farmer.farmer_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {farmer.farmer_id} · {farmer.village_name}
          </p>
        </div>
        <StatusBadge status={farmer.status} scope="farmer" />
      </div>
      <p className="px-4 pt-4 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Plots
      </p>
      <ul>
        {plots.map((plot) => {
          const hasCoordinate = plot.lat !== null && plot.long !== null;
          return (
            <li key={plot.id} className="border-b px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-full items-start justify-between rounded-lg px-0 py-1 whitespace-normal text-left"
                onClick={() => onOpenPlot(plot.id)}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{plotLabel(plot.plot_id)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {plot.field_type || "Field type not set"}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(plot.sample_date) || "No sample"}
                </span>
              </Button>
              <div className="mt-2 flex items-center justify-between gap-3">
                {hasCoordinate ? (
                  <Button
                    variant="link"
                    nativeButton={false}
                    className="h-auto px-0 text-sm"
                    render={
                      <a
                        href={googleMapsDirectionsUrl(plot.lat as number, plot.long as number)}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    {plot.lat?.toFixed(5)}, {plot.long?.toFixed(5)}
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">No plot coordinate</span>
                )}
                <StatusBadge status={plotSampleStatus(plot)} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
