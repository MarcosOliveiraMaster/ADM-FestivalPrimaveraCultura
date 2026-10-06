import { formatDate } from "@/shared/format";
import type { AreaPageSummary } from "@/lib/registrations";

/** Lista de páginas (eventos ou capacitações) com contagem de inscrições. */
export function AreaPagesList({ pages, base, showAttended, empty }: { pages: AreaPageSummary[]; base: string; showAttended?: boolean; empty: string }) {
  if (!pages.length) return <div className="adm-card p-8 text-center text-sm text-zinc-500">{empty}</div>;
  return (
    <div className="adm-card overflow-x-auto">
      <table className="adm-table">
        <thead>
          <tr>
            <th>Página</th>
            <th className="hidden md:table-cell">Data</th>
            <th>Inscrições</th>
            {showAttended && <th>Presenças</th>}
            <th className="hidden sm:table-cell">Situação</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.id}>
              <td><a href={`${base}/${p.id}`} className="font-medium text-zinc-900 hover:text-brand-600">{p.title}</a></td>
              <td className="hidden text-sm text-zinc-500 md:table-cell">{formatDate(p.starts_at, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) ?? "—"}</td>
              <td className="font-semibold">{p.total}{p.capacity ? <span className="font-normal text-zinc-500"> / {p.capacity}</span> : null}</td>
              {showAttended && <td>{p.attended}</td>}
              <td className="hidden sm:table-cell">
                <span className={`adm-badge ${p.registration_enabled ? "bg-brand-50 text-brand-700" : "bg-zinc-100 text-zinc-600"}`}>{p.registration_enabled ? "Inscrições abertas" : "Inscrições fechadas"}</span>
                {p.status !== "published" && <span className="adm-badge ml-1 bg-amber-50 text-amber-700">não publicada</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
