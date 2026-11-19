import { getAdminWorkspace } from "@/lib/admin-workspace";
import { ManagementDashboard } from "@/components/management/dashboard";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const data = await getAdminWorkspace((await searchParams).month);
  return <ManagementDashboard data={data} />;
}
