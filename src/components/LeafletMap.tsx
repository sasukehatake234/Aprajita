import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GpsSource } from '../types';

interface LeafletMapProps {
  lat: number;
  lng: number;
  accuracy?: number;
  source?: GpsSource;
  height?: string;
  zoom?: number;
  interactive?: boolean;
}

export function LeafletMap({
  lat,
  lng,
  accuracy = 15,
  source = 'PHONE_GPS',
  height = '320px',
  zoom = 15,
  interactive = true,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if map already initialized on this node
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: zoom,
        zoomControl: interactive,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      // Sleek Voyager / OpenStreetMap basemap
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;
    } else {
      mapInstanceRef.current.setView([lat, lng], zoom);
    }

    const map = mapInstanceRef.current;

    // Custom Marker Icon
    const isKeychain = source === 'KEYCHAIN_GPS';
    const markerColor = isKeychain ? '#8b5cf6' : '#06b6d4';
    const markerPulse = isKeychain ? 'rgba(139, 92, 246, 0.4)' : 'rgba(6, 182, 212, 0.4)';

    const customIcon = L.divIcon({
      className: 'aparajita-map-marker',
      html: `
        <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: ${markerPulse}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 16px; height: 16px; border-radius: 9999px; background: ${markerColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(customIcon);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);
    }

    // Accuracy Circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(accuracy);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: accuracy,
        color: markerColor,
        weight: 1,
        fillColor: markerColor,
        fillOpacity: 0.12,
      }).addTo(map);
    }

    // Popup
    markerRef.current.bindPopup(`
      <div style="padding: 4px; font-size: 12px; font-family: inherit;">
        <strong style="color: #0f172a; display: block; margin-bottom: 2px;">
          ${isKeychain ? 'Keychain GPS (NEO-6M)' : 'Mobile Phone GPS'}
        </strong>
        <span style="color: #475569;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span><br/>
        <span style="color: #64748b; font-size: 11px;">Accuracy: ±${accuracy}m</span>
      </div>
    `);

    // Invalidate map size to prevent gray tiles on mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [lat, lng, accuracy, source, zoom, interactive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-2xl overflow-hidden border border-slate-800 shadow-inner z-0"
    />
  );
}
