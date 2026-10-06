import { requireAdmin } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { formatBytes } from "@/lib/media";
import { StorageManager, type StorageFile } from "./StorageManager";

export const metadata = { title: "Armazenamento" };

// Referência do plano gratuito do Supabase (ajuste se o plano mudar).
const LIMITS = { database: 500 * 1024 * 1024, storage: 1024 * 1024 * 1024 };

interface Report {
  database_bytes: number;
  storage_bytes: number;
  storage_files: number;
  by_type: { type: string; files: number; bytes: number }[];
  by_folder: { folder: string; files: number; bytes: number }[];
  orphans: { files: number; bytes: number };
  tables: { table: string; rows: number; bytes: number }[];
}

const TABLE_LABEL: Record<string, string> = {
  pages: "Páginas", page_drafts: "Rascunhos", page_versions: "Versões de páginas", media: "Cadastro de mídia", form_submissions: "Formulários de interesse",
  page_views: "Visitas (métricas)", click_events: "Cliques (métricas)", registrations: "Inscrições em eventos", training_registrations: "Inscrições em capacitações",
  profiles: "Equipe", staff_invites: "Convites", site_settings: "Configurações",
};

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(100, (used / limit) * 100);
  const color = pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className="adm-card flex flex-col gap-2 p-5">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold">{formatBytes(used) || "0 KB"} <span className="text-sm font-normal text-zinc-500">de {formatBytes(limit)}</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full ${color}`} style={{ width: `${Math.max(pct, 1)}%` }} />
      </div>
      <div className="text-xs text-zinc-500">{pct.toFixed(1)}% usado</div>
    </div>
  );
}

export default async function StoragePage() {
  const { supabase } = await requireAdmin();
  const [{ data: report }, { data: media }, { data: pages }, { data: drafts }, { data: settings }] = await Promise.all([
    supabase.rpc("admin_storage_report"),
    supabase.from("media").select("id, path, url, mime, size_bytes, alt, folder, created_at").order("size_bytes", { ascending: false, nullsFirst: false }),
    supabase.from("pages").select("content, cover_url, seo"),
    supabase.from("page_drafts").select("content"),
    supabase.from("site_settings").select("brand, theme").eq("id", 1).maybeSingle(),
  ]);
  const r = report as Report | null;
  // Um arquivo está "em uso" se o caminho dele aparece em alguma página (publicada ou rascunho) ou nas configurações.
  const haystack = JSON.stringify([pages, drafts, settings]);
  const files: StorageFile[] = (media ?? []).map((m) => ({ ...m, used: haystack.includes(m.path) }));
  const unused = files.filter((f) => !f.used);

  return (
    <>
      <PageHeader title="Armazenamento" description="Quanto espaço o site está usando no servidor (arquivos de mídia e banco de dados) e o que ocupa mais espaço." />
      <Container className="flex flex-col gap-6">
        {!r ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Não foi possível carregar o relatório.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Meter label="Arquivos de mídia" used={r.storage_bytes} limit={LIMITS.storage} />
              <Meter label="Banco de dados" used={r.database_bytes} limit={LIMITS.database} />
              <div className="adm-card flex flex-col gap-1 p-5">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Arquivos</div>
                <div className="text-2xl font-semibold">{r.storage_files}</div>
                <div className="text-sm text-zinc-500">{unused.length} sem uso no site ({formatBytes(unused.reduce((s, f) => s + (f.size_bytes ?? 0), 0)) || "0 KB"})</div>
                {r.orphans.files > 0 && <div className="text-xs text-amber-700">{r.orphans.files} arquivo(s) no servidor sem cadastro ({formatBytes(r.orphans.bytes)})</div>}
              </div>
            </div>
            <p className="-mt-3 text-xs text-zinc-500">Limites de referência do plano gratuito do Supabase (1 GB de arquivos e 500 MB de banco). O tráfego de download (banda) é acompanhado no painel do Supabase → Usage.</p>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="adm-card overflow-hidden">
                <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Por tipo de arquivo</div>
                <table className="adm-table"><tbody>
                  {r.by_type.map((t) => <tr key={t.type}><td>{t.type}</td><td className="text-zinc-500">{t.files} arq.</td><td className="text-right font-medium">{formatBytes(t.bytes) || "0 KB"}</td></tr>)}
                </tbody></table>
              </div>
              <div className="adm-card overflow-hidden">
                <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Por pasta</div>
                <table className="adm-table"><tbody>
                  {r.by_folder.map((f) => <tr key={f.folder}><td>{f.folder}</td><td className="text-zinc-500">{f.files} arq.</td><td className="text-right font-medium">{formatBytes(f.bytes) || "0 KB"}</td></tr>)}
                </tbody></table>
              </div>
              <div className="adm-card overflow-hidden">
                <div className="border-b border-zinc-200 px-4 py-3 text-sm font-semibold">Banco de dados (dados)</div>
                <table className="adm-table"><tbody>
                  {r.tables.map((t) => <tr key={t.table}><td>{TABLE_LABEL[t.table] ?? t.table}</td><td className="text-zinc-500">{t.rows} reg.</td><td className="text-right font-medium">{formatBytes(t.bytes) || "0 KB"}</td></tr>)}
                </tbody></table>
              </div>
            </div>
          </>
        )}
        <StorageManager files={files} />
      </Container>
    </>
  );
}
