import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Dagupan City center coordinates (Pangasinan, Philippines)
const DAGUPAN_LAT = 16.0435;
const DAGUPAN_LNG = 120.3333;
const DEFAULT_ZOOM = 14;

/**
 * SellerMap — renders an OpenStreetMap (Leaflet) tile map centered on Dagupan City.
 * No API key required. Free and open-source.
 * @param {string} address - Optional address text shown in the marker popup.
 */
export function SellerMap({ address }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import avoids bundler issues with Leaflet's internal require()
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default marker icon paths broken by Vite/webpack bundling
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(containerRef.current, {
        center: [DAGUPAN_LAT, DAGUPAN_LNG],
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: false, // prevent accidental zooming when scrolling the page
      });

      // OpenStreetMap tile layer — completely free, no API key needed
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Marker at Dagupan center
      L.marker([DAGUPAN_LAT, DAGUPAN_LNG])
        .addTo(map)
        .bindPopup(
          `<strong>${address || 'Dagupan City'}</strong><br/>Dagupan, Pangasinan`,
          { maxWidth: 200 }
        )
        .openPopup();

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // only run once on mount

  return (
    <div
      ref={containerRef}
      style={{ height: '280px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}
      aria-label="Map of Dagupan City"
    />
  );
}
