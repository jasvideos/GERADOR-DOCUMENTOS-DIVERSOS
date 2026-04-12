# Melhorias Futuras - Gerador de Documentos

> Última atualização: 11/04/2026

---

## Funcionalidades de Alto Impacto

### 1. Validação de PIX com API
- [ ] Integrar com gateway de pagamento (MercadoPago, PagSeguro)
- [ ] Confirmar pagamento automaticamente em vez de manual
- **Prioridade:** Alta

### 2. Histórico de Documentos
- [ ] Salvar documentos gerados no localStorage
- [ ] Permitir usuário acessar depois (prazo de 24h)
- **Prioridade:** Alta

### 3. Modo Escuro
- [ ] Toggle para tema dark
- [ ] Salvar preferência no localStorage
- **Prioridade:** Média

### 4. PWA (App Instalável)
- [ ] Adicionar manifest.json
- [ ] Implementar service worker
- [ ] Permitir instalar no celular como app
- **Prioridade:** Alta

### 5. Compartilhar no WhatsApp
- [ ] Botão para enviar link do app via WhatsApp
- [ ] Opção de compartilhar documento gerado
- **Prioridade:** Média

---

## Melhorias de UX

### 1. Indicador de Progresso
- [ ] Barra mostrando % de campos preenchidos
- **Prioridade:** Baixa

### 2. Salvar Rascunho
- [ ] Auto-save dos dados no localStorage enquanto preenche
- [ ] Recuperar dados ao recarregar página
- **Prioridade:** Média

### 3. Templates Favoritos
- [ ] Permitir salvar dados preenchidos como template
- [ ] Reutilizar templates salvos
- **Prioridade:** Baixa

### 4. Campos Inteligentes
- [x] ~~Auto-completar cidade/estado pelo CEP (API ViaCEP)~~ ✅ IMPLEMENTADO
- **Status:** Concluído

---

## Monetização

### 1. Plano Mensal
- [ ] Assinatura R$19,90/mês para documentos ilimitados
- [ ] Sistema de login/cadastro
- **Prioridade:** Futura

### 2. Cupons de Desconto
- [ ] Sistema de cupons promocionais
- [ ] Validação de cupons no checkout
- **Prioridade:** Média

### 3. Programa de Afiliados
- [ ] Link de indicação com comissão
- [ ] Dashboard de afiliados
- **Prioridade:** Futura

---

## Analytics

### 1. Dashboard Admin
- [x] ~~Página /admin~~ ✅ IMPLEMENTADO
- [ ] Ativar analytics completo (Supabase)
- [ ] Configurar variáveis de ambiente na Vercel
- **Status:** Parcialmente concluído

---

## Já Implementado

| Feature | Data | Status |
|---------|------|--------|
| CEP Auto-complete (ViaCEP) | 11/04/2026 | ✅ |
| Painel Admin (/admin) | 11/04/2026 | ✅ |
| Bloqueio de clique no preview | 11/04/2026 | ✅ |
| Modal de sucesso elegante | 11/04/2026 | ✅ |
| Placeholder melhorado | 11/04/2026 | ✅ |
| 5 Templates de Currículo | - | ✅ |

---

## Próximos Passos Recomendados

1. **Configurar Supabase na Vercel** - Para ativar analytics
2. **PWA** - Grande impacto com pouco esforço
3. **Histórico de Documentos** - Melhora retenção do usuário
4. **Modo Escuro** - Feature muito pedida

---

## Notas

- Supabase URL e Key precisam ser configurados na Vercel
- Schema do banco está em `database/schema.sql`
- Documentação de setup admin em `ADMIN_SETUP.md`
