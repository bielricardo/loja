# Central de Vendas: guia de instalação

Você vai ter dois endereços:

- **Catálogo público:** `https://SEU-USUARIO.github.io/loja/`
- **Seu painel (com senha):** `https://SEU-USUARIO.github.io/loja/admin.html`

Tempo total: umas 2 noites de 30 a 40 minutos. Tudo é gratuito.

---

## NOITE 1: Supabase (o "banco" que guarda produtos e fotos)

### 1. Criar a conta e o projeto

1. Acesse **supabase.com** e clique em **Start your project**. Entre com a sua conta do **GitHub** (é o mais rápido).
2. Clique em **New project** e preencha:
   - **Name:** `central-de-vendas`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha** (você quase não vai usar, mas guarde).
   - **Region:** `South America (São Paulo)`
   - **Plan:** Free
3. Clique em **Create new project** e espere uns 2 minutos até terminar.

### 2. Criar as tabelas (colar o script)

1. No menu da esquerda, clique em **SQL Editor** (ícone `>_`).
2. Clique em **+ New query**.
3. Abra o arquivo **`supabase/schema.sql`** (desta pasta) no Bloco de Notas, copie **tudo** (Ctrl+A, Ctrl+C) e cole no editor.
4. Clique em **Run** (ou Ctrl+Enter).
5. Deve aparecer **"Success. No rows returned"**. Se aparecer um aviso sobre "destructive operation", pode confirmar: o script não apaga nada seu.

Isso cria as tabelas de produtos e categorias, a pasta de fotos e as regras de segurança (o custo nunca aparece para o público).

### 3. Criar o SEU login

1. Menu da esquerda: **Authentication**, depois **Users**.
2. Clique em **Add user** e depois em **Create new user**.
3. Coloque seu e-mail e uma senha forte. Marque **Auto Confirm User**.
4. Clique em **Create user**.

### 4. Bloquear cadastro de estranhos (importante!)

1. Ainda em **Authentication**, abra **Sign In / Providers** (em algumas versões fica em *Providers*, depois *Email*, ou em *Settings*).
2. **Desligue** a opção **"Allow new users to sign up"** e clique em **Save**.

Assim, só o usuário que você criou consegue entrar no painel.

### 5. Copiar as duas chaves

1. Clique em **Project Settings** (engrenagem, lá embaixo à esquerda) e depois em **API Keys**. Em algumas versões também aparece como **Data API** ou num botão **Connect** no topo.
2. Copie e guarde num bloco de notas:
   - **Project URL**: algo como `https://abcdefgh.supabase.co`
   - A chave **publishable** (começa com `sb_publishable_...`) **ou** a chave **anon public** (começa com `eyJ...`). Qualquer uma das duas serve.

> ⚠️ **NUNCA** use a chave **secret** / **service_role**. Ela dá acesso total e não pode ficar no site.

---

## NOITE 2: Configurar e publicar no GitHub

### 6. Preencher o arquivo de configuração

1. Descompacte o `.zip` numa pasta.
2. Abra **`js/config.js`** com o Bloco de Notas (botão direito, *Abrir com*, *Bloco de Notas*).
3. Troque os valores **entre as aspas**:
   - `SUPABASE_URL`: a Project URL
   - `SUPABASE_KEY`: a chave publishable/anon
   - `NOME_LOJA`, `SLOGAN`, `CIDADE`
   - `WHATSAPP`: **só números**, com 55 e o DDD. Ex.: `5511987654321`
4. Salve (Ctrl+S).

### 7. Criar o repositório e subir os arquivos

1. Entre no **github.com**, clique no **+** (canto superior direito) e depois em **New repository**.
2. **Repository name:** `loja` (esse nome vai aparecer no endereço do site).
3. Deixe como **Public**. O GitHub Pages gratuito exige isso. Não tem problema: a chave publishable é feita para ficar pública, e quem protege seus dados são as regras de segurança do passo 2.
4. Clique em **Create repository**.
5. Na página que abrir, clique no link **"uploading an existing file"**.
6. Abra a pasta descompactada, **selecione tudo o que está DENTRO dela** (`index.html`, `admin.html`, as pastas `css`, `js`, `supabase` etc.) e **arraste** para a página do GitHub.
   - Arraste o conteúdo, não a pasta de fora. O `index.html` tem que ficar na "raiz" do repositório.
7. Espere carregar e clique em **Commit changes**.

### 8. Ligar o GitHub Pages

1. No repositório, clique em **Settings** e depois em **Pages** (menu da esquerda).
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha **main** e a pasta **/ (root)**. Clique em **Save**.
4. Espere 1 a 2 minutos e atualize a página. Vai aparecer: *"Your site is live at https://SEU-USUARIO.github.io/loja/"*.

### 9. Testar

1. Abra `https://SEU-USUARIO.github.io/loja/admin.html` e entre com o e-mail e a senha do passo 3.
2. Clique em **+ Novo produto**, coloque fotos, nome, preço, custo e status **Disponível**, e salve.
3. Abra `https://SEU-USUARIO.github.io/loja/` (de preferência numa aba anônima) e o produto deve aparecer, **sem o custo**.
4. Abra um produto, clique em **Chamar no WhatsApp** e confira se abre a conversa com o seu número.

---

## Como usar no dia a dia

| Quero… | Faço… |
|---|---|
| Cadastrar produto | Painel, **+ Novo produto**. Fotos: clique, arraste ou cole (Ctrl+V). A 1ª é a capa; ◀ ▶ mudam a ordem. |
| Deixar escondido enquanto preparo | Status **Rascunho** |
| Alguém pediu para segurar | Status **Reservado** (continua no catálogo com selo "Reservado") |
| Vendi | Status **Vendido**. Sai do catálogo e entra no lucro do mês. No editor dá para ajustar o valor real da venda e a data. |
| Divulgar um produto na OLX/Marketplace/Status | Abra o produto no catálogo, clique em **Compartilhar** e cole o link. Ele abre direto naquele produto. |
| Backup / ver no Excel | Painel, **Exportar planilha** |
| Criar/renomear categoria | Painel, aba **Categorias** |
| Mudar nome da loja ou WhatsApp | No GitHub, abra `js/config.js`, clique no lápis ✏️, edite e clique em **Commit changes**. O site atualiza em 1 a 2 minutos. |

**Pelo celular:** o painel funciona no navegador do celular. Salve `.../admin.html` na tela inicial (menu do Chrome, *Adicionar à tela inicial*) e cadastre direto com a câmera.

---

## Bom saber

- **Fotos:** o painel reduz as fotos automaticamente antes de enviar (≈200–400 KB cada). O plano grátis tem 1 GB, o que dá para milhares de fotos.
- **Fotos do iPhone (HEIC):** podem não abrir. No iPhone: *Ajustes, Câmera, Formatos, "Mais Compatível"*.
- **Projeto pausado:** o Supabase grátis pausa projetos sem uso por 7 dias. Se o catálogo parar de carregar, entre no supabase.com, abra o projeto e clique em **Restore**. Usando o painel com frequência, isso não acontece.
- **Esqueci a senha do painel:** Supabase, **Authentication**, **Users**, clique no seu usuário e depois em **Reset password** (ou apague e crie de novo, que os produtos não são afetados).

## Deu erro?

| Sintoma | Causa provável |
|---|---|
| Aparece "Falta configurar" | `js/config.js` não foi preenchido ou não foi salvo antes de subir |
| "Não foi possível carregar os produtos" | URL ou chave errada no `config.js`, ou o script do passo 2 não rodou |
| Login diz "E-mail ou senha incorretos" | Usuário não criado, ou você não marcou *Auto Confirm User* |
| Erro ao salvar foto ("row-level security") | O script do passo 2 não rodou inteiro. Rode de novo (é seguro). |
| Site do GitHub dá 404 | Espere 2 minutos, ou o `index.html` não ficou na raiz do repositório |
