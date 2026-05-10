import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapPanel({ mapData, selectedPostcodes = [], onTogglePostcode }) {
  if (!mapData || mapData.length === 0) return null;

  const maxCount = Math.max(...mapData.map(d => d.count));

  return (
    <div className="mt-3">
      <MapContainer
        center={[51.5074, -0.1278]}
        zoom={11}
        style={{ height: '540px', borderRadius: '8px' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {mapData.map(({ area, lat, lng, count, town }) => {
          const isSelected = selectedPostcodes.includes(area);
          const radius = 6 + (count / maxCount) * 14;
          return (
            <CircleMarker
              key={area}
              center={[lat, lng]}
              radius={radius}
              pathOptions={{
                color: isSelected ? '#1d4ed8' : '#3b82f6',
                fillColor: isSelected ? '#1d4ed8' : '#93c5fd',
                fillOpacity: isSelected ? 0.9 : 0.5,
                weight: isSelected ? 2 : 1,
              }}
              eventHandlers={{ click: () => onTogglePostcode(area) }}
            >
              <Tooltip>
                <span className="font-medium">{area}</span>
                {town && <span> — {town}</span>}
                <br />
                {count} client{count !== 1 ? 's' : ''}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
