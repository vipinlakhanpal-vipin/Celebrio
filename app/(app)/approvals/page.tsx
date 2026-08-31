import { createClient } from "@/lib/supabase/server";
import { ApprovalsClient } from "@/components/approvals/ApprovalsClient";

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: approvals } = await supabase
    .from("approvals")
    .select("*, contact:contacts(*)")
    .eq("user_id", user!.id)
    .order("send_at", { ascending: true });

  return <ApprovalsClient initialApprovals={approvals || []} />;
}
