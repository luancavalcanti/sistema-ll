// No futuro, isso virá do Firebase baseado no login do usuário!
export const configEmpresa = {
  nome: "L. L. Engenharia Ltda.",
  cnpj: "03.105.742/0001-70",
  endereco: "Av. Dr. José Augusto Moreira. nº 900, sl. 1501, Casa Caiada - Olinda / PE",
  
  // Caminho das imagens na pasta /public
  logoUrl: "/logo-completa.png", 
  timbradoUrl: "", 

  // Configurações de tamanho para facilitar o ajuste para cada cliente
  pdf: {
    // Margens para o texto não ficar em cima do cabeçalho/rodapé do papel timbrado
    margemTopo:180, 
    margemBaixo: 80,
    
    // Tamanho e posição da Logo (se o cliente não tiver papel timbrado, usamos a logo)
    logoWidth: 80,
    logoHeight: null as number | null,
    logoX: 40,
    logoY: 30
  }
};