import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { MediaLibrary } from "@/components/MediaLibrary";

export const metadata = { title: "Mídia" };

export default async function MediaPage() {
  await requireStaff();
  return (
    <>
      <PageHeader title="Biblioteca de mídia" description="Imagens, vídeos, PDFs e fontes usados no site. Na aba “Links do Google Drive”, adicione pastas públicas do Drive: as imagens e PDFs aparecem aqui sem ocupar o armazenamento." />
      <Container>
        <div className="adm-card p-5">
          <MediaLibrary />
        </div>
      </Container>
    </>
  );
}
