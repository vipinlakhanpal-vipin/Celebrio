import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { tab } = await searchParams;

  // Pending-approvals count is fetched here too (not just on the Dashboard)
  // so the "To approve" stat tile at the top of this page always matches
  // what's shown there — same source, same number.
  const [{ data: contacts }, { count: pendingApprovalCount }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user!.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("approvals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user!.id)
      .eq("status", "pending"),
  ]);

  return (
    <ContactsClient
      initialContacts={contacts || []}
      initialTab={tab}
      pendingApprovalCount={pendingApprovalCount ?? 0}
    />
  );
}
