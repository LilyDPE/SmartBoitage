'use client';

// ZoneDrawer Component - Interactive polygon drawing tool
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';

export interface ZoneDrawerProps {
  map: L.Map | null;
  onZoneDrawn?: (geojson: any) => void;
  onZoneEdited?: (geojson: any) => void;
  onZoneDeleted?: () => void;
  existingZone?: any;
}

export default function ZoneDrawer({
  map,
  onZoneDrawn,
  onZoneEdited,
  onZoneDeleted,
  existingZone,
}: ZoneDrawerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Add existing zone if provided
    if (existingZone) {
      const layer = L.geoJSON(existingZone, {
        style: {
          color: '#3388ff',
          weight: 3,
          opacity: 0.6,
          fillOpacity: 0.2,
        },
      });
      layer.eachLayer((l) => drawnItems.addLayer(l));

      // Fit map to zone bounds
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    // Configure draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#3388ff',
            weight: 3,
          },
        },
        polyline: false,
        rectangle: {
          shapeOptions: {
            color: '#3388ff',
            weight: 3,
          },
        },
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });

    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Event handlers
    map.on(L.Draw.Event.CREATED, (e: any) => {
      const layer = e.layer;
      drawnItems.clearLayers(); // Only one zone at a time
      drawnItems.addLayer(layer);

      const geojson = layer.toGeoJSON();
      setIsDrawing(false);

      if (onZoneDrawn) {
        onZoneDrawn(geojson.geometry);
      }
    });

    map.on(L.Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        const geojson = layer.toGeoJSON();
        if (onZoneEdited) {
          onZoneEdited(geojson.geometry);
        }
      });
    });

    map.on(L.Draw.Event.DELETED, () => {
      if (onZoneDeleted) {
        onZoneDeleted();
      }
    });

    map.on(L.Draw.Event.DRAWSTART, () => {
      setIsDrawing(true);
    });

    map.on(L.Draw.Event.DRAWSTOP, () => {
      setIsDrawing(false);
    });

    // Cleanup
    return () => {
      if (map && drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      if (map && drawnItemsRef.current) {
        map.removeLayer(drawnItemsRef.current);
      }
    };
  }, [map, existingZone]);

  return (
    <div className="zone-drawer-info">
      {isDrawing && (
        <div className="drawing-hint" style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000,
          fontSize: '14px',
        }}>
          Cliquez sur la carte pour dessiner votre zone de boîtage
        </div>
      )}
    </div>
  );
}
