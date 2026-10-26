import React from 'react';
import type { Metadata } from 'next';
import { Tactical2DReplayDashboard } from '../../components/telemetry/Tactical2DReplayDashboard';
import { mockTelemetryData } from '../../data/mockTelemetryData';

export const metadata: Metadata = {
  title: '2D Tactical Map // CS2 Telemetry Replay',
  description:
    'Flight deck de telemetria tática 2D e replay espacial millimétrico de Counter-Strike 2.',
};

export default function TacticalMapPage() {
  return <Tactical2DReplayDashboard initialData={mockTelemetryData} />;
}
