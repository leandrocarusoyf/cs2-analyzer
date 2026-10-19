'use client';

import React, { use } from 'react';
import { ReplayEngine } from '../../../components/replay/ReplayEngine.tsx';

export interface ReplayerPageProps {
  params: Promise<{ id: string }>;
}

export default function ReplayerPage({ params }: ReplayerPageProps) {
  const resolved = use(params);
  const matchId = resolved?.id ?? '54e43847-2490-4751-9981-831bf7cf367c';

  return <ReplayEngine matchId={matchId} />;
}
