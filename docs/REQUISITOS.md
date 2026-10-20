# Correspondência com o DRS

Fonte: documento de requisitos anexado, versão 1.0, setembro de 2026, com marca, planos e horários ajustados conforme confirmação nesta conversa.

| Requisito | Implementação |
| --- | --- |
| RF-01 | Site público com apresentação da SerFit |
| RF-02 | Quatro planos, preços/benefícios e seleção no cadastro |
| RF-03 | Modalidades públicas alimentadas pelo catálogo |
| RF-04 | Seção de contato/localização e horários; endereço e telefone pendentes de informação real |
| RF-05 | Cadastro público do aluno e matrícula em análise |
| RF-06 | Autenticação por e-mail/senha, sessão e saída |
| RF-07 | Atualização de nome, e-mail e telefone em Meu perfil |
| RF-08 | Área Meu plano com benefícios e situação da matrícula |
| RF-09 | Área Meus treinos com fichas e orientações |
| RF-10 | Lista exclusiva dos alunos atribuídos ao professor |
| RF-11 | Criação, consulta e edição de fichas pelo professor atribuído |
| RF-12 | Cadastro, consulta, edição, inativação e reativação de alunos/professores pelo gerente |
| RF-13 | Administração de planos, preços, benefícios e disponibilidade |
| RF-14 | Administração de modalidades e disponibilidade |
| RF-15 | Rotas da interface e operações da API protegidas por perfil |
| RF-16 | Persistência SQLite com relações usuário/plano/professor/treino |

| Requisito não funcional | Tratamento |
| --- | --- |
| RNF-01 | Hash scrypt, cookies HttpOnly/SameSite/Secure em produção, limitação de autenticação |
| RNF-02 | Autorização no Express por perfil e atribuição |
| RNF-03 | Índices, carregamento local de fontes e estados de carregamento; desempenho de produção depende da infraestrutura |
| RNF-04 | Erros JSON compreensíveis e mensagens de indisponibilidade/repetição no cliente |
| RNF-05 | Navegação consistente, formulários validados e retorno de operações |
| RNF-06 | Media queries para celular, tablet e computador; validação visual no navegador ainda necessária |
| RNF-07 | Componentes/páginas separados, validadores compartilhados e testes de integração |
| RNF-08 | Comando de backup SQLite e procedimento de restauração; frequência/armazenamento externo a definir |

As escolhas comerciais ainda não definidas estão listadas no README. O projeto não implementa cobrança, renovação, cancelamento automatizado ou integrações externas sem definição das regras.
