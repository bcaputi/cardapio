# Cardápio digital – Praia da Tiquatira

Site do cardápio, publicado de graça pelo GitHub Pages e editado por uma planilha Google.

## O que tem nesta pasta

| Arquivo | Para que serve |
|---|---|
| `index.html`, `style.css`, `app.js` | A página do cardápio. Não precisa mexer. |
| `config.js` | Onde ficam os links da planilha, o WhatsApp e o Instagram. |
| `menu.json` | Cópia de segurança do cardápio, usada se a planilha não responder. |
| `img/` | Fotos dos pratos e o logo. |

## 1. Planilha (uma vez só)

1. No Google Drive: **Novo → Upload de arquivo → `Cardapio_Praia_Planilha.xlsx`**.
2. Abra o arquivo e vá em **Arquivo → Salvar como Planilhas Google**. Use essa versão daqui para frente.
3. **Arquivo → Compartilhar → Publicar na Web**.
   - Em "Link", escolha a aba **Itens** e o formato **Valores separados por vírgula (.csv)** → **Publicar** → copie o link.
   - Repita para a aba **Categorias** e copie o segundo link.

## 2. GitHub (uma vez só, de preferência no computador)

1. Crie uma conta em github.com, caso ainda não tenha.
2. **New repository** → nome `cardapio` → **Public** → **Create repository**.
3. Clique em **uploading an existing file** e arraste **todo o conteúdo desta pasta**, incluindo a pasta `img` → **Commit changes**.
4. Abra `config.js` → clique no lápis (editar) → cole os dois links da planilha entre as aspas → **Commit changes**.
5. **Settings → Pages** → em "Branch" escolha **main** e **/(root)** → **Save**.
6. Em um ou dois minutos o cardápio estará em `https://SEU-USUARIO.github.io/cardapio/`.

Esse endereço é o que vai no QR code. Ele não muda.

## Editar o cardápio no dia a dia

Mexa só na planilha, pelo celular ou pelo computador. O site atualiza sozinho em alguns minutos. As instruções de cada coluna estão na aba **Como usar** da planilha.

**Foto nova:** no GitHub, entre na pasta `img` → **Add file → Upload files** → envie a foto (de preferência .jpg, com um nome simples como `petit-gateau.jpg`). Depois escreva esse nome na coluna **Foto** da planilha.
