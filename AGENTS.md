<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Regras de Negócio e Documentação

**Sempre** consulte os arquivos na pasta `/docs` antes de implementar novas funcionalidades, alterar o banco de dados ou criar novas regras de negócio. O comportamento do sistema deve **sempre** respeitar o que está documentado lá (perfis de acesso, ciclo de vida de demandas, fluxo financeiro, etc). Se uma solicitação do usuário for contra essas regras ou abordar algo que não está documentado, pare e avise o usuário antes de prosseguir com qualquer código.

Ao finalizar a implementação de qualquer funcionalidade nova, você deve OBRIGATORIAMENTE lembrar o usuário de atualizar ou inserir a documentação referente àquela funcionalidade na pasta `/docs`.
