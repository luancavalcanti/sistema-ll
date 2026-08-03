# 3. Fluxo de Vida das Demandas (Obras)

As Demandas são o eixo central das operações da LL Engenharia. Elas representam obras, contratos ou projetos.

## 🔄 Ciclo de Status

O ciclo de vida de uma Demanda é gerenciado **manualmente** e foi projetado para facilitar o controle de SLAs (Tempo de Atendimento/Atrasos) de faturamento e conclusão.

1. **Nova:** 
   - Demanda recém-criada, em levantamento de custos ou dados.
   - *SLA (Prazo Esperado):* 10 dias.
2. **Proposta:** 
   - Orçamento ou escopo foi enviado ao cliente. Aguardando aprovação.
   - *SLA (Prazo Esperado):* 15 dias.
3. **Aprovada:** 
   - O cliente aprovou a obra, e ela entra oficialmente para o financeiro da empresa como uma "Receita Potencial".
   - Demandas aprovadas constam no painel de "Faturamento Pendente".
   - *SLA (Prazo Esperado):* 15 dias (para início ou andamento).
4. **Concluída:** 
   - Obra entregue com termo de entrega assinado.
   - *SLA (Prazo Esperado):* 5 dias para conferência final.
5. **Autorizada a Faturar:** 
   - Etapa ou obra finalizada operacionalmente.
   - **Ação Requerida:** Exige a ação do responsável pela emissão da Nota Fiscal.
   - *SLA (Prazo Esperado):* 2 dias.
6. **Faturada:** 
   - As Notas Fiscais referentes ao escopo foram emitidas e a demanda está rodando financeiramente ou aguardando pagamento final.
   - *SLA (Prazo Esperado):* 25 dias.
7. **Creditada:** 
   - A nota fiscal foi creditada e atualizada no sistema.
8. **Recusada/Declinada:** 
   - Cliente não aprovou ou a obra foi cancelada (ignorada nos relatórios de receita).

---

## ⏳ Regras de Contagem de Prazo (SLA)

- O campo `atualizado_em` no banco de dados controla há quanto tempo uma demanda está parada em um determinado status.
- **Importante:** O SLA (tempo parado) só é **zerado** quando o usuário altera o **Status** da demanda. Salvar a demanda para atualizar apenas valores, datas, descrições, ou informações comerciais NÃO reseta o contador de dias parados.

---

## 📈 Integração de Faturamento Pendente

- O "Valor Total da Demanda" (cadastrado na aba Informações Básicas) é cruzado com todas as **Notas Fiscais Emitidas** associadas àquela demanda.
- Se a soma do valor das Notas Fiscais for menor que o Valor Total da Demanda (e a demanda estiver como `Concluída` ou `Autorizada a Faturar`), o sistema lista essa Demanda no card **"🔥 Demandas em destaque"** do Dashboard, indicando o valor exato que o comercial/financeiro ainda precisa faturar do cliente.

## Integração com o movimento.
- Quando o usuário atualizar os campos data cred e valor cred, ao salvar, automaticamente o sistema verifique se exite no movimento alguma entrada com exatamente a mesma data e valor e atualize no movimento os campos Origem/Cliente com o cliente da demanda, Tipo da Entrada como Crédito Cliente, Número da nota fiscal com o número da nota e na observação colocar "Demanda" + o número da demanda. O sistema também deve ao carregar um novo OFX verificar nas notas fiscais se tem alguma nota fiscal com exatamente a mesma data e mesmo valor e já ajustar os nomes conforme solicitado. Ou seja, que funcione tanto no momento da atualização da demanda quanto no momento da importação do OFX.