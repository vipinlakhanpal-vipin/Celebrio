import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NavBar } from "@/components/NavBar";

// Fetches just the pending-approvals badge count, on its own — wrapped in
// the <Suspense> boundary below so this one query can never hold up the
// rest of the page. Previously this query ran inline in the layout itself,
// before `children` (the dashboard/contacts/etc. page) was returned — which
// meant every navigation waited for this query to finish *and then* waited
// for the page's own queries, one after another, instead of both starting
// at the same time. Splitting it out lets the page's content start loading
// immediately while the badge count streams in alongside it.
async function NavBarWithBadge({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { count } = await supabase
    .from("approvals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  return <NavBar pendingCount={count ?? 0} />;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-svh flex-col">
        {/* Falls back to a badge-less NavBar the instant the shell is ready,
            then swaps in the real count as soon as the query resolves —
            instead of making the whole page wait on it. */}
        <Suspense fallback={<NavBar pendingCount={0} />}>
          <NavBarWithBadge userId={user.id} />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
    </ThemeProvider>
  );
}
