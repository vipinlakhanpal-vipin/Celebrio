import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "@/components/contacts/ContactsClient";

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user!.id)
    .order("full_name", { ascending: true });

  return <ContactsClient initialContacts={contacts || []} />;
}
