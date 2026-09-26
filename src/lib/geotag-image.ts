const COPYRIGHT = "© Mati Carbon. All Rights Reserved.";

function ordinalDay(day: number) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatGeotagDateTime(date: Date) {
  const day = ordinalDay(date.getDate());
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}:${seconds}`;
}

export function formatGeotagCoordinates(lat: number, lng: number) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function drawCalendarIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const pad = size * 0.12;
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineWidth = Math.max(1.5, size * 0.08);
  context.strokeRect(x + pad, y + pad * 1.6, size - pad * 2, size - pad * 2.4);
  context.fillRect(x + pad, y + pad * 1.6, size - pad * 2, size * 0.22);
  context.beginPath();
  context.moveTo(x + size * 0.3, y + pad);
  context.lineTo(x + size * 0.3, y + pad * 2.4);
  context.moveTo(x + size * 0.7, y + pad);
  context.lineTo(x + size * 0.7, y + pad * 2.4);
  context.stroke();
}

function drawLocationIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const cx = x + size / 2;
  const cy = y + size * 0.42;
  const radius = size * 0.28;
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineWidth = Math.max(1.5, size * 0.08);
  context.beginPath();
  context.arc(cx, cy, radius, Math.PI * 0.15, Math.PI * 0.85, true);
  context.lineTo(cx, y + size * 0.92);
  context.closePath();
  context.stroke();
  context.beginPath();
  context.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
  context.fill();
}

function drawCopyrightIcon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineWidth = Math.max(1.5, size * 0.08);
  context.beginPath();
  context.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
  context.stroke();
  context.font = `bold ${Math.round(size * 0.42)}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("C", cx, cy + size * 0.02);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
}

/**
 * Burns a bottom-left geotag stamp onto the photo:
 * datetime, lat/long, and Mati Carbon copyright.
 */
export async function geotagSamplePhoto(
  file: File,
  input: { lat: number; lng: number; takenAt?: Date },
) {
  const takenAt = input.takenAt ?? new Date();
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

  const lines = [
    { icon: "calendar" as const, text: formatGeotagDateTime(takenAt) },
    {
      icon: "location" as const,
      text: formatGeotagCoordinates(input.lat, input.lng),
    },
    { icon: "copyright" as const, text: COPYRIGHT },
  ];

  const fontSize = Math.max(14, Math.round(width * 0.028));
  const iconSize = Math.round(fontSize * 1.15);
  const lineGap = Math.round(fontSize * 0.45);
  const paddingX = Math.round(fontSize * 0.85);
  const paddingY = Math.round(fontSize * 0.7);
  const iconTextGap = Math.round(fontSize * 0.45);
  const margin = Math.round(Math.min(width, height) * 0.035);

  context.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const textWidth = Math.max(...lines.map((line) => context.measureText(line.text).width));
  const boxWidth = paddingX * 2 + iconSize + iconTextGap + textWidth;
  const boxHeight =
    paddingY * 2 + lines.length * fontSize + (lines.length - 1) * lineGap;
  const boxX = margin;
  const boxY = height - margin - boxHeight;

  context.fillStyle = "rgba(40, 40, 40, 0.55)";
  context.beginPath();
  const radius = Math.max(6, fontSize * 0.25);
  context.moveTo(boxX + radius, boxY);
  context.arcTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxHeight, radius);
  context.arcTo(boxX + boxWidth, boxY + boxHeight, boxX, boxY + boxHeight, radius);
  context.arcTo(boxX, boxY + boxHeight, boxX, boxY, radius);
  context.arcTo(boxX, boxY, boxX + boxWidth, boxY, radius);
  context.closePath();
  context.fill();

  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";

  lines.forEach((line, index) => {
    const rowY = boxY + paddingY + fontSize / 2 + index * (fontSize + lineGap);
    const iconX = boxX + paddingX;
    const iconY = rowY - iconSize / 2;
    if (line.icon === "calendar") drawCalendarIcon(context, iconX, iconY, iconSize);
    if (line.icon === "location") drawLocationIcon(context, iconX, iconY, iconSize);
    if (line.icon === "copyright") drawCopyrightIcon(context, iconX, iconY, iconSize);
    context.fillText(line.text, iconX + iconSize + iconTextGap, rowY);
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.88),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + "-geotagged.jpg", {
    type: "image/jpeg",
    lastModified: takenAt.getTime(),
  });
}

export function readDeviceLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}
