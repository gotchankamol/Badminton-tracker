import { getState } from "@/lib/get-state";
import PublicReportView from "@/components/PublicReportView";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const state = await getState();
  return <PublicReportView initialState={state} />;
}
