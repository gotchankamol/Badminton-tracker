import { getState } from "@/lib/get-state";
import AppClient from "@/components/AppClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getState();
  return <AppClient initialState={state} />;
}
