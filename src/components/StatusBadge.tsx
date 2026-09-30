import type { PageStatus } from "@/shared/types";
import { currentTime, formatDateTime } from "@/shared/format";

export function StatusBadge({ status, publishAt }: { status: PageStatus; publishAt?: string | null }) {
  if (status === "published") return <span className="adm-badge bg-emerald-100 text-emerald-800">● Publicada</span>;
  if (status === "scheduled") {
    const live = publishAt && new Date(publishAt).getTime() <= currentTime();
    return live ? (
      <span className="adm-badge bg-emerald-100 text-emerald-800">● Publicada</span>
    ) : (
      <span className="adm-badge bg-sky-100 text-sky-800" title={formatDateTime(publishAt) ?? ""}>◷ Agendada {formatDateTime(publishAt)}</span>
    );
  }
  return <span className="adm-badge bg-zinc-100 text-zinc-700">○ Rascunho</span>;
}
