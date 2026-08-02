# 4. Fluxos Financeiros (Caixa, OFX e Contas a Pagar)

O módulo financeiro garante a conciliação bancária da LL Engenharia de forma simplificada sem a necessidade de um sistema contábil denso de partidas dobradas, focando em automações via OFX.

## 🏦 1. Importação Bancária (OFX)

1. O financeiro extrai o arquivo OFX do Internet Banking e faz o upload na tela `Movimentos`.
2. O sistema lê as transações, prevenindo duplicidades baseando-se na **Chave Única**: `fitid + data + valor`.
3. **Auto-Conciliação de Notas:** Se uma transação do tipo Crédito (entrada) tiver exatamente o mesmo valor e data de uma Nota Fiscal emitida pendente, o sistema vincula o cliente e a demanda automaticamente a essa entrada de caixa!

### Regras de Ocultação
O banco costuma enviar nos extratos OFX certas movimentações que **não são entradas e saídas reais de dinheiro da empresa**.
*Exemplos:* 
- Resgate automático de Poupança / Aplicação CDB.
- Linhas descritivas como "SALDO ANTERIOR".

Para impedir que esses valores poluam o Gráfico de Resultados e o Saldo do Mês, o financeiro utiliza o recurso de **Regras de Ocultação** (Tabela `config_ignorar`). O financeiro insere a palavra-chave (ex: "CDB") e o sistema vai **ocultar visualmente e excluir dos cálculos** todo movimento que contenha essa palavra, impedindo que uma transferência para aplicação conste como "Prejuízo/Saída".

---

## 🧾 2. A Receber

A tela inicial exibe o painel de a receber.
- Como é calculado? 
- `Somatória de Notas Fiscais Emitidas sem valores creditados` (ignorando notas canceladas)

---

## 💸 3. Contas a Pagar

A tela `/contas-a-pagar` centraliza as saídas (dinheiro saindo da empresa).
- **Finalidade:** Registro de todo boleto, guias de impostos, compras de obras e contas fixas (água, luz, aluguel).
- **Lógica de Recorrência:** Implementada para não encher o banco de dados desnecessariamente. O usuário pode cadastrar um "pagamento recorrente" sem gerar 100 linhas no banco de uma vez.
- **Fluxo Operacional:** 
  1. O usuário (Engenheiro, RH ou Financeiro) cadastra o boleto a ser pago.
  2. O responsável financeiro (master) consulta os boletos com vencimento para "Hoje".
  3. O pagamento é realizado no banco.
  4. O financeiro dá "baixa" no sistema, removendo o boleto da lista de pendências.
