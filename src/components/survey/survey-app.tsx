"use client";

import { BaseVillageScreen } from "@/components/survey/base-village-screen";
import { FarmerListScreen } from "@/components/survey/farmer-list-screen";
import { LocationPickerScreen } from "@/components/survey/location-picker-screen";
import { PlotListScreen } from "@/components/survey/plot-list-screen";
import { SampleFormScreen } from "@/components/survey/sample-form-screen";
import { ScreenHeader } from "@/components/survey/screen-header";
import { Button } from "@/components/ui/button";
import { DEMO_PLOTS } from "@/lib/demo-data";
import { draftFromPlot, groupFarmers, parseSampleId, sampleLocationError } from "@/lib/format";
import { fetchPlots, submitSample } from "@/lib/plots";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { PlotRow, SampleDraft } from "@/lib/types";
import { Loader2Icon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Screen =
  | { type: "home" }
  | { type: "farmers" }
  | { type: "plots"; farmerId: string }
  | { type: "sample"; rowId: string }
  | { type: "location"; rowId: string };

export function SurveyApp() {
  const preview = !isSupabaseConfigured();
  const [rows, setRows] = useState<PlotRow[]>(preview ? DEMO_PLOTS : []);
  const [loading, setLoading] = useState(!preview);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stack, setStack] = useState<Screen[]>([{ type: "home" }]);
  const [base, setBase] = useState<string | null>(null);
  const [villageId, setVillageId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SampleDraft>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const screen = stack[stack.length - 1];

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    void fetchPlots()
      .then((plots) => {
        if (!cancelled) setRows(plots);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not load plots.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [preview]);

  const villageRows = useMemo(
    () => rows.filter((row) => row.base === base && row.village_id === villageId),
    [rows, base, villageId],
  );
  const villageName =
    villageRows[0]?.village_name ??
    rows.find((row) => row.village_id === villageId)?.village_name ??
    "Village";

  function push(next: Screen) {
    setStack((current) => [...current, next]);
  }

  function back() {
    setSaveError(null);
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function openSample(rowId: string) {
    const plot = rows.find((row) => row.id === rowId);
    if (!plot) return;
    setDrafts((current) => (current[rowId] ? current : { ...current, [rowId]: draftFromPlot(plot) }));
    setSaveError(null);
    push({ type: "sample", rowId });
  }

  async function saveSample(plot: PlotRow, draft: SampleDraft) {
    if (draft.sampleLat === null || draft.sampleLong === null) return;
    const sampleId = parseSampleId(draft.sampleId);
    const locationMessage = sampleLocationError(
      plot.lat,
      plot.long,
      draft.sampleLat,
      draft.sampleLong,
    );
    if (locationMessage) {
      setSaveError(locationMessage);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (preview) {
        const updated: PlotRow = {
          ...plot,
          sample_id: sampleId,
          sample_date: draft.sampleDate,
          sample_picture_url: draft.picturePreview ?? draft.existingPictureUrl,
          core_cut_type: draft.coreCutType.trim(),
          sample_lat: draft.sampleLat,
          sample_long: draft.sampleLong,
          status: "enrolled",
          collected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRows((current) => current.map((row) => (row.id === plot.id ? updated : row)));
      } else {
        const updated = await submitSample({
          rowId: plot.id,
          farmerId: plot.farmer_id,
          plotId: plot.plot_id,
          sampleId,
          sampleDate: draft.sampleDate,
          coreCutType: draft.coreCutType.trim(),
          sampleLat: draft.sampleLat,
          sampleLong: draft.sampleLong,
          pictureFile: draft.pictureFile,
          existingPictureUrl: draft.existingPictureUrl,
        });
        setRows((current) => current.map((row) => (row.id === plot.id ? updated : row)));
      }
      setDrafts((current) => {
        const next = { ...current };
        delete next[plot.id];
        return next;
      });
      setStack((current) => current.filter((item) => item.type !== "sample" && item.type !== "location"));
    } catch (error: unknown) {
      setSaveError(error instanceof Error ? error.message : "Could not save the sample.");
    } finally {
      setSaving(false);
    }
  }

  let body: ReactNode;
  if (loading) {
    body = (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    );
  } else if (loadError) {
    body = (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  } else if (screen.type === "home") {
    body = (
      <BaseVillageScreen
        rows={rows}
        base={base}
        villageId={villageId}
        onBaseChange={(nextBase) => {
          setBase(nextBase);
          setVillageId(null);
        }}
        onVillageChange={setVillageId}
        onContinue={() => push({ type: "farmers" })}
      />
    );
  } else if (screen.type === "farmers") {
    body = (
      <FarmerListScreen
        rows={villageRows}
        villageName={villageName}
        onBack={back}
        onOpenFarmer={(farmerId) => push({ type: "plots", farmerId })}
      />
    );
  } else if (screen.type === "plots") {
    const farmer = groupFarmers(villageRows).find((item) => item.farmer_id === screen.farmerId);
    const plots = villageRows
      .filter((row) => row.farmer_id === screen.farmerId)
      .sort((a, b) => a.plot_id.localeCompare(b.plot_id, undefined, { numeric: true }));
    body = farmer ? (
      <PlotListScreen farmer={farmer} plots={plots} onBack={back} onOpenPlot={openSample} />
    ) : (
      <MissingScreen onBack={back} />
    );
  } else if (screen.type === "sample" || screen.type === "location") {
    const plot = rows.find((row) => row.id === screen.rowId);
    const draft = plot ? drafts[plot.id] ?? draftFromPlot(plot) : null;
    if (!plot || !draft) {
      body = <MissingScreen onBack={back} />;
    } else if (screen.type === "location") {
      body = (
        <LocationPickerScreen
          plot={plot}
          initialLat={draft.sampleLat}
          initialLng={draft.sampleLong}
          onBack={back}
          onConfirm={(sampleLat, sampleLong) => {
            setDrafts((current) => ({
              ...current,
              [plot.id]: { ...(current[plot.id] ?? draft), sampleLat, sampleLong },
            }));
            back();
          }}
        />
      );
    } else {
      body = (
        <SampleFormScreen
          plot={plot}
          draft={draft}
          saving={saving}
          error={saveError}
          onBack={back}
          onChange={(partial) =>
            setDrafts((current) => ({
              ...current,
              [plot.id]: { ...(current[plot.id] ?? draft), ...partial },
            }))
          }
          onOpenLocation={() => push({ type: "location", rowId: plot.id })}
          onSubmit={() => void saveSample(plot, draft)}
        />
      );
    }
  }

  return (
    <div className="h-dvh bg-neutral-100">
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-white shadow-sm">
        {preview ? (
          <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
            Preview data only. Add your Supabase URL and anon key in .env.local to save samples.
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{body}</div>
      </div>
    </div>
  );
}

function MissingScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Not found" onBack={onBack} />
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        That plot is no longer in the list.
      </p>
    </div>
  );
}
