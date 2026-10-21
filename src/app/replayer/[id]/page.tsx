'use client';

import React, { use } from 'react';
import { ReplayEngine } from '../../../components/replay/ReplayEngine.tsx';

export interface ReplayerPageProps {
  params: Promise<{ id: string }>;
}

export default function ReplayerPage({ params }: ReplayerPageProps) {
  const resolved = use(params);
  const matchId = resolved.id;

  return <ReplayEngine matchId={matchId} />;
}
