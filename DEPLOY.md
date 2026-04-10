# 🚀 Guia de Deploy no Vercel

## ✅ Configurações Corretas

### 1. Framework Preset
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2. Variáveis de Ambiente (se necessário)
Nenhuma variável de ambiente é obrigatória para este projeto.

### 3. Node.js Version
- **Versão Recomendada**: 18.x ou superior

## 📋 Passo a Passo para Deploy

### Via CLI (Recomendado)
```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Fazer login
vercel login

# 3. Deploy
vercel
```

### Via Dashboard Vercel
1. Acesse https://vercel.com/new
2. Conecte seu repositório GitHub/GitLab/Bitbucket
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Clique em **Deploy**

## 🔧 Solução de Problemas

### Erro: "Build failed"
- Certifique-se que `npm run build` funciona localmente
- Verifique a versão do Node.js (deve ser 18.x+)

### Erro: "404 on page refresh"
- Já configurado no `vercel.json` com rewrites

### Erro: "Module not found"
- Rode `npm install` localmente
- Delete `node_modules` e `package-lock.json`, rode `npm install` novamente

## 📦 Arquivos Importantes

- ✅ `vercel.json` - Configuração de rewrites (SPA)
- ✅ `vite.config.js` - Configuração otimizada de build
- ✅ `package.json` - Scripts e dependências

## 🎯 Deploy Manual

Se preferir fazer deploy manual:

```bash
# 1. Build local
npm run build

# 2. Deploy a pasta dist
vercel --prod dist
```

## ✨ Status

- Build Local: ✅ Funcionando
- Chunks Otimizados: ✅ 
- Configuração Vercel: ✅ Atualizada
