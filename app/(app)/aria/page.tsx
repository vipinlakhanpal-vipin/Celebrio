import { createClient } from "@/lib/supabase/server";
import { AriaChatClient } from "@/components/aria/AriaChatClient";

export default async function AriaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: history } = await supabase
    .from("aria_messages")
    .select("role, content")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return (
    <AriaChatClient
      initialMessages={(history || []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))}
    />
  );
}
