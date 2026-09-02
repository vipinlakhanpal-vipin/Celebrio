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

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user!.id)
    .order("full_name", { ascending: true });

  return <ContactsClient initialContacts={contacts || []} initialTab={tab} />;
}
