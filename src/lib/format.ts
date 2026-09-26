import type { FarmerGroup, PlotRow, PlotStatus, SampleDraft } from "@/lib/types";

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return "";
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year.slice(2)}`;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function formatCoordinate(value: number) {
  return value.toFixed(5);
}

export function formatCoordinatePair(lat: number, lng: number) {
  return `${formatCoordinate(lat)}, ${formatCoordinate(lng)}`;
}

/**
 * Sample QR codes encode a URL like https://devmatiadmin.maticarbon.com/sample/MK9DJC.
 * Store only the code after /sample/. Plain codes are kept as typed.
 */
export function parseSampleId(raw: string) {
  const value = raw.trim();
  if (!value) return "";

  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/sample\/([^/?#]+)/i);
    if (match?.[1]) return decodeURIComponent(match[1]).trim();
  } catch {
    // Not a full URL — fall through to path-style matching.
  }

  const pathMatch = value.match(/(?:^|\/)sample\/([^/?#\s]+)/i);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]).trim();

  return value;
}

/** Great-circle distance in meters between two WGS84 points. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const MAX_SAMPLE_DISTANCE_M = 1;

export function sampleLocationError(
  plotLat: number | null,
  plotLong: number | null,
  sampleLat: number | null,
  sampleLong: number | null,
) {
  if (sampleLat === null || sampleLong === null) {
    return "Collect the sample location on the map.";
  }
  if (plotLat === null || plotLong === null) {
    return "This plot has no coordinates, so the sample location cannot be verified.";
  }
  const meters = distanceMeters(plotLat, plotLong, sampleLat, sampleLong);
  if (meters > MAX_SAMPLE_DISTANCE_M) {
    return `Sample location must be within ${MAX_SAMPLE_DISTANCE_M} m of the plot (currently ${meters.toFixed(1)} m away).`;
  }
  return null;
}

export function googleMapsDirectionsUrl(lat: number, lng: number) {
  const destination = `${lat},${lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
}

export function plotLabel(plotId: string) {
  return /^plot\b/i.test(plotId.trim()) ? plotId.trim() : `Plot ${plotId}`;
}

export function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

export function plotSampleStatus(
  plot: Pick<PlotRow, "status" | "sample_id" | "collected_at">,
): PlotStatus {
  if (plot.status === "rejected") return "rejected";
  if (plot.sample_id || plot.collected_at) return "enrolled";
  return "pending";
}

export function isSampleCollected(status: PlotStatus) {
  return status === "enrolled";
}

/** A farmer is done only when every plot has a collected sample. */
export function farmerStatus(plots: PlotRow[]): PlotStatus {
  const statuses = plots.map(plotSampleStatus);
  if (statuses.length > 0 && statuses.every(isSampleCollected)) return "enrolled";
  if (statuses.includes("rejected")) return "rejected";
  return "pending";
}

export function statusLabel(status: PlotStatus, scope: "plot" | "farmer" = "plot") {
  if (status === "rejected") return "Rejected";
  if (status === "pending") return "Pending";
  return scope === "farmer" ? "Done" : "Collected";
}

export function groupFarmers(rows: PlotRow[]): FarmerGroup[] {
  const groups = new Map<string, PlotRow[]>();
  for (const row of rows) {
    const current = groups.get(row.farmer_id) ?? [];
    current.push(row);
    groups.set(row.farmer_id, current);
  }

  return Array.from(groups.values())
    .map((plots) => {
      const first = plots[0];
      const dates = plots
        .map((plot) => plot.sample_date)
        .filter((date): date is string => Boolean(date))
        .sort();
      return {
        farmer_id: first.farmer_id,
        farmer_name: first.farmer_name,
        village_name: first.village_name,
        status: farmerStatus(plots),
        plotCount: plots.length,
        collectedCount: plots.filter((plot) => isSampleCollected(plotSampleStatus(plot))).length,
        latestSampleDate: dates.at(-1) ?? null,
      };
    })
    .sort((a, b) => a.farmer_name.localeCompare(b.farmer_name));
}

export function draftFromPlot(plot: PlotRow): SampleDraft {
  return {
    sampleId: plot.sample_id ?? "",
    sampleDate: plot.sample_date ?? "",
    coreCutType: plot.core_cut_type ?? "",
    sampleLat: plot.sample_lat,
    sampleLong: plot.sample_long,
    pictureFile: null,
    picturePreview: null,
    existingPictureUrl: plot.sample_picture_url,
  };
}

export function villageChoices(rows: PlotRow[], base: string) {
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (row.base === base) seen.set(row.village_id, row.village_name);
  }
  return Array.from(seen, ([village_id, village_name]) => ({
    village_id,
    village_name,
  })).sort((a, b) => a.village_name.localeCompare(b.village_name));
}

export function baseChoices(rows: PlotRow[]) {
  return Array.from(new Set(rows.map((row) => row.base))).sort((a, b) =>
    a.localeCompare(b),
  );
}
