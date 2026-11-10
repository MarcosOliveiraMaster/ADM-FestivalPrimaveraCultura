"use client";
/**
 * Geração do certificado em PDF (A4) e do QR code, no navegador.
 * As bibliotecas são carregadas só quando usadas (não pesam nas outras páginas).
 */

/** QR code (data URL PNG) com o link de validação. */
export async function qrDataUrl(text: string) {
  const QR = await import("qrcode");
  return QR.toDataURL(text, { margin: 0, width: 360, errorCorrectionLevel: "M", color: { dark: "#1f2a24", light: "#ffffff" } });
}

/** Espera fontes e imagens do elemento carregarem antes de "fotografar". */
async function ready(node: HTMLElement) {
  await document.fonts?.ready;
  const imgs = [...node.querySelectorAll("img")];
  await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => ((i.onload = r), (i.onerror = r))))));
  const bg = getComputedStyle(node).backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
  if (bg) await new Promise((r) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = r;
    im.onerror = r;
    im.src = bg;
  });
}

/** Converte o certificado desenhado (CertificateView) em PDF A4. */
export async function certificatePdf(node: HTMLElement, orientation: "landscape" | "portrait"): Promise<Blob> {
  await ready(node);
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const img = await toJpeg(node, { quality: 0.92, pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  const w = orientation === "landscape" ? 297 : 210;
  const h = orientation === "landscape" ? 210 : 297;
  pdf.addImage(img, "JPEG", 0, 0, w, h, undefined, "FAST");
  return pdf.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
