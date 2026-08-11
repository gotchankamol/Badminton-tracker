import { getState } from "@/lib/get-state";
import { getSessionOrNull } from "@/lib/session";
import AppClient from "@/components/AppClient";
import GateScreen from "@/components/GateScreen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSessionOrNull();
  if (!session) return <GateScreen />;
  const state = await getState();
  return <AppClient initialState={state} session={{ nickname: session.nickname, isOwner: session.isOwner }} />;
}
