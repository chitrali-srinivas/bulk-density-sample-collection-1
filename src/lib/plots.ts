import { getSupabase } from "@/lib/supabase";
import { PLOT_STATUSES, type PlotRow, type PlotStatus } from "@/lib/types";

type RawPlot = Omit<PlotRow, "status" | "lat" | "long" | "sample_lat" | "sample_long"> & {
  status: string;
  lat: number | string | null;
  long: number | string | null;
  sample_lat: number | string | null;
  sample_long: number | string | null;
};

function asNumber(value: number | string | null) {
  if (value === null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function asStatus(value: string): PlotStatus {
  if (PLOT_STATUSES.includes(value as PlotStatus)) return value as PlotStatus;
  return "pending";
}

export function normalizePlot(raw: RawPlot): PlotRow {
  const sampleId = raw.sample_id;
  const collectedAt = raw.collected_at;
  const stored = asStatus(raw.status);
  const status: PlotStatus =
    stored === "rejected"
      ? "rejected"
      : sampleId || collectedAt
        ? "enrolled"
        : "pending";

  return {
    ...raw,
    lat: asNumber(raw.lat),
    long: asNumber(raw.long),
    sample_lat: asNumber(raw.sample_lat),
    sample_long: asNumber(raw.sample_long),
    status,
  };
}

export async function fetchPlots() {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const { data, error } = await supabase
    .from("farmer_plots")
    .select("*")
    .order("farmer_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => normalizePlot(row as RawPlot));
}

export async function compressImage(file: File) {
  // Photos are already resized and geotagged when captured.
  if (file.type === "image/jpeg" && file.name.includes("-geotagged")) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = 1600;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  return blob ?? file;
}

export async function submitSample(input: {
  rowId: string;
  farmerId: string;
  plotId: string;
  sampleId: string;
  sampleDate: string;
  coreCutType: string;
  sampleLat: number;
  sampleLong: number;
  pictureFile: File | null;
  existingPictureUrl: string | null;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  let pictureUrl = input.existingPictureUrl;
  if (input.pictureFile) {
    const body = await compressImage(input.pictureFile);
    const path = `${input.farmerId}/${input.plotId}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("sample-photos")
      .upload(path, body, { contentType: "image/jpeg", upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    pictureUrl = supabase.storage.from("sample-photos").getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase.rpc("submit_sample", {
    p_id: input.rowId,
    p_sample_id: input.sampleId,
    p_sample_date: input.sampleDate,
    p_sample_picture_url: pictureUrl,
    p_core_cut_type: input.coreCutType,
    p_sample_lat: input.sampleLat,
    p_sample_long: input.sampleLong,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The sample was not saved.");
  return normalizePlot(data as RawPlot);
}
