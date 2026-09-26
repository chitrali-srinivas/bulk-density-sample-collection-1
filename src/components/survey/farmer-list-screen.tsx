"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/survey/screen-header";
import { StatusBadge } from "@/components/survey/status-badge";
import {
  formatShortDate,
  groupFarmers,
  initials,
  isSampleCollected,
} from "@/lib/format";
import type { FarmerGroup, PlotRow } from "@/lib/types";
import { useMemo, useState } from "react";

type FarmerTab = "pending" | "done";

export function FarmerListScreen({
  rows,
  villageName,
  onBack,
  onOpenFarmer,
}: {
  rows: PlotRow[];
  villageName: string;
  onBack: () => void;
  onOpenFarmer: (farmerId: string) => void;
}) {
  const [tab, setTab] = useState<FarmerTab>("pending");
  const farmers = useMemo(() => groupFarmers(rows), [rows]);
  const pendingFarmers = farmers.filter((farmer) => !isSampleCollected(farmer.status));
  const doneFarmers = farmers.filter((farmer) => isSampleCollected(farmer.status));
  const visibleFarmers = tab === "pending" ? pendingFarmers : doneFarmers;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title={villageName} onBack={onBack} />
      <div className="flex items-end gap-6 border-b px-4 pt-3">
        <TabButton
          label="Pending"
          active={tab === "pending"}
          count={pendingFarmers.length}
          onClick={() => setTab("pending")}
        />
        <TabButton
          label="Done"
          active={tab === "done"}
          count={doneFarmers.length}
          onClick={() => setTab("done")}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {farmers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            No farmers are seeded for this village yet.
          </p>
        ) : visibleFarmers.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {tab === "pending"
              ? "No pending farmers in this village."
              : "No completed farmers in this village yet."}
          </p>
        ) : (
          <ul>
            {visibleFarmers.map((farmer) => (
              <FarmerRow
                key={farmer.farmer_id}
                farmer={farmer}
                onOpen={() => onOpenFarmer(farmer.farmer_id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-3 text-sm font-semibold transition-colors ${
        active ? "text-emerald-700" : "text-muted-foreground"
      }`}
    >
      {label}
      <span className="ml-1.5 text-xs font-medium tabular-nums">({count})</span>
      {active ? (
        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-600" />
      ) : null}
    </button>
  );
}

function FarmerRow({
  farmer,
  onOpen,
}: {
  farmer: FarmerGroup;
  onOpen: () => void;
}) {
  return (
    <li className="border-b">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full items-start justify-start rounded-none px-4 py-3 whitespace-normal text-left"
        onClick={onOpen}
      >
        <Avatar size="lg">
          <AvatarFallback>{initials(farmer.farmer_name)}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{farmer.farmer_name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {farmer.village_name}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {farmer.collectedCount} of {farmer.plotCount} samples
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={farmer.status} scope="farmer" />
          {farmer.latestSampleDate ? (
            <span className="text-[11px] text-muted-foreground">
              {formatShortDate(farmer.latestSampleDate)}
            </span>
          ) : null}
        </span>
      </Button>
    </li>
  );
}
