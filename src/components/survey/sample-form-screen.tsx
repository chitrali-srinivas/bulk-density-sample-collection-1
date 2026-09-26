"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScreenHeader } from "@/components/survey/screen-header";
import {
  formatCoordinatePair,
  formatShortDate,
  parseIsoDate,
  parseSampleId,
  plotLabel,
  sampleLocationError,
  toIsoDate,
} from "@/lib/format";
import { geotagSamplePhoto, readDeviceLocation } from "@/lib/geotag-image";
import type { PlotRow, SampleDraft } from "@/lib/types";
import { CalendarIcon, CameraIcon, MapPinIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function SampleFormScreen({
  plot,
  draft,
  saving,
  error,
  onBack,
  onChange,
  onOpenLocation,
  onSubmit,
}: {
  plot: PlotRow;
  draft: SampleDraft;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onChange: (partial: Partial<SampleDraft>) => void;
  onOpenLocation: () => void;
  onSubmit: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const hasPicture = Boolean(draft.picturePreview || draft.existingPictureUrl);
  const hasLocation = draft.sampleLat !== null && draft.sampleLong !== null;

  function update(partial: Partial<SampleDraft>) {
    onChange(partial);
  }

  async function resolveStampCoordinates() {
    if (draft.sampleLat !== null && draft.sampleLong !== null) {
      return { lat: draft.sampleLat, lng: draft.sampleLong };
    }
    const position = await readDeviceLocation();
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  }

  async function handlePictureSelected(file: File | null) {
    if (draft.picturePreview) URL.revokeObjectURL(draft.picturePreview);
    if (!file) {
      update({ pictureFile: null, picturePreview: null });
      return;
    }

    setPhotoBusy(true);
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.picture;
      return next;
    });

    try {
      const coords = await resolveStampCoordinates();
      const geotagged = await geotagSamplePhoto(file, {
        lat: coords.lat,
        lng: coords.lng,
        takenAt: new Date(),
      });
      update({
        pictureFile: geotagged,
        picturePreview: URL.createObjectURL(geotagged),
      });
    } catch (photoError: unknown) {
      update({ pictureFile: null, picturePreview: null });
      setFieldErrors((current) => ({
        ...current,
        picture:
          photoError instanceof Error
            ? photoError.message
            : "Could not geotag the photo. Set sample location or allow GPS, then try again.",
      }));
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!draft.sampleId.trim()) next.sampleId = "Enter the sample ID.";
    if (!draft.sampleDate) next.sampleDate = "Choose the sample date.";
    if (!hasLocation) {
      next.location = "Collect the sample location on the map.";
    } else {
      const locationMessage = sampleLocationError(
        plot.lat,
        plot.long,
        draft.sampleLat,
        draft.sampleLong,
      );
      if (locationMessage) next.location = locationMessage;
    }
    if (!hasPicture) next.picture = "Add a geotagged photo of the sample.";
    if (!draft.coreCutType.trim()) next.coreCutType = "Enter the core cut type.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  if (scanning) {
    return (
      <BarcodeScanner
        onClose={() => setScanning(false)}
        onDetect={(value) => {
          update({ sampleId: parseSampleId(value) });
          setScanning(false);
        }}
      />
    );
  }

  return (
    <form
      className="flex h-full min-h-0 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (validate()) onSubmit();
      }}
    >
      <ScreenHeader title={plot.farmer_name} onBack={onBack} />
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <p className="font-semibold">{plotLabel(plot.plot_id)}</p>
          <p className="text-xs text-muted-foreground">
            {plot.field_type || "Field type not set"}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatShortDate(plot.sample_date) || "No sample yet"}
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-4 py-4">
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="sample-id">Sample ID</Label>
          <div className="flex gap-2">
            <Input
              id="sample-id"
              value={draft.sampleId}
              placeholder="Scan or type"
              aria-invalid={Boolean(fieldErrors.sampleId)}
              className="h-12 flex-1 px-3 text-base"
              onChange={(event) => update({ sampleId: event.target.value })}
              onBlur={(event) => update({ sampleId: parseSampleId(event.target.value) })}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted) return;
                event.preventDefault();
                update({ sampleId: parseSampleId(pasted) });
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-12 px-4"
              onClick={() => setScanning(true)}
            >
              Scan
            </Button>
          </div>
          {fieldErrors.sampleId ? (
            <p className="text-xs text-destructive">{fieldErrors.sampleId}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sample-date">Sample Date</Label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger
              id="sample-date"
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full justify-between px-3 text-base font-normal"
                  aria-invalid={Boolean(fieldErrors.sampleDate)}
                />
              }
            >
              <span className={draft.sampleDate ? "" : "text-muted-foreground"}>
                {draft.sampleDate ? formatShortDate(draft.sampleDate) : "Select date"}
              </span>
              <CalendarIcon />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={draft.sampleDate ? parseIsoDate(draft.sampleDate) : undefined}
                onSelect={(date) => {
                  update({ sampleDate: date ? toIsoDate(date) : "" });
                  if (date) setDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {fieldErrors.sampleDate ? (
            <p className="text-xs text-destructive">{fieldErrors.sampleDate}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Sample Location</Label>
          <div className="flex h-12 items-center gap-2 rounded-lg border px-3">
            <MapPinIcon className="size-4 text-muted-foreground" />
            <span className={`min-w-0 flex-1 truncate text-sm ${hasLocation ? "" : "text-muted-foreground"}`}>
              {hasLocation
                ? formatCoordinatePair(draft.sampleLat as number, draft.sampleLong as number)
                : "Set on the map"}
            </span>
            <Button
              type="button"
              variant="link"
              className="h-auto px-0"
              onClick={onOpenLocation}
            >
              {hasLocation ? "Change" : "Set"}
            </Button>
          </div>
          {fieldErrors.location ? (
            <p className="text-xs text-destructive">{fieldErrors.location}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sample-picture">Sample Picture</Label>
          <Input
            ref={fileRef}
            id="sample-picture"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void handlePictureSelected(event.target.files?.[0] ?? null);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full justify-between px-3 text-base font-normal"
            aria-invalid={Boolean(fieldErrors.picture)}
            disabled={photoBusy}
            onClick={() => fileRef.current?.click()}
          >
            <span className={hasPicture || photoBusy ? "" : "text-muted-foreground"}>
              {photoBusy ? "Geotagging photo…" : hasPicture ? "Photo added" : "Take a photo"}
            </span>
            <CameraIcon />
          </Button>
          {draft.picturePreview || draft.existingPictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.picturePreview || draft.existingPictureUrl || ""}
              alt="Sample preview"
              className="h-48 w-full rounded-lg object-cover"
            />
          ) : null}
          {fieldErrors.picture ? (
            <p className="text-xs text-destructive">{fieldErrors.picture}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="core-cut-type">Enter Core Cut Type</Label>
          <Input
            id="core-cut-type"
            value={draft.coreCutType}
            placeholder="Type"
            aria-invalid={Boolean(fieldErrors.coreCutType)}
            className="h-12 px-3 text-base"
            onChange={(event) => update({ coreCutType: event.target.value })}
          />
          {fieldErrors.coreCutType ? (
            <p className="text-xs text-destructive">{fieldErrors.coreCutType}</p>
          ) : null}
        </div>
      </div>

      <div className="sticky bottom-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="submit" className="h-12 w-full text-base" disabled={saving || photoBusy}>
          {saving ? "Saving…" : "Submit"}
        </Button>
      </div>
    </form>
  );
}

function BarcodeScanner({
  onDetect,
  onClose,
}: {
  onDetect: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState(() =>
    typeof window !== "undefined" && window.BarcodeDetector
      ? "Point the camera at the sample code."
      : "This browser cannot scan codes. Type the sample ID instead.",
  );

  useEffect(() => {
    const Detector = window.BarcodeDetector;
    if (!Detector) return;

    let stop = false;
    let stream: MediaStream | null = null;
    let timer = 0;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const detector = new Detector({
          formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "data_matrix"],
        });
        const tick = async () => {
          if (stop || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              onDetect(parseSampleId(value));
              return;
            }
          } catch {
            setMessage("Could not read a code. Type the sample ID instead.");
            return;
          }
          timer = window.setTimeout(() => void tick(), 250);
        };
        void tick();
      } catch {
        setMessage("Camera permission is needed to scan. Type the sample ID instead.");
      }
    })();

    return () => {
      stop = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetect]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-black text-white">
      <ScreenHeader title="Scan sample ID" onBack={onClose} close />
      <div className="relative min-h-0 flex-1">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
      </div>
      <p className="px-4 py-4 text-center text-sm">{message}</p>
    </div>
  );
}
