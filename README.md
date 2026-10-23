# SerFit — Plataforma da academia

Projeto completo baseado no DRS fornecido e nas informações comerciais confirmadas: React + Vite no front-end; Node.js + Express no back-end; NPM e Nodemon para desenvolvimento.

## Executar o projeto

Requisito: **Node.js 22.13 ou superior**. Recomenda-se Node.js 24 LTS. O SQLite usa o módulo nativo `node:sqlite`, sem instalação de um servidor de banco separado.

1. Extraia o ZIP e abra um terminal na pasta `serfit`.
2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie `.env.example` para `.env`.

   Linux/macOS:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Execute front-end e API juntos:

   ```bash
   npm run dev:all
   ```

5. Abra **http://localhost:4173**. A API funciona em **http://127.0.0.1:3001/api** e o Vite encaminha as requisições `/api` para ela.

Também é possível usar dois terminais: `npm run dev` e `npm run dev:server`. O Nodemon reinicia a API ao alterar arquivos em `server/` ou `shared/`.

## Contas de exemplo

Ao iniciar um banco novo com `SEED_DEMO=true`, são criadas contas fictícias para explorar os fluxos. A senha configurada em `.env.example` é **`SerFit2026!`**.

| Perfil | E-mail |
| --- | --- |
| Aluno | aluno@serfit.com |
| Professor | professor@serfit.com |
| Gerente | gerente@serfit.com |

Os nomes, alunos, atribuições e treinos iniciais são exemplos de demonstração. As senhas são derivadas com scrypt antes de serem gravadas. Dados criados ou editados pela API são persistidos em `server/data/serfit.sqlite`.

Para testar o fluxo completo: cadastre um aluno no site, entre como gerente, confirme a matrícula e associe um professor. Entre como professor e crie a ficha. Ao entrar como aluno, a ficha estará disponível.

## Funcionalidades

- **Visitante:** informações da academia, planos, modalidades, horários, contato e cadastro.
- **Aluno:** visão geral, ficha de treino, matrícula/plano e atualização de nome, e-mail e telefone.
- **Professor:** alunos atribuídos à sua conta e criação/edição de fichas com exercícios, séries, repetições, cargas, intervalos e orientações.
- **Gerente:** cadastro, consulta, edição e inativação de alunos/professores; associação de planos e professores; confirmação de matrículas; administração dos planos e modalidades.
- Validações no cliente e no servidor, mensagens de sucesso/erro, estados de carregamento e páginas protegidas por perfil.
- Layout responsivo, navegação por teclado, diálogo nativo, foco visível, links para pular o conteúdo, fontes locais e redução de movimento conforme a preferência do navegador.

## Identidade e conteúdo

| Cor | Uso |
| --- | --- |
| Verde `#009B4D` | Identidade, ações principais e destaques |
| Amarelo tangerina `#FFCC00` | Chamadas, energia e plano em destaque |
| Marfim `#FAF5E9` | Fundo e superfícies |

Verde escuro complementa a paleta para oferecer contraste. As fontes Anton e Manrope são distribuídas via Fontsource e carregadas localmente. A imagem principal foi gerada para ilustrar a identidade SerFit; ela não retrata instalações reais da academia.

| Plano | Valor | Benefícios confirmados |
| --- | --- | --- |
| Básico | R$ 89,00 | Musculação das 08h às 11h e das 15h às 18h, dentro do horário de funcionamento |
| Normal | R$ 100,00 | Musculação sem restrição de horário |
| Intermediário | R$ 110,00 | Sem restrição de horário, Karatê/Boxe/Zumba/Jump e acompanhamento nutricional |
| Pro | R$ 150,00 | Todos os serviços: aulas, Personal Trainer, nutrição e avaliações físicas |

Funcionamento: **segunda a sexta das 05h à meia-noite; sábado das 05h às 12h**. Não foi inferido funcionamento aos domingos.

Endereço, telefone e e-mail comerciais ainda não foram fornecidos. Atualize `siteInfo` em `shared/seed.js` antes de divulgar o site ao público. O site indica esses dados como pendentes. Não foram inventados endereço, telefone, testemunhos ou credenciais profissionais.

## Build e execução compilada

```bash
npm run build
npm start
```

Abra **http://localhost:3001**. O Express serve a interface compilada em `dist` e a API na mesma origem. O ZIP já inclui essa compilação; é possível executar `npm start` após instalar dependências e criar `.env`.

O arquivo `.env.example` é destinado a desenvolvimento local. Para produção com HTTPS, use `NODE_ENV=production` e os valores corretos de `HOST`, `PORT`, `CLIENT_ORIGIN`. Configure `TRUST_PROXY=true` somente quando existir um proxy confiável à frente da API. Cookies de sessão são `Secure` em produção; para testes locais com HTTP mantenha o ambiente de desenvolvimento.

Para um banco novo sem contas de exemplo:

```dotenv
SEED_DEMO=false
ADMIN_EMAIL=seu-gerente@seu-dominio.com
ADMIN_NAME=Gerente SerFit
ADMIN_PASSWORD=uma-senha-forte-escolhida-por-voce
```

Essas variáveis criam o primeiro gerente somente quando o banco está vazio. Não alteram nem removem usuários de um banco existente. `SEED_DEMO` e `DEMO_PASSWORD` também só afetam a inicialização de um banco novo. O `.env` e o banco não devem ser enviados ao controle de versão.

## Prévia demonstrativa

```bash
npm run build:demo
npm run preview
```

Essa variante não chama o Express: usa dados fictícios em `sessionStorage` para apresentar as telas. A página indica o modo de demonstração. As alterações são locais à sessão do navegador e se perdem ao encerrá-la. Use somente dados fictícios. A variante de demonstração não constitui autenticação de produção.

Para voltar ao modo conectado à API, execute `npm run build`. Não configure `VITE_DEMO_MODE=true` em `.env.local` se desejar utilizar o back-end real.

## Segurança e consistência

- Senhas derivadas com **scrypt**, sal aleatório e comparação resistente a diferenças de tempo.
- Sessões opacas com cookie **HttpOnly**, **SameSite=Strict**, validade de 8 horas e **Secure** em produção. Somente o hash do identificador da sessão é armazenado no banco.
- Permissões verificadas na API em cada operação privada. O cliente não define o perfil no cadastro público.
- Contas inativas não autenticam; a inativação e a redefinição administrativa de senha revogam as sessões.
- Limitação de tentativas de login/cadastro, Helmet, validação dos campos, tamanho máximo das requisições e verificação de origem para alterações.
- Consultas parametrizadas, chaves estrangeiras e transação ao atualizar usuário e responsável pelos treinos.
- Planos e modalidades são arquivados por disponibilidade, preservando as relações existentes.
- Professor com alunos ativos não pode ser inativado antes da reatribuição.

## Backup

Crie uma cópia consistente usando a API de backup do SQLite:

```bash
npm run backup
# ou escolha o destino:
npm run backup -- ./backups/minha-copia.sqlite
```

Guarde a cópia em armazenamento separado. Para restaurar, pare a API e configure `DATABASE_PATH` para a cópia desejada; reinicie e verifique os registros. A frequência e o armazenamento externo dos backups devem ser definidos com a academia. O projeto fornece o comando, sem criar agendamento automático.

## Validação

```bash
npm test
npm run build
```

Foram aprovados **11 testes de integração da API**: catálogo, sessão, permissões, validação do cadastro, gestão de treino, limites de atualização de perfil, inativação/reativação, consistência dos responsáveis, catálogo/arquivamento, origem das requisições e persistência após reabertura do banco. As compilações da interface foram verificadas. A auditoria das dependências de produção não apontou vulnerabilidades no momento da entrega.

A revisão visual e a interação no navegador ficaram indisponíveis no ambiente de criação. A responsividade foi implementada com media queries para celular, tablet e computador, mas deve ser validada visualmente no navegador de destino. Os recursos WebMCP de consulta são opcionais e usam detecção de suporte; não foi possível validá-los em um contexto de navegador compatível.

## Decisões e pendências comerciais

- Marca confirmada: **SerFit**, substituindo “Self Fit” no DRS.
- Cadastro público exige nome, e-mail, senha e plano; telefone é opcional. CPF, nascimento e outros dados não foram exigidos sem confirmação.
- Matrícula de novo cadastro inicia **Em análise**, e o gerente confirma **Ativa**. Cadastro não cobra valores nem processa pagamentos.
- Cada aluno possui um professor responsável. O gerente pode reatribuir alunos; apenas o professor atribuído altera os treinos.
- Criação/gestão de outros gerentes está desabilitada até confirmação dessa regra. O primeiro gerente é criado na inicialização do banco.
- Não foi inferida periodicidade de cobrança. Os preços aparecem como “valor do plano”, sem prometer mensalidade, renovação ou cancelamento.
- Não há pagamentos online, agendamento de aulas, recuperação de senha por e-mail, notificações, catraca, biometria, relatórios financeiros ou integrações externas. Esses itens dependem de definição e estão fora do escopo inicial do DRS.

## Estrutura

```text
serfit/
  src/          Componentes, páginas, contexto e cliente da API
  shared/       Dados iniciais e validadores compartilhados
  server/       API Express, banco SQLite e backup
  public/       Imagem, favicon e recursos estáticos
  tests/        Testes de integração da API
  docs/         Endpoints e rastreabilidade dos requisitos
  dist/         Front-end compilado conectado à API
  package.json  Comandos e dependências NPM
```

Consulte `docs/API.md` e `docs/REQUISITOS.md` para as rotas e a correspondência com o DRS.
