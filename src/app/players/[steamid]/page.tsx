import { redirect } from 'next/navigation';

export default async function PlayerProfilePage(props: {
  params: Promise<{ steamid: string }>;
}) {
  const { steamid } = await props.params;
  redirect(`/stats/player?steamId=${encodeURIComponent(steamid)}&tab=roles`);
}
