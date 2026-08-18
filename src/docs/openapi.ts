import type { Env } from '../config/env'
import { publicUrl } from '../lib/https'

export function createOpenApiSpec(env: Env) {
  const serverUrl = publicUrl(env)

  return {
    openapi: '3.0.3',
    info: {
      title: 'Vandrae Admin API',
      description:
        'Faça POST /admin/auth/login para receber `token` (access) e `refreshToken`. Nas rotas /admin, envie Authorization: Bearer <token>. Quando o access expirar, chame POST /admin/auth/refresh.',
      version: '0.1.0',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Servidor local',
      },
    ],
    tags: [
      { name: 'Health', description: 'Saúde da API' },
      { name: 'Auth', description: 'Autenticação de administrador' },
      { name: 'Dashboard', description: 'Visão geral do painel' },
      { name: 'Trails', description: 'Trilhas cadastradas' },
      { name: 'Reports', description: 'Denúncias da comunidade' },
      { name: 'Reviews', description: 'Avaliações e comentários' },
      { name: 'Users', description: 'Usuários do painel e do app' },
      { name: 'Access', description: 'E-mails autorizados a entrar no painel' },
      { name: 'Logs', description: 'Logs recentes da API' },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        AdminUser: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'admin-1' },
            name: { type: 'string', example: 'Administrador' },
            email: { type: 'string', format: 'email', example: 'admin@vandrae.com' },
            role: { type: 'string', enum: ['admin', 'user'] },
          },
        },
        AuthSession: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/AdminUser' },
            token: { type: 'string', description: 'Access token JWT (curto)' },
            refreshToken: { type: 'string', description: 'Refresh token (longo, rotacionado)' },
          },
        },
        DashboardStats: {
          type: 'object',
          properties: {
            trails: { type: 'integer', example: 0 },
            pendingModeration: { type: 'integer', example: 0 },
            recentContributions: { type: 'integer', example: 0 },
            appUsers: { type: 'integer', example: 0 },
            authFailures: { type: 'integer', example: 0 },
            recentTrails: { type: 'array', items: { type: 'object' } },
            recentReports: { type: 'array', items: { type: 'object' } },
            failuresByDay: { type: 'array', items: { type: 'object' } },
          },
        },
        ErrorMessage: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Verifica se a API está no ar',
          security: [],
          responses: {
            200: {
              description: 'API disponível',
            },
          },
        },
      },
      '/admin/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login de administrador',
          description:
            'Rota pública. Devolve `token` (JWT curto) e `refreshToken`. Nas próximas requisições, envie `Authorization: Bearer <token>`.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: {
                      type: 'string',
                      format: 'email',
                      example: 'admin@vandrae.com',
                    },
                    password: {
                      type: 'string',
                      example: 'vandrae-admin',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Sessão criada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthSession' },
                },
              },
            },
            401: {
              description: 'Credenciais inválidas',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ErrorMessage' },
                },
              },
            },
          },
        },
      },
      '/admin/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Renova o access token',
          description:
            'Rota pública. Envie o `refreshToken` atual. A API devolve um novo par de tokens (rotação).',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Nova sessão',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AuthSession' },
                },
              },
            },
            401: {
              description: 'Refresh token inválido, expirado ou reutilizado',
            },
          },
        },
      },
      '/admin/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Encerra a sessão',
          description: 'Rota pública. Revoga o refresh token no banco. O access token deixa de valer na hora.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: {
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            204: {
              description: 'Sessão revogada',
            },
          },
        },
      },
      '/admin/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Administrador autenticado',
          responses: {
            200: {
              description: 'Usuário da sessão',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: { $ref: '#/components/schemas/AdminUser' },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
      },
      '/admin/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Totais da visão geral',
          responses: {
            200: {
              description: 'Estatísticas do painel',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DashboardStats' },
                },
              },
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
      },
      '/admin/trails': {
        get: {
          tags: ['Trails'],
          summary: 'Lista trilhas',
          parameters: [
            {
              name: 'q',
              in: 'query',
              schema: { type: 'string' },
              description: 'Busca por nome, código ou autor',
            },
            {
              name: 'ativo',
              in: 'query',
              schema: { type: 'string', enum: ['true', 'false', 'all'] },
            },
          ],
          responses: {
            200: {
              description: 'Trilhas cadastradas',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
        post: {
          tags: ['Trails'],
          summary: 'Cria uma trilha',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nome', 'trajeto'],
                  properties: {
                    nome: { type: 'string' },
                    descricao: { type: 'string', nullable: true },
                    trajeto: {
                      type: 'array',
                      description: 'Pares [longitude, latitude]',
                      items: {
                        type: 'array',
                        items: { type: 'number' },
                        minItems: 2,
                        maxItems: 2,
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Trilha criada' },
          },
        },
      },
      '/admin/trails/{id}': {
        get: {
          tags: ['Trails'],
          summary: 'Detalhe de uma trilha',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Trilha com pontos e fotos',
            },
            404: {
              description: 'Trilha não encontrada',
            },
          },
        },
        patch: {
          tags: ['Trails'],
          summary: 'Atualiza nome, descrição ou status da trilha',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string' },
                    descricao: { type: 'string', nullable: true },
                    ativo: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Trilha atualizada',
            },
            404: {
              description: 'Trilha não encontrada',
            },
          },
        },
      },
      '/admin/trails/{id}/points': {
        post: {
          tags: ['Trails'],
          summary: 'Adiciona um ponto de interesse',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['tipo', 'nome', 'lat', 'lng'],
                  properties: {
                    tipo: { type: 'string' },
                    nome: { type: 'string' },
                    descricao: { type: 'string', nullable: true },
                    lat: { type: 'number' },
                    lng: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Ponto adicionado' },
          },
        },
      },
      '/admin/trails/{id}/photos': {
        post: {
          tags: ['Trails'],
          summary: 'Adiciona uma foto (base64 / data URL)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['arquivo'],
                  properties: {
                    arquivo: { type: 'string' },
                    contentType: { type: 'string' },
                    descricao: { type: 'string', nullable: true },
                    pontosTrilhaId: { type: 'string', format: 'uuid', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Foto adicionada' },
          },
        },
      },
      '/admin/reports': {
        get: {
          tags: ['Reports'],
          summary: 'Lista denúncias',
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['PENDENTE', 'EM_ANALISE', 'ACEITA', 'REJEITADA'],
              },
            },
          ],
          responses: {
            200: { description: 'Fila de denúncias' },
          },
        },
      },
      '/admin/reports/{id}': {
        patch: {
          tags: ['Reports'],
          summary: 'Atualiza o status da denúncia. ACEITA oculta a trilha.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['PENDENTE', 'EM_ANALISE', 'ACEITA', 'REJEITADA'],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Denúncia atualizada' },
          },
        },
      },
      '/admin/reviews': {
        get: {
          tags: ['Reviews'],
          summary: 'Lista avaliações',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            {
              name: 'oculto',
              in: 'query',
              schema: { type: 'string', enum: ['true', 'false', 'all'] },
            },
          ],
          responses: {
            200: { description: 'Avaliações' },
          },
        },
      },
      '/admin/reviews/{id}': {
        patch: {
          tags: ['Reviews'],
          summary: 'Oculta ou exibe um comentário',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['oculto'],
                  properties: { oculto: { type: 'boolean' } },
                },
              },
            },
          },
          responses: {
            204: { description: 'Avaliação atualizada' },
          },
        },
      },
      '/admin/users': {
        get: {
          tags: ['Users'],
          summary: 'Lista usuários',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' } },
            {
              name: 'role',
              in: 'query',
              schema: { type: 'string', enum: ['admin', 'user', 'all'] },
            },
          ],
          responses: {
            200: {
              description: 'Usuários cadastrados',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Cria um administrador',
          description:
            'Grava na tabela usuario. O cadastro pelo painel sempre define role ADMIN.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: [
                    'nome',
                    'email',
                    'senha',
                    'data_nascimento',
                    'cidade',
                    'estado',
                  ],
                  properties: {
                    nome: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    senha: { type: 'string', minLength: 6 },
                    data_nascimento: { type: 'string', format: 'date', example: '1995-04-12' },
                    cidade: { type: 'string' },
                    estado: { type: 'string', example: 'SP' },
                    acesso_painel: { type: 'boolean', default: true },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Administrador criado',
            },
            409: {
              description: 'E-mail já cadastrado',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
      },
      '/admin/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Detalhe de um usuário do app ou do painel',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: { description: 'Usuário com atividade' },
            404: { description: 'Usuário não encontrado' },
          },
        },
        patch: {
          tags: ['Users'],
          summary: 'Ativa ou desativa uma conta',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ativo'],
                  properties: { ativo: { type: 'boolean' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'Usuário atualizado' },
          },
        },
      },
      '/admin/access/emails': {
        get: {
          tags: ['Access'],
          summary: 'Lista e-mails autorizados no painel',
          responses: {
            200: {
              description: 'Lista de e-mails',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
        post: {
          tags: ['Access'],
          summary: 'Autoriza um e-mail a entrar no painel',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'E-mail autorizado',
            },
            409: {
              description: 'E-mail já autorizado',
            },
          },
        },
        delete: {
          tags: ['Access'],
          summary: 'Remove um e-mail da lista autorizada',
          parameters: [
            {
              name: 'email',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'email' },
            },
          ],
          responses: {
            204: {
              description: 'E-mail removido',
            },
            400: {
              description: 'Não é permitido remover o próprio e-mail ou o último da lista',
            },
          },
        },
      },
      '/admin/logs': {
        get: {
          tags: ['Logs'],
          summary: 'Últimos logs da API',
          responses: {
            200: {
              description: 'Lista de logs em memória',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
      },
      '/admin/logs/stream': {
        get: {
          tags: ['Logs'],
          summary: 'Stream ao vivo dos logs (SSE)',
          responses: {
            200: {
              description: 'text/event-stream',
            },
            401: {
              description: 'Token ausente ou inválido',
            },
          },
        },
      },
    },
  } as const
}
