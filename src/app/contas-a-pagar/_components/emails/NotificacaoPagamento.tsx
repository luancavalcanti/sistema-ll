import * as React from 'react';

// Definimos a interface para o TypeScript saber o que o e-mail recebe
interface EmailTemplateProps {
  fornecedor: string;
  valor: number;
  vencimento: string;
  parcela: string;
  tipo: string;
}

// Transformamos em um componente funcional padrão (FC)
export const NotificacaoPagamentoTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  fornecedor,
  valor,
  vencimento,
  parcela,
  tipo,
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#333', lineHeight: '1.6' }}>
      <h2 style={{ color: '#1976d2', borderBottom: '2px solid #1976d2', paddingBottom: '10px' }}>
        Nova Solicitação de Pagamento
      </h2>
      <p>Olá, um novo pagamento foi registrado no sistema e aguarda sua conferência:</p>
      
      <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
        <p style={{ margin: '5px 0' }}><strong>Fornecedor:</strong> {fornecedor}</p>
        <p style={{ margin: '5px 0' }}><strong>Valor:</strong> R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        <p style={{ margin: '5px 0' }}><strong>Vencimento:</strong> {vencimento.split('-').reverse().join('/')}</p>
        <p style={{ margin: '5px 0' }}><strong>Parcela:</strong> {parcela}</p>
        <p style={{ margin: '5px 0' }}><strong>Tipo:</strong> {tipo}</p>
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        Este é um e-mail automático enviado pelo Sistema ACE. Por favor, não responda.
      </p>
    </div>
  );
};