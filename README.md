# Vandrae Admin Backend

API administrativa do Vandrae, em Node.js + TypeScript + Express + PostgreSQL.

## Como executar

1. Copie `.env.example` para `.env` e preencha as credenciais do PostgreSQL (`DATABASE_URL` ou `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`).
2. Instale e suba a API:

```bash
npm install
npm run dev
```

A API sobe em `http://localhost:3333`. No primeiro start ela cria as tabelas necessárias e insere o administrador do `.env` se o e-mail ainda não existir.

No frontend, defina `VITE_API_URL=http://localhost:3333`.

## Acesso inicial

O login usa o administrador gravado em `admin_users`, com e-mail e senha definidos em `ADMIN_SEED_*`.

## Rotas

| Método | Caminho | Autenticação | Descrição |
| --- | --- | --- | --- |
| `GET` | `/health` | não | Saúde da API e do banco |
| `POST` | `/admin/auth/login` | não | Login de administrador |
| `GET` | `/admin/auth/me` | Bearer | Administrador autenticado |
| `GET` | `/admin/dashboard/stats` | Bearer | Totais da visão geral |

Rotas autenticadas esperam `Authorization: Bearer <token>`.
