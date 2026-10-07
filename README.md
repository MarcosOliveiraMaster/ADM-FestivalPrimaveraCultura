# Festival da Primavera — painel ADM

Painel da equipe para editar o site público ([FestivalPrimaveraCultura](https://github.com/MarcosOliveiraMaster/FestivalPrimaveraCultura)): páginas e eventos com editor visual, mídia, inscritos, métricas, configurações e usuários.

- **Next.js 16** (App Router) + Tailwind CSS 4 + Supabase (Auth, Postgres com RLS, Storage)
- Editor: Tiptap (texto rico) + dnd-kit (arrastar e soltar)
- Especificação completa: [`docs/ESPECIFICACAO.md`](docs/ESPECIFICACAO.md)

## Áreas

| Rota | Quem acessa | Função |
|---|---|---|
| `/` | todos | Resumo, primeiros passos, últimos inscritos |
| `/paginas` | todos | Lista, cria, duplica, reordena, publica páginas |
| `/paginas/<id>` | todos | Editor visual (seções + blocos, rascunho automático, versões, agendamento) |
| `/midia` | todos | Biblioteca de imagens, vídeos, PDFs e fontes |
| `/inscritos` | admin | Formulários recebidos, status, observações, exportação CSV |
| `/metricas` | admin | Visitas, cliques, origem, conversão, gerador de links UTM |
| `/configuracoes` | admin | Dados do festival, identidade visual, cores/fontes, menu, rodapé |
| `/usuarios` | admin | Convites e papéis (Admin / Editor) |

## Acesso da equipe

Não há cadastro aberto. Um admin convida o e-mail em **Usuários**; a pessoa entra em `/primeiro-acesso`, cria a senha e confirma pelo e-mail. O perfil só é criado se o e-mail tiver convite (gatilho no banco). O primeiro admin (`marcos.lucas.ti@gmail.com`) já está convidado.

## Banco de dados

As migrações aplicadas no projeto Supabase estão em [`supabase/migrations/`](supabase/migrations). Todas as permissões são garantidas por RLS no banco, não só na interface.

## Configuração do Supabase (uma vez)

Em **Authentication → URL Configuration** do projeto Supabase:
- **Site URL**: endereço deste painel (ex.: `https://adm-festival-da-primavera.vercel.app`)
- **Redirect URLs**: `https://adm-festival-da-primavera.vercel.app/**` (e `http://localhost:3001/**` para desenvolvimento)

Sem isso, os links de confirmação e de recuperação de senha enviados por e-mail não voltam para o painel.

## Rodar localmente

```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3001 (o site público roda na 3000)
```

## Código compartilhado

`src/shared/` é idêntico ao do site público (renderizador usado na pré-visualização). Ao alterar, copie a pasta para o outro repositório.
