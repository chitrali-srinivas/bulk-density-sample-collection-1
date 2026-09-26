"use client";

import { LocationMap } from "@/components/survey/location-map";
import { ScreenHeader } from "@/components/survey/screen-header";
import { Button } from "@/components/ui/button";
import {
  formatCoordinatePair,
  MAX_SAMPLE_DISTANCE_M,
  sampleLocationError,
} from "@/lib/format";
import type { PlotRow } from "@/lib/types";
import { useState } from "react";

export function LocationPickerScreen({
  plot,
  initialLat,
  initialLng,
  onBack,
  onConfirm,
}: {
  plot: PlotRow;
  initialLat: number | null;
  initialLng: number | null;
  onBack: () => void;
  onConfirm: (lat: number, lng: number) => void;
}) {
  const mapLat = initialLat ?? plot.lat;
  const mapLng = initialLng ?? plot.long;
  const [pinLat, setPinLat] = useState<number | null>(initialLat);
  const [pinLng, setPinLng] = useState<number | null>(initialLng);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(initialLat !== null && initialLng !== null);

  if (mapLat === null || mapLng === null || plot.lat === null || plot.long === null) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <ScreenHeader title="Sample location" onBack={onBack} close />
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          This plot has no coordinates, so a sample location cannot be collected.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader title="Sample location" onBack={onBack} close />
      <LocationMap
        lat={mapLat}
        lng={mapLng}
        plotLat={plot.lat}
        plotLong={plot.long}
        onChange={(nextLat, nextLng) => {
          setPinLat(nextLat);
          setPinLng(nextLng);
          setTouched(true);
          setError(null);
        }}
      />
      <div className="border-t bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <p className="pb-2 text-center text-sm text-muted-foreground">
          Drag the pin or use your location. It must be within {MAX_SAMPLE_DISTANCE_M} m of the
          plot
          {pinLat !== null && pinLng !== null
            ? ` · ${formatCoordinatePair(pinLat, pinLng)}`
            : ""}
        </p>
        {error ? (
          <p className="pb-3 text-center text-sm text-destructive">{error}</p>
        ) : null}
        <Button
          type="button"
          className="h-12 w-full text-base"
          onClick={() => {
            if (!touched || pinLat === null || pinLng === null) {
              setError("Move the pin or use your current location to collect coordinates.");
              return;
            }
            const message = sampleLocationError(plot.lat, plot.long, pinLat, pinLng);
            if (message) {
              setError(message);
              return;
            }
            onConfirm(pinLat, pinLng);
          }}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}
