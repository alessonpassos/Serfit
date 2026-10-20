# SerFit

Plataforma web da academia **SerFit**: divulgação da marca, planos, cadastro, login e áreas do aluno, professor e gerente.

**Stack:** React + Vite (front-end) · Node.js + Express (back-end) · SQLite (`node:sqlite`) · NPM e Nodemon.

> Requisito: **Node.js 22.13+** (recomendado: 24 LTS). Não é necessário um servidor de banco separado.

## Equipe

| Nome | Matrícula | Papel |
| :--- | :---: | :--- |
| Alesson Passos | 01837765 | Desenvolvedor e Scrum Master |
| Daniel do Nascimento | 01810958 | Desenvolvedor e Documentador |
| Jefté Pedro | 01856102 | Desenvolvedor |
| Luiz Alexandre | 01540149 | Desenvolvedor e Testador |

## Como executar

1. Abra um terminal na raiz do repositório.
2. Instale as dependências:

   ```bash
   npm install
   ```

3. Copie o ambiente:

   ```powershell
   Copy-Item .env.example .env
   ```

   Linux/macOS: `cp .env.example .env`

4. Suba front-end e API juntos:

   ```bash
   npm run dev:all
   ```

5. Abra **http://localhost:4173**. A API fica em **http://127.0.0.1:3001/api**; o Vite encaminha `/api` para ela.

Em dois terminais: `npm run dev` e `npm run dev:server`. O Nodemon recarrega a API ao alterar `server/` ou `shared/`.

### Produção (build)

```bash
npm run build
npm start
```

Interface e API na mesma origem: **http://localhost:3001**.

### Prévia sem API

```bash
npm run build:demo
npm run preview
```

Usa dados fictícios no `sessionStorage`. Não é autenticação de produção.

## Contas de demonstração

Com `SEED_DEMO=true` em um banco novo. Senha de exemplo: **`SerFit2026!`**.

| Perfil | E-mail |
| --- | --- |
| Aluno | aluno@serfit.com |
| Professor | professor@serfit.com |
| Gerente | gerente@serfit.com |

Fluxo sugerido: cadastre um aluno → entre como gerente e confirme a matrícula → associe um professor → o professor cria a ficha → o aluno consulta o treino.

Dados persistidos em `server/data/serfit.sqlite`. Não versione `.env` nem o banco.

Banco novo **sem** contas de exemplo:

```dotenv
SEED_DEMO=false
ADMIN_EMAIL=seu-gerente@seu-dominio.com
ADMIN_NAME=Gerente SerFit
ADMIN_PASSWORD=uma-senha-forte-escolhida-por-voce
```

## Funcionalidades

| Perfil | O que faz |
| --- | --- |
| Visitante | Academia, planos, modalidades, horários, contato e cadastro |
| Aluno | Visão geral, ficha de treino, plano/matrícula e perfil |
| Professor | Alunos atribuídos; criação e edição de fichas |
| Gerente | Usuários, matrículas, planos e modalidades |

Também: validação no cliente e no servidor, estados de carregamento, rotas por perfil e layout responsivo (teclado, foco visível, redução de movimento).

## Planos e identidade

| Plano | Valor | Benefícios |
| --- | --- | --- |
| Básico | R$ 89,00 | Musculação 08h–11h e 15h–18h |
| Normal | R$ 100,00 | Musculação sem restrição de horário |
| Intermediário | R$ 110,00 | Sem restrição + Karatê/Boxe/Zumba/Jump + nutrição |
| Pro | R$ 150,00 | Todos os serviços: aulas, personal, nutrição e avaliações |

**Horário:** segunda a sexta, 05h à meia-noite · sábado, 05h às 12h.

| Cor | Uso |
| --- | --- |
| Verde `#009B4D` | Marca e ações principais |
| Amarelo `#FFCC00` | Chamadas e plano em destaque |
| Marfim `#FAF5E9` | Fundo |

Fontes Anton e Manrope (Fontsource, locais). Endereço, telefone e e-mail reais ainda pendentes — atualize `siteInfo` em `shared/seed.js` antes de publicar.

## Estrutura

```text
frontend/     Interface (páginas, context)
backend/      API (em construção nesta organização)
docs/         API.md e correspondência com o DRS
README.md
LICENSE
```

Rotas e requisitos: [`docs/API.md`](docs/API.md) · [`docs/REQUISITOS.md`](docs/REQUISITOS.md).

## Segurança

- Senhas com **scrypt**; sessões em cookie **HttpOnly**, **SameSite=Strict** e **Secure** em produção
- Autorização na API por perfil; cadastro público não escolhe o papel
- Contas inativas não entram; inativação revoga sessões
- Rate limit de login/cadastro, Helmet, validação e SQL parametrizado
- Professor com alunos ativos não pode ser inativado sem reatribuição

Produção: `NODE_ENV=production` e `HOST` / `PORT` / `CLIENT_ORIGIN` corretos. `TRUST_PROXY=true` só atrás de proxy confiável.

## Backup e testes

```bash
npm run backup
npm run backup -- ./backups/minha-copia.sqlite
npm test
npm run build
```

Há **11 testes** de integração da API. Restauração: pare a API, aponte `DATABASE_PATH` para a cópia e reinicie.

## Escopo e pendências

- Marca **SerFit** (não “Self Fit”)
- Cadastro: nome, e-mail, senha e plano; telefone opcional
- Matrícula inicia **Em análise**; o gerente confirma **Ativa**
- Sem pagamento online, agendamento, recuperação de senha, catraca ou relatórios financeiros neste escopo

Licença: [MIT](LICENSE).
