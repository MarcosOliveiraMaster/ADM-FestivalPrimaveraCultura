import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { folderUrl, parseFolderId, type DriveFileInput, type DriveReadResult } from "@/lib/drive";

const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** A chave vai no cabeçalho X-Goog-Api-Key (não na URL), para não aparecer em logs. */
async function drive<T>(url: string, key: string): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(url, { cache: "no-store", headers: { "X-Goog-Api-Key": key } });
  if (res.ok) return { ok: true, data: (await res.json()) as T };
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return { ok: false, status: res.status, message: body?.error?.message ?? res.statusText };
}

const fail = (error: string, status = 200) => NextResponse.json({ ok: false, error } satisfies DriveReadResult, { status });

/**
 * GET /midia/drive?link=<link ou id>&sub=1
 * Lê UMA pasta pública do Google Drive: imagens e PDFs dela e, com sub=1, também a lista
 * de subpastas (sem entrar nelas — quem percorre a árvore é o navegador, várias em paralelo).
 * Atalhos do Drive são ignorados. Nada é baixado: só nome, tipo, tamanho e dimensões.
 */
export async function GET(req: NextRequest) {
  const { user, profile } = await getSession();
  if (!user || !profile) return fail("Sessão expirada. Entre novamente.", 401);

  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return fail("A chave da API do Google Drive (GOOGLE_DRIVE_API_KEY) não está configurada no servidor.");
  const id = parseFolderId(req.nextUrl.searchParams.get("link") ?? "");
  if (!id) return fail("Link inválido. Cole o link de uma pasta do Google Drive (drive.google.com/drive/folders/…).");
  const withSub = req.nextUrl.searchParams.get("sub") === "1";

  const common = "supportsAllDrives=true";
  const meta = await drive<{ id: string; name: string; mimeType: string }>(`${API}/${id}?fields=id,name,mimeType&${common}`, key);
  if (!meta.ok) {
    if (meta.status === 404) return fail("Pasta não encontrada. Confira o link e se ela está compartilhada como “Qualquer pessoa com o link”.");
    if (meta.status === 400 && /api key/i.test(meta.message)) return fail("A chave da API do Google Drive é inválida. Confira GOOGLE_DRIVE_API_KEY no servidor.");
    if (meta.status === 403) return fail(`O Google recusou o acesso: ${meta.message}`);
    return fail(`Erro ao ler a pasta no Google Drive: ${meta.message}`);
  }
  if (meta.data.mimeType !== FOLDER_MIME) return fail("Este link é de um arquivo, não de uma pasta.");

  const types = `mimeType contains 'image/' or mimeType = 'application/pdf'${withSub ? ` or mimeType = '${FOLDER_MIME}'` : ""}`;
  const q = `'${id}' in parents and trashed = false and (${types})`;
  const fields = "nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata(width,height))";
  const files: DriveFileInput[] = [];
  const subfolders: { id: string; name: string }[] = [];
  let pageToken = "";
  do {
    const r = await drive<{
      nextPageToken?: string;
      files: { id: string; name: string; mimeType: string; size?: string; createdTime?: string; imageMediaMetadata?: { width?: number; height?: number } }[];
    }>(`${API}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name&includeItemsFromAllDrives=true&${common}${pageToken ? `&pageToken=${pageToken}` : ""}`, key);
    if (!r.ok) return fail(`Erro ao listar “${meta.data.name}”: ${r.message}`);
    for (const f of r.data.files) {
      if (f.mimeType === FOLDER_MIME) {
        subfolders.push({ id: f.id, name: f.name });
        continue;
      }
      files.push({
        drive_id: f.id,
        name: f.name,
        mime: f.mimeType,
        size_bytes: f.size ? Number(f.size) : null,
        width: f.imageMediaMetadata?.width ?? null,
        height: f.imageMediaMetadata?.height ?? null,
        drive_created_at: f.createdTime ?? null,
      });
    }
    pageToken = r.data.nextPageToken ?? "";
  } while (pageToken && files.length < 20000);

  return NextResponse.json({ ok: true, driveId: id, name: meta.data.name, url: folderUrl(id), files, subfolders } satisfies DriveReadResult);
}
