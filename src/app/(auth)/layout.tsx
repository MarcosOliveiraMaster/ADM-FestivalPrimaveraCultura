import { createClient } from "@/lib/supabase/server";
import { BrandIcon } from "@/shared/render/BrandIcon";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("brand, festival_name").eq("id", 1).maybeSingle();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandIcon url={data?.brand?.icon_url} className="h-12" />
          <div className="mt-1 text-lg font-semibold text-zinc-900">{data?.festival_name ?? "Festival da Primavera"}</div>
          <div className="text-sm text-zinc-500">Painel administrativo</div>
        </div>
        <div className="adm-card p-6">{children}</div>
      </div>
    </div>
  );
}
