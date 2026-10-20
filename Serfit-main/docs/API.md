# API SerFit

Base: `/api`. As rotas privadas usam o cookie `serfit_session`, criado no login/cadastro. Envie `Content-Type: application/json` nas alterações. Erros retornam `{ "message": "mensagem compreensível" }` e o status HTTP correspondente.

| Método | Rota | Acesso | Resultado |
| --- | --- | --- | --- |
| GET | `/health` | Público | Saúde do serviço |
| GET | `/catalog` | Público | Planos e modalidades disponíveis |
| POST | `/auth/register` | Público | Cria aluno, matrícula em análise e sessão |
| POST | `/auth/login` | Público | Autentica uma conta ativa |
| POST | `/auth/logout` | Público | Invalida a sessão atual |
| GET | `/auth/me` | Autenticado | Usuário da sessão, sem senha |
| PATCH | `/me` | Autenticado | Atualiza nome, e-mail e telefone |
| GET | `/me/dashboard` | Aluno | Perfil, plano, responsável e ficha do próprio aluno |
| GET | `/teacher/students` | Professor | Alunos atribuídos ao professor |
| GET | `/students/:studentId/workouts` | Aluno/professor/gerente | Ficha com validação de proprietário ou atribuição |
| POST | `/students/:studentId/workouts` | Professor atribuído | Cria uma ficha |
| PATCH | `/students/:studentId/workouts/:id` | Professor atribuído | Atualiza uma ficha |
| GET | `/admin/users` | Gerente | Lista usuários |
| POST | `/admin/users` | Gerente | Cria aluno ou professor |
| PATCH | `/admin/users/:id` | Gerente | Atualiza cadastro, senha opcional, situação e relações |
| GET | `/admin/plans` | Gerente | Lista planos, inclusive arquivados |
| POST | `/admin/plans` | Gerente | Cria plano |
| PATCH | `/admin/plans/:id` | Gerente | Atualiza/arquiva plano |
| GET | `/admin/modalities` | Gerente | Lista modalidades, inclusive arquivadas |
| POST | `/admin/modalities` | Gerente | Cria modalidade |
| PATCH | `/admin/modalities/:id` | Gerente | Atualiza/arquiva modalidade |

## Corpos de requisição

Cadastro:

```json
{ "name": "Nome do aluno", "email": "aluno@exemplo.com", "password": "senha-de-8-ou-mais-caracteres", "phone": "", "planId": 3 }
```

Usuário administrativo: os mesmos campos acima, mais `role` (`aluno` ou `professor`), `active` (booleano), `teacherId` (ID ou null) e `membershipStatus` (`Em análise` ou `Ativa`). Na edição, envie os campos completos; `password` é opcional. O perfil existente é preservado e contas de gerente não são editadas por essa rota.

Plano:

```json
{ "name": "Básico", "price": 89, "subtitle": "Um começo no seu tempo.", "benefits": ["Musculação fora dos horários de pico", "08h às 11h e 15h às 18h"], "featured": false, "active": true }
```

Modalidade:

```json
{ "name": "Boxe", "category": "ENERGIA", "description": "Técnica, intensidade e disposição.", "icon": "boxing", "active": true }
```

Ficha:

```json
{ "title": "Treino A", "focus": "Pernas", "instructions": "Orientações do professor.", "exercises": [{ "name": "Agachamento", "sets": 3, "reps": "12", "load": "20 kg", "rest": "60 s" }] }
```

`sets` deve ser um inteiro de 1 a 20. A ficha aceita de 1 a 30 exercícios. Séries, repetições, carga e intervalo devem ser informados. As fichas iniciais são exemplos, não uma prescrição universal.

## Status

| Código | Significado |
| --- | --- |
| 200 / 201 | Consulta/alteração concluída ou registro criado |
| 400 | Campo inválido ou relação inconsistente |
| 401 | Sessão ausente, expirada/inativa ou credenciais inválidas |
| 403 | Perfil, atribuição ou origem não autorizados |
| 404 | Recurso não encontrado |
| 409 | E-mail/registro em conflito |
| 415 | Formato de requisição não suportado |
| 429 | Limite de tentativas de autenticação |
| 500 | Falha interna, com mensagem pública genérica |
