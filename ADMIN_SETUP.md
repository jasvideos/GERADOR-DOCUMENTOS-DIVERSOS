# 🔧 Configuração do Painel Administrativo

Este guia explica como configurar o backend com Supabase para ter acesso ao painel administrativo com controle de acessos, localização e vendas.

## 📋 Índice

1. [Criar conta no Supabase](#1-criar-conta-no-supabase)
2. [Criar o banco de dados](#2-criar-o-banco-de-dados)
3. [Configurar variáveis de ambiente](#3-configurar-variáveis-de-ambiente)
4. [Instalar dependências](#4-instalar-dependências)
5. [Acessar o painel administrativo](#5-acessar-o-painel-administrativo)
6. [Deploy na Vercel](#6-deploy-na-vercel)

---

## 1. Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em **"Start your project"**
3. Faça login com GitHub ou crie uma conta
4. Clique em **"New project"**
5. Preencha:
   - **Name:** GERADOR-DOCUMENTOS
   - **Database Password:** Crie uma senha forte
   - **Region:** South America (São Paulo)
6. Clique em **"Create new project"**

Aguarde alguns minutos enquanto o projeto é criado.

---

## 2. Criar o banco de dados

1. No painel do Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **"New query"**
3. Copie todo o conteúdo do arquivo `database/schema.sql`
4. Cole no editor SQL
5. Clique em **"Run"** (ou Ctrl+Enter)

✅ As tabelas serão criadas automaticamente.

---

## 3. Configurar variáveis de ambiente

### Obter as credenciais do Supabase

1. No painel do Supabase, vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (em API Keys)

### Configurar no projeto

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
VITE_ADMIN_PASSWORD=sua-senha-admin-aqui
```

⚠️ **IMPORTANTE:** Nunca compartilhe o arquivo `.env` ou commite no Git!

---

## 4. Instalar dependências

Execute no terminal:

```bash
npm install @supabase/supabase-js
```

---

## 5. Acessar o painel administrativo

### Adicionar rota do admin

Edite o arquivo `src/App.js` e adicione a rota para o painel:

```javascript
// No início do arquivo, adicione:
import Admin from './pages/Admin';

// Dentro do componente, adicione verificação de URL:
// Se a URL contém '/admin', mostra o painel
if (window.location.pathname === '/admin') {
  return <Admin />;
}
```

### Acessar

1. Inicie o projeto: `npm start`
2. Acesse: `http://localhost:3000/admin`
3. Digite a senha configurada em `REACT_APP_ADMIN_PASSWORD`

---

## 6. Deploy na Vercel

### Configurar variáveis de ambiente na Vercel

1. Faça login em [vercel.com](https://vercel.com)
2. Importe o repositório do GitHub
3. Vá em **Settings** → **Environment Variables**
4. Adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD`
5. Clique em **Deploy**

### URL do painel

Após o deploy, acesse:
```
https://seu-app.vercel.app/admin
```

---

## 📊 Funcionalidades do Painel

| Seção | Descrição |
|-------|-----------|
| **Visão Geral** | Total de visitas, vendas, receita e gráfico de acessos |
| **Documentos** | Estatísticas por documento (quais são mais acessados) |
| **Localização** | De onde vêm os acessos (cidade, estado, país) |
| **Pagamentos** | Histórico de vendas com valor e status |
| **Preços** | Gerenciar preços dos documentos em tempo real |
| **Acessos** | Log de acessos recentes com dispositivo e navegador |

---

## 🔒 Segurança

### Recomendações para produção:

1. **Autenticação:** Considere usar Supabase Auth para login mais seguro
2. **Senha forte:** Use uma senha complexa no `VITE_ADMIN_PASSWORD`
3. **RLS:** As políticas de Row Level Security já estão configuradas
4. **HTTPS:** A Vercel já fornece HTTPS automaticamente

### Para maior segurança:

```sql
-- No Supabase, você pode restringir o SELECT apenas para admins
-- Isso requer configurar Supabase Auth
```

---

## 🐛 Solução de Problemas

### "Supabase não configurado"
- Verifique se as variáveis `.env` estão corretas
- Reinicie o servidor de desenvolvimento após alterar `.env`

### Dados não aparecem
- Confirme que o SQL foi executado no Supabase
- Verifique se há erros no Console do navegador (F12)

### Erro de CORS
- Adicione seu domínio em **Settings** → **API** → **Allowed origins** no Supabase

---

## 📞 Suporte

- Documentação Supabase: [supabase.com/docs](https://supabase.com/docs)
- Documentação Vercel: [vercel.com/docs](https://vercel.com/docs)
