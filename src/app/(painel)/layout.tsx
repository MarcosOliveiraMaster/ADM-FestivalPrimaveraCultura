import { requireStaff } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { SITE_URL } from "@/lib/supabase/env";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireStaff();
  let newCount = 0;
  if (profile.role === "admin") {
    const { count } = await supabase.from("form_submissions").select("id", { count: "exact", head: true }).eq("status", "novo");
    newCount = count ?? 0;
  }
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar role={profile.role} name={profile.full_name || profile.email.split("@")[0]} email={profile.email} newCount={newCount} siteUrl={SITE_URL} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
