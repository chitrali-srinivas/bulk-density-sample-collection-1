"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { baseChoices, villageChoices } from "@/lib/format";
import type { PlotRow } from "@/lib/types";

export function BaseVillageScreen({
  rows,
  base,
  villageId,
  surveyorName,
  onSignOut,
  onBaseChange,
  onVillageChange,
  onContinue,
}: {
  rows: PlotRow[];
  base: string | null;
  villageId: string | null;
  surveyorName?: string | null;
  onSignOut?: () => void;
  onBaseChange: (base: string) => void;
  onVillageChange: (villageId: string) => void;
  onContinue: () => void;
}) {
  const bases = baseChoices(rows);
  const villages = base ? villageChoices(rows, base) : [];
  const selectedVillage = villages.find((village) => village.village_id === villageId);
  const duplicateNames = new Set(
    villages
      .filter(
        (village, index) =>
          villages.findIndex((item) => item.village_name === village.village_name) !== index,
      )
      .map((village) => village.village_name),
  );

  function villageLabel(village: { village_id: string; village_name: string }) {
    return duplicateNames.has(village.village_name)
      ? `${village.village_name} (${village.village_id})`
      : village.village_name;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 pt-8 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Select Base & Village</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose where you are sampling today.
            </p>
          </div>
          {onSignOut ? (
            <Button type="button" variant="ghost" className="shrink-0" onClick={onSignOut}>
              Sign out
            </Button>
          ) : null}
        </div>
        {surveyorName ? (
          <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
            Signed in as <span className="font-medium">{surveyorName}</span>
          </p>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-4 px-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="base">Base</Label>
          <Select
            value={base}
            onValueChange={(value) => {
              if (value) onBaseChange(value);
            }}
          >
            <SelectTrigger id="base" className="h-12 w-full px-3 text-base">
              <SelectValue placeholder="Select Base" />
            </SelectTrigger>
            <SelectContent>
              {bases.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="village">Village</Label>
          <Select
            value={villageId}
            onValueChange={(value) => {
              if (value) onVillageChange(value);
            }}
            disabled={!base}
            itemToStringLabel={(id) => {
              const village = villages.find((item) => item.village_id === id);
              return village ? villageLabel(village) : String(id ?? "");
            }}
          >
            <SelectTrigger id="village" className="h-12 w-full px-3 text-base">
              <SelectValue placeholder="Select Village">
                {selectedVillage ? villageLabel(selectedVillage) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {villages.map((village) => (
                <SelectItem key={village.village_id} value={village.village_id}>
                  {villageLabel(village)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="sticky bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          type="button"
          className="h-12 w-full text-base"
          disabled={!base || !villageId}
          onClick={onContinue}
        >
          Show farmers
        </Button>
      </div>
    </div>
  );
}
