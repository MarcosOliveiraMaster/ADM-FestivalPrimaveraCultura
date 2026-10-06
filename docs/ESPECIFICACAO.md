# Festival da Primavera — Especificação de Funcionalidades

> Documento vivo. Define **o que** o sistema faz antes de escrevermos código.
> Mesma cópia em `FestivalPrimaveraCultura/docs/` e `ADM-FestivalPrimaveraCultura/docs/`.

## 1. Visão geral

Dois sites, um banco de dados em comum:

| Repositório | Público | Função |
|---|---|---|
| `FestivalPrimaveraCultura` | Visitantes | Landing page do festival + páginas de eventos. Só **lê** conteúdo publicado e **envia** formulários e métricas. |
| `ADM-FestivalPrimaveraCultura` | Equipe (login) | Painel para editar a landing, criar páginas de evento, ver inscritos e métricas. |

```
 Visitante ──► Site público (Next.js) ──┐
                                        ├──► Supabase (Postgres + Auth + Storage)
 Equipe ────► Painel ADM (Next.js) ─────┘
                   │
                   └── ao publicar ──► avisa o site público para atualizar (revalidate)
```

**Tecnologia:** Next.js (App Router) + TypeScript + Tailwind CSS · Supabase (banco, login, upload de imagens, regras de acesso RLS) · Tiptap (editor de texto rico) · dnd-kit (arrastar e soltar) · Hospedagem na Vercel (um projeto por repositório).

**Endereços:** enquanto não houver domínio, cada site usa o endereço gratuito da Vercel (ex.: `festival-da-primavera.vercel.app` e `adm-festival-da-primavera.vercel.app`). O domínio próprio entra depois sem mudar código.

**Nome do evento:** Festival da Primavera. Local, datas e horários: **a definir** (o site mostra "Em breve" enquanto os campos estiverem vazios).

---

## 2. Site público (`FestivalPrimaveraCultura`)

### 2.1 Navegação (NAV)
- Itens: **Início**, **Sobre**, **Eventos** (menu suspenso), **Contato** — nomes, ordem e visibilidade editáveis no ADM.
- **Eventos** lista automaticamente todas as páginas de evento **publicadas**, na ordem definida pelo ADM (ou por data).
- Página `/eventos` com todos os eventos em cards (capa, título, data, local), com filtro por data/categoria.
- Menu responsivo (hambúrguer no celular).

### 2.2 Landing page (Início)
A home é montada com o **mesmo editor de blocos** das páginas de evento, então tudo nela é editável. Modelo inicial sugerido:
1. **Hero** — "Festival da Primavera", data ("em breve" até ser definida), frase, imagem/vídeo de fundo, botão "Quero participar".
2. **Contagem regressiva** até o festival (fica oculta enquanto a data não for definida).
3. **Sobre** o festival.
4. **Programação** — bloco automático com os próximos eventos.
5. **Galeria** de fotos.
6. **Patrocinadores / apoiadores** (logos com link).
7. **Formulário de interesse**.
8. **Rodapé** — contatos, redes sociais, endereço (editável em Configurações).

### 2.3 Páginas de evento
- URL amigável: `/eventos/<slug>` (ex.: `/eventos/show-de-abertura`).
- Renderiza as seções e blocos criados no ADM.
- SEO por página: título, descrição e imagem de compartilhamento (WhatsApp/Instagram/Facebook).
- Botão "Adicionar à agenda" (Google Agenda / arquivo .ics) quando a página tem data.

### 2.4 Coleta (sem pedir nada ao visitante)
- Registro de visita por página e cliques em eventos/botões (ver §5).
- Formulários enviam para o banco com proteção anti-spam (campo oculto + limite por IP).

---

## 3. Painel ADM (`ADM-FestivalPrimaveraCultura`)

### 3.1 Acesso e papéis
Login com e-mail e senha (Supabase Auth), recuperação de senha por e-mail. Não há cadastro aberto: um Admin convida os membros.

| Permissão | Admin | Editor |
|---|:-:|:-:|
| Criar / editar / reordenar páginas e blocos | ✅ | ✅ |
| Publicar / despublicar páginas | ✅ | ✅ |
| Excluir páginas | ✅ | ❌ |
| Biblioteca de mídia (upload) | ✅ | ✅ |
| Configurações do site (NAV, rodapé, cores, logo) | ✅ | ❌ |
| Ver inscritos / formulários e exportar CSV | ✅ | ❌ |
| Ver métricas | ✅ | ❌ |
| Gerenciar usuários (convidar, mudar papel, remover) | ✅ | ❌ |

As permissões são aplicadas **no banco** (RLS), não só na tela.

### 3.2 Páginas (área "Eventos")
- Lista de páginas: título, status (**Rascunho** / **Publicada** / **Agendada**), data do evento, última edição e quem editou.
- Ações: criar, duplicar, renomear, alterar slug, reordenar (arrastar), publicar, despublicar, excluir.
- Criar a partir de **modelo**: em branco, "Show", "Oficina", "Exposição" (modelos prontos de seções).
- Dados da página: título, slug, categoria, data/hora de início e fim, local, imagem de capa, "mostrar no menu Eventos" (sim/não), SEO.
- **Agendar publicação** para data/hora futura.
- **Pré-visualizar** antes de publicar (link privado).
- **Histórico de versões**: cada publicação guarda uma versão, que pode ser restaurada.

### 3.3 Editor visual (seções + blocos, estilo Google Sites melhorado)

**Seções** (faixas horizontais da página):
- Adicionar, duplicar, remover e reordenar (arrastar).
- **Layout de colunas**: 1, 2 (50/50, 33/66, 66/33), 3 ou 4 colunas; empilha automaticamente no celular.
- **Fundo**: cor, gradiente, imagem ou vídeo, com sobreposição escura ajustável.
- **Largura**: contida ou tela cheia · **Espaçamento**: P / M / G · **Alinhamento** vertical e horizontal.
- **Âncora** (ex.: `#programacao`) para links do menu.
- Ocultar no celular ou no computador.
- **Divisor em onda** no topo e/ou na base, com cor escolhida e opção de movimento lento.

**Blocos** (vão dentro das colunas):

| Bloco | O que faz |
|---|---|
| Título | H1–H3, alinhamento, cor |
| Texto rico | Negrito, itálico, sublinhado, listas, citações, links, cores, tamanhos, alinhamento |
| Imagem | Upload ou biblioteca, legenda, link opcional, recorte/proporção |
| Galeria / carrossel | Várias imagens em grade ou slides, com ampliação ao clicar |
| Vídeo | Colar link do YouTube, Vimeo ou Instagram e incorporar automaticamente; opção de reprodução automática (sempre sem som, regra dos navegadores) e loop |
| Botão | Texto + link, estilos (primário/secundário/contorno), abrir em nova aba |
| Lista de links | Links com **título** e descrição opcional (ex.: "Ingressos", "Regulamento PDF") |
| Data, hora e local | Agenda + endereço + mapa do Google + "adicionar à agenda" |
| Formulário de interesse | Formulário vinculado à página (ver §4) |
| Programação automática | Lista os próximos eventos publicados |
| Contagem regressiva | Até uma data escolhida |
| Perguntas frequentes (FAQ) | Lista de perguntas e respostas escritas no painel; expansíveis, com opção de primeira aberta e de abrir uma por vez; gera dados estruturados de FAQ para o Google |
| Notícias | Cards só com título, subtítulo e imagem (e veículo/data opcionais); o clique abre a matéria externa em nova aba; primeira notícia em destaque, estilo portal |
| Logos / patrocinadores | Grade de logos com links |
| Espaçador / divisor | Respiro visual (linha, pontos, ícone da marca ou onda) |

Comportamento do editor:
- Pré-visualização ao vivo em **desktop / tablet / celular**.
- Salvamento automático do rascunho, com desfazer e refazer.
- Tema global (cores, fontes, logo) aplicado em todas as páginas, com ajuste por seção.

### 3.4 Biblioteca de mídia
- Upload de imagens (com compressão e redimensionamento automático) e PDFs.
- Pastas / busca, texto alternativo (acessibilidade), mostra onde cada arquivo está em uso.

### 3.5 Configurações do site (Admin)
Nome do festival, local, datas e horários, itens do NAV, rodapé, redes sociais, textos de LGPD/privacidade.

### 3.6 Identidade visual (espaços para upload)
A identidade (logo, fontes, cores) será criada depois. O sistema nasce com **espaços reservados** que mostram um visual neutro provisório até o upload:

| Espaço | Onde aparece | Formato sugerido |
|---|---|---|
| Logo principal | NAV, rodapé | SVG ou PNG transparente |
| Logo versão clara | Sobre fundos escuros/imagens | SVG ou PNG transparente |
| Ícone / favicon | Aba do navegador, atalho no celular | PNG 512×512 |
| Imagem de compartilhamento padrão | Prévia em WhatsApp/Instagram/Facebook | 1200×630 |
| Capa da landing (hero) | Topo da página inicial | 1920×1080 (imagem ou vídeo) |
| Capa padrão de evento | Cards e topo de eventos sem capa própria | 1600×900 |
| Fontes (títulos e textos) | Site inteiro | Arquivo .woff2 ou escolha no Google Fonts |
| Paleta de cores | Botões, fundos, destaques | Primária, secundária, destaque, fundo, texto |

Cada página e seção também tem seus próprios campos de capa/imagem, todos pela biblioteca de mídia.

---

## 4. Formulário de interesse

**Campos padrão:** nome, e-mail, WhatsApp, cidade, evento(s) de interesse, como conheceu o festival, mensagem, **consentimento LGPD** (obrigatório) e aceite para receber novidades (opcional).
- Cada formulário pode ativar/desativar campos e mudar a mensagem de agradecimento.
- Cada resposta guarda automaticamente: página de origem, data e origem da visita (UTM / referência).

**No ADM (Admin):**
- Tabela de inscritos com busca e filtros (evento, data, cidade, status).
- **Status de atendimento**: Novo → Contatado → Confirmado / Descartado, com observações internas.
- **Exportar CSV/Excel** (tudo ou filtrado).
- **Sem e-mails de aviso**: as respostas são vistas **somente dentro do ADM**, com contador de "novos" no menu e destaque no painel inicial.
- Botão de WhatsApp direto para o contato.
- Excluir dados de um inscrito a pedido dele (LGPD).

---

## 5. Métricas (dashboard do ADM)

Coleta própria no Supabase, **sem cookies de rastreamento** (sessão anônima por hash diário), o que dispensa banner de cookies.

| Indicador | Detalhe |
|---|---|
| Visitas | Total, visitantes únicos, gráfico por dia; filtro 7 / 30 / 90 dias ou período livre |
| Páginas mais vistas | Ranking da landing e de cada evento |
| Cliques por evento | Cliques nos cards/links de cada evento e nos botões (ingresso, WhatsApp…) |
| Inscrições | Total, por dia e por evento |
| **Conversão** | % de visitantes que enviaram o formulário, por página |
| Origem | Instagram, WhatsApp, Google, direto, campanhas (UTM) |
| Dispositivo | Celular × computador |
| Cidades dos inscritos | Ranking a partir do formulário |

Extras: gerador de link com UTM (ex.: link específico para a bio do Instagram) e exportação dos números em CSV.

---

## 6. Modelo de dados (Supabase)

| Tabela | Campos principais |
|---|---|
| `profiles` | id (= usuário), nome, papel (`admin` / `editor`) |
| `site_settings` | registro único: nome, tema, nav, rodapé, redes, e-mails de aviso |
| `pages` | id, slug, título, tipo (`home` / `evento` / `institucional`), status, publicar_em, categoria, data início/fim, local, capa, mostrar_no_menu, ordem, seo, `content` (JSON de seções e blocos), rascunho, autor, datas |
| `page_versions` | id, page_id, content, publicado_por, data |
| `media` | id, caminho no Storage, tipo, tamanho, texto alternativo, pasta |
| `form_submissions` | id, page_id, campos, consentimento, utm/origem, status, observações, data |
| `page_views` | id, page_id, caminho, referência, utm, dispositivo, hash_sessao, data |
| `click_events` | id, page_id, alvo, data |

Regras de acesso (RLS): visitante anônimo **lê** páginas publicadas e **insere** em formulários/visitas/cliques; Editor edita páginas e mídia; Admin tem acesso total.

---

## 7. Fases de entrega

1. **Fundação** — Next.js nos dois repositórios, projeto Supabase, tabelas, RLS, login e papéis.
2. **Editor** — páginas, seções, blocos, mídia, rascunho/publicação.
3. **Site público** — renderização das páginas, NAV com Eventos, landing, SEO.
4. **Formulários** — envio, lista de inscritos, status, CSV, aviso por e-mail.
5. **Métricas** — coleta e dashboard.
6. **Refinos** — versões, agendamento, modelos de página, deploy na Vercel com domínios.

---

## 8. Situação

**Protótipo pronto (fases 1 a 6):** banco com RLS, login e papéis, editor visual, mídia, site público, formulários, métricas, configurações e usuários.

- [x] Banco: Supabase (projeto “LadingPage - Festival Primavera”) · Hospedagem: Vercel
- [x] Nome: **Festival da Primavera**
- [x] Formulários vistos só no ADM (sem e-mail de aviso)
- [x] Primeiro admin convidado: marcos.lucas.ti@gmail.com
- [ ] Conectar o GitHub à conta da Vercel (necessário para publicar)
- [ ] Supabase → Authentication → URL Configuration apontando para o endereço do ADM
- [ ] Local, datas e horários do festival (preencher em Configurações)
- [ ] Identidade visual: logo, cores, fontes (upload em Configurações → Identidade visual)
- [ ] Domínio próprio

**Fora do protótipo (próximas melhorias sugeridas):** link privado de pré-visualização para pessoas sem login, “onde este arquivo é usado” na biblioteca de mídia, arrastar blocos entre colunas diferentes (hoje: seletor “mover para coluna”).

---

## 9. Checklist de atualizações (reunião de 05/10 + pedidos de 06/10)

**Usuários e inscrições**
- [x] Área de login de usuários (site: /entrar, /minha-conta)
- [x] Login social (Google) — falta ativar o provedor Google no Supabase
- [x] Área de inscrição de eventos (bloco “Inscrição no evento”, vagas, cancelamento)
- [x] E-mail de confirmação ao receber inscrição (Edge Function `confirmar-inscricao`) — falta a chave do Resend
- [x] Google Agenda após inscrição (botão, link no e-mail e arquivo .ics)
- [x] Área de certificados (presença marcada em Participantes → certificado com código de validação)

**Equipe (ADM)**
- [x] Domínios: login.festivalprimaveracultural.com.br (entrada) → adm.festivalprimaveracultural.com.br (painel)
- [x] Convite com link único (token) válido por 1 hora, enviado por e-mail; e-mail já reconhecido; sem token não é possível criar conta

**Conteúdo**
- [x] Notícias (bloco com link externo)
- [x] Galeria exclusiva (seção “só logados”)
- [x] Vídeo com reprodução automática sem som
- [x] Rodapé: canal da OXE (provisório LinkCanalOxe.com.br)
- [x] FAQ (perguntas e respostas editáveis)
- [x] Hero carrossel (fundo da seção “Carrossel de imagens”)
- [x] Cortejos e Capacitações (mesma dinâmica de Eventos: páginas, listagem, menu)
- [x] Galeria: remover fotos individualmente ou todas (ADM → bloco Galeria)
- [x] ADM → Armazenamento: consumo de arquivos e banco (com limites do plano), por tipo/pasta/tabela, todas as mídias com “em uso/sem uso” e exclusão em lote
- [x] Inscrição em capacitação sem login (nome, e-mail, telefone) + e-mail de confirmação; acompanhamento em ADM → Capacitações

**Visual e layout**
- [x] Opções de capa (ADM → Opções de capa)
- [x] Divisores em onda / efeito onda
- [x] Cor própria para cada página (Configurações da página)
- [ ] Referência visual: site “Cada Minuto” (Ricardo Mota)

**SEO**
- [x] Domínio próprio: festivalprimaveracultural.com.br
- [ ] Revisar títulos e descrições de cada página (campos em Configurações da página)

**Fluxo de aprovação**
1. [ ] Definir funções
2. [ ] Aplicar copy
3. [ ] Reunião de aprovação
4. [ ] Definir novas mídias

**Configurações externas pendentes (fora do código)**
- [ ] Resend: criar conta, verificar o domínio e cadastrar os segredos `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `LOGIN_URL` no Supabase (Edge Functions → Secrets)
- [ ] Supabase → Authentication → URL Configuration: Site URL e Redirect URLs dos três domínios
- [ ] Supabase → Authentication → Providers → Google

> Observação: navegadores só reproduzem vídeo automaticamente se ele estiver sem som; por isso o vídeo da edição anterior inicia mudo.
