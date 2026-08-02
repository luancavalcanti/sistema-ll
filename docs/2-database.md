# 2. Estrutura de Banco de Dados (Supabase)

O Sistema LL utiliza o **Supabase** como Backend as a Service. Abaixo detalhamos as principais tabelas e como elas se comunicam.

## 🗄️ Tabelas Principais

### `users`
Tabela gerenciada na schema `auth`, com possíveis extensões na schema `public` para dados adicionais.
- Armazena as credenciais, nome, e a `role` (Admin, User, Consulta) associada ao usuário.

### `demandas`
Coração operacional do sistema.
- **Campos Principais:** `numero` (Identificador único gerado), `cliente`, `gestor`, `local`, `uf`, `cidade`, `status`, `valor`.
- **Relacionamentos:**
  - O campo `gestor` faz o link semântico com o nome cadastrado na tabela `users`, limitando quem vê a demanda.
  - Recebe conexões financeiras indiretas das tabelas `faturamentos` e `movimentos` filtradas pelo campo `numero`.

### `faturamentos`
Gerencia a parte de Receitas e emissão de notas fiscais associadas às obras.
- **Campos Principais:** `id`, `demandaId` (Fk para Demandas), `nota_fiscal`, `valor_fat`, `valor_cred`, `data_fat`, `data_cred`, `cancelada`.
- **Lógica:** A diferença entre `valor_fat` (emitido) e `valor_cred` (pago no banco) gera o índice de Inadimplência ou A Receber.
- *Status:* Notas marcadas como `cancelada` = true são ignoradas nos cálculos financeiros.

### `movimentos`
O fluxo de caixa bruto e extratos bancários importados via OFX.
- **Campos Principais:** `id`, `fitid` (ID da transação no OFX), `data`, `valor`, `descricao`, `banco`, `favorecido`, `classificacao`, `observacao`, `demanda`.
- **Prevenção de Duplicidade:** O banco possui uma restrição (`UNIQUE`) na combinação: **`fitid + data + valor`**. Isso impede que o mesmo arquivo OFX importado 2 vezes duplique o caixa da empresa.

### `config_ignorar`
Tabela de regras para sanear a contabilidade gerencial.
- **Campo:** `texto`
- **Uso:** Armazena palavras-chave (ex: "SALDO ANTERIOR", "APLICAÇÃO CDB"). Se uma palavra existir aqui, qualquer movimentação do OFX que a contenha na sua descrição será visualmente ignorada dos saldos e cálculos do Dashboard.

### `contas_pagar`
- Utilizada para registro de despesas, boletos, tributos e contas de consumo geral ou de obras, organizando os vencimentos diários para baixa do time financeiro.
