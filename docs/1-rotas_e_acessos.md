# 1. Rotas e Controle de Acesso (Auth)

O Sistema LL utiliza o Supabase para gerenciar a autenticação e autorização dos usuários. Atualmente, existem três perfis principais mapeados no contexto de autenticação (\AuthContext.tsx\).

## 👤 Perfis de Acesso

### 1. Administrador (\dmin\)
- **Acesso:** Total (Master).
- **Visão:** Pode ver, editar, criar e deletar qualquer registro em todo o sistema.
- **Telas Exclusivas:** Contas a Pagar, Dashboard Completo, Configurações Gerais.

### 2. Gestor (\user\)
- **Acesso:** Restrito ao ciclo das próprias demandas.
- **Visão:** Visualiza apenas as Demandas atribuídas a ele (cruzamento do campo \
ome\ no Supabase com o campo \gestor\ na tabela de demandas). 
- **Restrições:** Não tem acesso a rotas puramente financeiras como Movimentos ou Notas Fiscais globais. Pode ver as notas fiscais de suas próprias obras apenas em modo de leitura (não pode alterar faturamento, editar ou cancelar).

### 3. Contabilidade (\consulta\)
- **Acesso:** Auditoria e acompanhamento contábil.
- **Visão:** Acesso total (apenas leitura) ao fluxo financeiro da empresa.
- **Restrições:** Não pode criar nem editar registros. Não possui acesso direto ao módulo de Demandas (não pode ver o escopo ou dados técnicos da obra, apenas a nota fiscal associada ao faturamento financeiro).
- *Nota:* O link para a demanda dentro da visualização da Nota Fiscal fica desabilitado para este perfil.

---

## 🗺️ Mapa de Rotas da Aplicação

Todas as rotas do Next.js (App Router) ficam dentro de \src/app\.

| Rota | Acesso Permitido | Descrição |
| --- | --- | --- |
| \/\ | Todos (Dashboard personalizado) | Novo Dashboard focado em indicadores-chave (Inadimplência, Pendências). A visão muda conforme o perfil. |
| \/dashboard-antigo\ | Todos | Acesso ao layout antigo focado apenas nos gráficos anuais. |
| \/demandas\ | Admin, Gestor | Lista geral (para Admin) ou restrita (para Gestor) de todas as demandas em andamento. |
| \/demandas/nova\ | Admin | Criação de uma nova Demanda. |
| \/demandas/[id]\ | Admin, Gestor (Leitura NF) | Tela de edição, dados da obra, emissão de faturamento e extrato isolado. |
| \/contas-a-pagar\ | Admin | Controle do contas a pagar (recorrentes, impostos, fornecedores, etc). |
| \/notas-fiscais\ | Admin, Contabilidade | Lista global de notas emitidas em todos os projetos. |
| \/movimento\ | Admin, Contabilidade | Lista de transações importadas do Banco via arquivo OFX. |
| \/login\ | Público | Tela de autenticação integrada ao Supabase Auth. |

> **Scripts de Migração:** As rotas \/migracao/demandas\ e \/migracao/extratos\ foram utilizadas exclusivamente para a carga inicial do sistema e não fazem parte do fluxo operacional diário.
