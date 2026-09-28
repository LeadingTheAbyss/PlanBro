'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MemberPin {
  name: string;
  lat: number;
  lng: number;
  color: string; // tailwind bg class color HEX equivalent
}

export interface StopPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  label: number;
}

export interface MeetingPin {
  name: string;
  lat: number;
  lng: number;
}

interface QuickTripMapInnerProps {
  members: MemberPin[];
  meetingPoint?: MeetingPin | null;
  stops: StopPin[];
}

/** Generate a unique color from a name string, returns a CSS hex color */
export function getAvatarHex(name: string): string {
  const colors = [
    '#dc2626', '#ea580c', '#d97706', '#16a34a',
    '#059669', '#0d9488', '#0891b2', '#2563eb',
    '#4f46e5', '#7c3aed', '#9333ea', '#c026d3', '#db2777', '#e11d48'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const createMemberIcon = (name: string, color: string) => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:32px;height:32px;border-radius:50%;
        background:${color};
        color:white;font-weight:700;font-size:11px;
        display:flex;align-items:center;justify-content:center;
        border:3px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.7);
        z-index:100;
      ">${getInitials(name)}</div>
      <div style="
        margin-top:3px;
        background:rgba(0,0,0,0.75);
        color:white;font-size:9px;font-weight:600;
        padding:1px 5px;border-radius:4px;
        white-space:nowrap;
        text-shadow:0 1px 2px rgba(0,0,0,0.9);
      ">${name.split(' ')[0]}</div>
    </div>
  `,
  iconSize: [32, 48],
  iconAnchor: [16, 16],
});

const createMeetingIcon = (label: string) => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:28px;height:28px;border-radius:50%;
        background:#f59e0b;
        color:black;font-weight:900;font-size:13px;
        display:flex;align-items:center;justify-content:center;
        border:3px solid #000;box-shadow:0 2px 8px rgba(0,0,0,0.7);
        z-index:100;
      ">★</div>
      <div style="
        margin-top:3px;
        background:rgba(0,0,0,0.75);
        color:white;font-size:9px;font-weight:600;
        padding:1px 5px;border-radius:4px;
        white-space:nowrap;
      ">${label}</div>
    </div>
  `,
  iconSize: [28, 44],
  iconAnchor: [14, 14],
});

const createStopIcon = (label: number, name: string) => L.divIcon({
  className: '',
  html: `
    <div class="relative flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white font-bold text-[10px] border-2 border-black/80 shadow-md backdrop-blur-sm z-50">
      ${label}
      <div class="absolute left-full ml-2 text-white text-[11px] font-bold whitespace-nowrap drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] pointer-events-none" style="text-shadow: 0px 2px 4px rgba(0,0,0,0.9), 0px 0px 2px rgba(0,0,0,0.9);">
        ${name}
      </div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapFitBounds({ members, stops, meetingPoint }: { members: MemberPin[]; stops: StopPin[]; meetingPoint?: MeetingPin | null }) {
  const map = useMap();
  useEffect(() => {
    const allPoints: [number, number][] = [
      ...members.map(m => [m.lat, m.lng] as [number, number]),
      ...stops.map(s => [s.lat, s.lng] as [number, number]),
    ];
    if (meetingPoint) allPoints.push([meetingPoint.lat, meetingPoint.lng]);
    if (allPoints.length > 0) {
      map.fitBounds(L.latLngBounds(allPoints), {
        paddingBottomRight: [100, 50],
        paddingTopLeft: [50, 50],
        maxZoom: 15,
        animate: true,
      });
    }
  }, [map, members, stops, meetingPoint]);
  return null;
}

function MemberMarker({ m }: { m: MemberPin }) {
  const icon = React.useMemo(() => createMemberIcon(m.name, m.color), [m.name, m.color]);
  return <Marker position={[m.lat, m.lng]} icon={icon} />;
}

function MeetingMarker({ p }: { p: MeetingPin }) {
  const icon = React.useMemo(() => createMeetingIcon('Meet Here'), []);
  return <Marker position={[p.lat, p.lng]} icon={icon} />;
}

function StopMarker({ s, i }: { s: StopPin, i: number }) {
  const icon = React.useMemo(() => createStopIcon(i + 1, s.name), [i, s.name]);
  return <Marker position={[s.lat, s.lng]} icon={icon} />;
}

export default function QuickTripMapInner({ members, meetingPoint, stops }: QuickTripMapInnerProps) {
  const defaultCenter: [number, number] =
    members.length > 0 ? [members[0].lat, members[0].lng] :
    stops.length > 0 ? [stops[0].lat, stops[0].lng] :
    [26.9124, 75.7873];

  // Build polylines: each member → meeting point (dashed), meeting point → stops (solid)
  const memberToMeetingLines: [number, number][][] = meetingPoint
    ? members.map(m => [[m.lat, m.lng], [meetingPoint.lat, meetingPoint.lng]])
    : [];

  const sharedRoute: [number, number][] = meetingPoint
    ? [[meetingPoint.lat, meetingPoint.lng], ...stops.map(s => [s.lat, s.lng] as [number, number])]
    : stops.map(s => [s.lat, s.lng] as [number, number]);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={12}
      zoomControl={false}
      attributionControl={false}
      className="w-full h-full bg-[#111]"
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={18}
      />

      <MapFitBounds members={members} stops={stops} meetingPoint={meetingPoint} />

      {/* Member → meeting point dashed lines */}
      {memberToMeetingLines.map((line, i) => (
        <Polyline
          key={`member-line-${i}`}
          positions={line}
          pathOptions={{ color: members[i].color, weight: 2, dashArray: '5, 8', opacity: 0.8 }}
        />
      ))}

      {/* Shared route solid line */}
      {sharedRoute.length > 1 && (
        <Polyline
          positions={sharedRoute}
          pathOptions={{ color: '#22c55e', weight: 3, dashArray: '6, 6', opacity: 0.7, lineJoin: 'round' }}
        />
      )}

      {/* Member pins */}
      {members.map((m, i) => (
        <MemberMarker key={`member-${i}`} m={m} />
      ))}

      {/* Meeting point */}
      {meetingPoint && (
        <MeetingMarker p={meetingPoint} />
      )}

      {/* Stop pins */}
      {stops.map((s, i) => (
        <StopMarker key={`stop-${s.id}`} s={s} i={i} />
      ))}
    </MapContainer>
  );
}
