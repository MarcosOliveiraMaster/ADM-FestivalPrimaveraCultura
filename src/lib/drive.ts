import type { MediaItem, MediaKind } from "./media";

/**
 * Google Drive: arquivos ficam no Drive e são exibidos direto de lá (nada ocupa o armazenamento).
 * As pastas precisam estar compartilhadas como "Qualquer pessoa com o link".
 */

export interface DriveFolder {
  id: string;
  drive_id: string;
  name: string;
  url: string;
  file_count: number;
  last_upload_at: string | null;
  synced_at: string | null;
  created_at: string;
}

export interface DriveFile {
  id: string;
  folder_id: string;
  drive_id: string;
  name: string;
  mime: string;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  drive_created_at: string | null;
}

/** Dados de um arquivo como vêm da API do Drive (antes de salvar). */
export type DriveFileInput = Pick<DriveFile, "drive_id" | "name" | "mime" | "size_bytes" | "width" | "height" | "drive_created_at">;

/** Extrai o ID da pasta de um link do Drive (ou aceita o próprio ID). */
export function parseFolderId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/folders\/([\w-]{10,})/) ?? s.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{10,}$/.test(s) ? s : null;
}

export const folderUrl = (driveId: string) => `https://drive.google.com/drive/folders/${driveId}`;

/** Endereço usado no site: imagem servida pelo Google (até 2400px) ou visualizador do PDF. */
export function driveFileUrl(f: Pick<DriveFile, "drive_id" | "mime">) {
  return f.mime === "application/pdf" ? `https://drive.google.com/file/d/${f.drive_id}/view` : `https://lh3.googleusercontent.com/d/${f.drive_id}=w2400`;
}

/** Miniatura leve para a grade do painel. */
export function driveThumbUrl(f: Pick<DriveFile, "drive_id" | "mime">, size = 400) {
  return f.mime === "application/pdf"
    ? `https://drive.google.com/thumbnail?id=${f.drive_id}&sz=w${size}`
    : `https://lh3.googleusercontent.com/d/${f.drive_id}=w${size}`;
}

/** Formato exibido abaixo do nome (JPG, PNG, PDF…). */
export function fileFormat(f: Pick<DriveFile, "name" | "mime">) {
  const ext = f.name.includes(".") ? f.name.split(".").pop()! : "";
  if (ext && ext.length <= 5) return ext.toUpperCase();
  const sub = f.mime.split("/").pop() ?? "";
  return (sub === "jpeg" ? "jpg" : sub).toUpperCase();
}

export function driveMatchesKind(mime: string, kind: MediaKind) {
  if (kind === "any") return mime.startsWith("image/") || mime === "application/pdf";
  if (kind === "image") return mime.startsWith("image/");
  if (kind === "pdf") return mime === "application/pdf";
  return false;
}

/** Converte para o mesmo formato da biblioteca, para os seletores de mídia aceitarem igual. */
export function driveToMediaItem(f: DriveFile, folder: Pick<DriveFolder, "name">): MediaItem {
  return {
    id: `drive:${f.id}`,
    path: `drive/${folder.name}/${f.name}`,
    url: driveFileUrl(f),
    mime: f.mime,
    size_bytes: f.size_bytes,
    width: f.width,
    height: f.height,
    alt: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
    folder: folder.name,
    created_at: f.drive_created_at ?? new Date().toISOString(),
  };
}
