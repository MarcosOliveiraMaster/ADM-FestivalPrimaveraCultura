import { requireStaff } from "@/lib/auth";
import { PageHeader, Container } from "@/components/PageHeader";
import { MediaLibrary } from "@/components/MediaLibrary";

export const metadata = { title: "Mídia" };

export default async function MediaPage() {
  await requireStaff();
  return (
    <>
      <PageHeader title="Biblioteca de mídia" description="Imagens, vídeos, PDFs e fontes usados no site. Clique em um arquivo para editar o texto alternativo, mudar de pasta ou excluir." />
      <Container>
        <div className="adm-card p-5">
          <MediaLibrary />
        </div>
      </Container>
    </>
  );
}
