"use server";
import { requireStaff } from "@/lib/auth";
import { folderUrl, parseFolderId, type DriveFileInput } from "@/lib/drive";

const API = "https://www.googleapis.com/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

type Result = { ok: true; driveId: string; name: string; url: string; files: DriveFileInput[] } | { ok: false; error: string };

async function drive<T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.ok) return { ok: true, data: (await res.json()) as T };
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  return { ok: false, status: res.status, message: body?.error?.message ?? res.statusText };
}

/**
 * Lê no Google Drive a lista de imagens e PDFs de uma pasta pública (só o primeiro nível,
 * sem subpastas). Nada é baixado: só nome, tipo, tamanho e dimensões de cada arquivo.
 */
export async function fetchDriveFolder(link: string): Promise<Result> {
  await requireStaff();
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return { ok: false, error: "A chave da API do Google Drive (GOOGLE_DRIVE_API_KEY) não está configurada no servidor." };
  const id = parseFolderId(link);
  if (!id) return { ok: false, error: "Link inválido. Cole o link de uma pasta do Google Drive (drive.google.com/drive/folders/…)." };

  const common = `supportsAllDrives=true&key=${encodeURIComponent(key)}`;
  const meta = await drive<{ id: string; name: string; mimeType: string }>(`${API}/${id}?fields=id,name,mimeType&${common}`);
  if (!meta.ok) {
    if (meta.status === 404) return { ok: false, error: "Pasta não encontrada. Confira o link e se ela está compartilhada como “Qualquer pessoa com o link”." };
    if (meta.status === 403) return { ok: false, error: `O Google recusou o acesso: ${meta.message}` };
    return { ok: false, error: `Erro ao ler a pasta no Google Drive: ${meta.message}` };
  }
  if (meta.data.mimeType !== FOLDER_MIME) return { ok: false, error: "Este link é de um arquivo, não de uma pasta." };

  const q = `'${id}' in parents and trashed = false and (mimeType contains 'image/' or mimeType = 'application/pdf')`;
  const fields = "nextPageToken,files(id,name,mimeType,size,createdTime,imageMediaMetadata(width,height))";
  const files: DriveFileInput[] = [];
  let pageToken = "";
  do {
    const r = await drive<{
      nextPageToken?: string;
      files: { id: string; name: string; mimeType: string; size?: string; createdTime?: string; imageMediaMetadata?: { width?: number; height?: number } }[];
    }>(`${API}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000&orderBy=name&includeItemsFromAllDrives=true&${common}${pageToken ? `&pageToken=${pageToken}` : ""}`);
    if (!r.ok) return { ok: false, error: `Erro ao listar a pasta: ${r.message}` };
    for (const f of r.data.files) {
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
  } while (pageToken && files.length < 5000);

  return { ok: true, driveId: id, name: meta.data.name, url: folderUrl(id), files };
}
