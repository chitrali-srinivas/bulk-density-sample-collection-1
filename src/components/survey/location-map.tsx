"use client";

import { Button } from "@/components/ui/button";
import { LocateFixedIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type MapsWindow = Window & {
  gm_authFailure?: () => void;
  __bulkDensityMapsReady?: () => void;
};

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(key: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const mapsWindow = window as MapsWindow;
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) {
      const waitForMaps = window.setInterval(() => {
        if (window.google?.maps?.Map) {
          window.clearInterval(waitForMaps);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(waitForMaps);
        if (!window.google?.maps?.Map) {
          mapsLoader = null;
          reject(new Error("Google Maps failed to load. Check the API key and restart the dev server."));
        }
      }, 15000);
      return;
    }

    mapsWindow.__bulkDensityMapsReady = () => {
      resolve();
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&callback=__bulkDensityMapsReady`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error("Google Maps failed to load. Check the API key and restart the dev server."));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

export function LocationMap({
  lat,
  lng,
  plotLat,
  plotLong,
  onChange,
}: {
  lat: number;
  lng: number;
  plotLat?: number | null;
  plotLong?: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return;
    let removed = false;

    const mapsWindow = window as MapsWindow;
    mapsWindow.gm_authFailure = () => {
      if (!removed) {
        setError("Google Maps rejected this API key. Enable the Maps JavaScript API for it.");
      }
    };

    void loadGoogleMaps(apiKey)
      .then(() => {
        if (removed || !containerRef.current || !window.google?.maps?.Map) return;

        const map = new google.maps.Map(containerRef.current, {
          center: { lat, lng },
          zoom: 18,
          mapTypeId: "satellite",
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          zoomControl: true,
        });
        const marker = new google.maps.Marker({
          map,
          position: { lat, lng },
          draggable: true,
          title: "Drag the pin to the sample point",
          icon: {
            url: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/sample-location-pin.svg`,
            scaledSize: new google.maps.Size(40, 56),
            size: new google.maps.Size(40, 56),
            anchor: new google.maps.Point(20, 56),
          },
        });

        if (
          typeof plotLat === "number" &&
          typeof plotLong === "number" &&
          Number.isFinite(plotLat) &&
          Number.isFinite(plotLong)
        ) {
          new google.maps.Circle({
            map,
            center: { lat: plotLat, lng: plotLong },
            radius: 1,
            strokeColor: "#2563eb",
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            clickable: false,
          });
          new google.maps.Marker({
            map,
            position: { lat: plotLat, lng: plotLong },
            clickable: false,
            title: "Plot location",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 6,
              fillColor: "#2563eb",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            },
          });
        }

        const publish = () => {
          const position = marker.getPosition();
          if (!position) return;
          onChangeRef.current(position.lat(), position.lng());
        };
        marker.addListener("drag", publish);
        marker.addListener("dragend", publish);

        mapRef.current = map;
        markerRef.current = marker;
        if (!removed) setReady(true);
      })
      .catch((loadError: unknown) => {
        if (!removed) {
          setError(loadError instanceof Error ? loadError.message : "Google Maps failed to load.");
        }
      });

    return () => {
      removed = true;
      markerRef.current?.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once. Dragging the pin updates the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const nextLat = position.coords.latitude;
      const nextLng = position.coords.longitude;
      const next = { lat: nextLat, lng: nextLng };
      markerRef.current?.setPosition(next);
      mapRef.current?.panTo(next);
      mapRef.current?.setZoom(18);
      onChange(nextLat, nextLng);
    });
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={containerRef} className="absolute inset-0" />
      {!apiKey ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 px-6 text-center">
          <p className="text-sm text-muted-foreground">
            Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local, then restart the dev server.
          </p>
        </div>
      ) : null}
      {error ? (
        <div className="absolute inset-x-4 bottom-4 rounded-lg bg-white px-3 py-2 text-center text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}
      {ready ? (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="absolute top-3 right-3 z-10 bg-white shadow-sm"
          onClick={locate}
          aria-label="Use my location"
        >
          <LocateFixedIcon />
        </Button>
      ) : null}
    </div>
  );
}
