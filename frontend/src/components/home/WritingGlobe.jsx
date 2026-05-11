import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const KM_H = 10;
const KM_V = 5;
const KM_PER_DEG_LAT = 111.32;

function collectLocations(records) {
  return records
    .filter((r) => r.latitude != null && r.longitude != null)
    .map((r) => ({
      id: r.id,
      name: r.place_name || '',
      lat: r.latitude,
      lon: r.longitude,
      date: r.date,
      charCount: r.char_count || 0,
      topics: r.topics || [],
      timelapse_video_url: r.timelapse_video_url || '',
      start_time: r.start_time || '',
      end_time: r.end_time || '',
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function pinIcon(isSelected) {
  const size = isSelected ? 16 : 12;
  const emoji = isSelected ? '❤️‍🔥' : '🩷';
  return L.divIcon({
    className: 'writing-map-pin',
    html: `<span style="font-size:${size}px;line-height:1;">${emoji}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export default function WritingGlobe({ records, selected, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  const locations = useMemo(() => collectLocations(records), [records]);
  const latest = locations[0] || null;

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = latest ? [latest.lat, latest.lon] : [37.5665, 126.978];
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(center, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fit to latest ±15km/±10km on first load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !latest) return;

    const kmPerDegLon = KM_PER_DEG_LAT * Math.cos((latest.lat * Math.PI) / 180);
    const dLon = KM_H / kmPerDegLon;
    const dLat = KM_V / KM_PER_DEG_LAT;

    map.fitBounds([
      [latest.lat - dLat, latest.lon - dLon],
      [latest.lat + dLat, latest.lon + dLon],
    ]);
  }, [latest]);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add markers (oldest first, newest on top)
    const sorted = [...locations].reverse();
    sorted.forEach((loc) => {
      const isSelected = selected && selected.id === loc.id;
      const icon = pinIcon(isSelected);

      const marker = L.marker([loc.lat, loc.lon], {
        icon,
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      // Tooltip with place name
      if (loc.name) {
        marker.bindTooltip(loc.name, {
          permanent: isSelected,
          direction: 'top',
          offset: [0, -10],
          className: 'writing-map-label',
        });
      }

      marker.on('click', () => {
        if (onSelect) onSelect(loc);
      });

      markersRef.current.push(marker);
    });
  }, [locations, selected, latest, onSelect]);

  if (locations.length === 0) return null;

  return (
    <div className="writing-map-panel">
      <div ref={containerRef} className="writing-map-container" />
    </div>
  );
}
