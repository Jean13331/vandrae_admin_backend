import type { Env } from '../config/env'
import { publicUrl } from '../lib/https'

export function createOpenApiSpec(env: Env) {
  const serverUrl = publicUrl(env)

  return {
    openapi: '3.0.3',
    info: {
      title: 'Vandrae API',
      description:
        'API do painel admin (`/admin`) e do app (`/auth`, `/trails`).\n\n**Painel:** POST `/admin/auth/login` → `token` + `refreshToken`. Nas rotas `/admin`, envie `Authorization: Bearer <token>`.\n\n**App:** POST `/auth/login`, `/auth/register` ou `/auth/google` → o mesmo par de tokens. Nas rotas `/trails` e `/auth/me`, envie o Bearer do app.',
      version: '0.2.0',
    },
    servers: [
      {
        url: serverUrl,
        description: 'Servidor local',
      },
    ],
    tags: [
      { name: 'Health', description: 'Saúde da API' },
      { name: 'App Auth', description: 'Cadastro e login do aplicativo' },
      { name: 'App Trails', description: 'Trilhas ativas no mapa do app' },
      { name: 'Auth', description: 'Autenticação de administrador' },
      { name: 'Dashboard', description: 'Visão geral do painel' },
      { name: 'Trails', description: 'Trilhas no painel (CRUD, pontos e fotos)' },
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
        AppUser: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'] },
          },
        },
        AppAuthSession: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/AppUser' },
            token: { type: 'string', description: 'Access token JWT do app' },
            refreshToken: { type: 'string' },
          },
        },
        GoogleNeedsProfile: {
          type: 'object',
          properties: {
            needsProfile: { type: 'boolean', example: true },
            profileToken: { type: 'string', description: 'JWT temporário (cerca de 20 min) para POST /auth/google/complete' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
          },
        },
        ExploreTrailPoint: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            codigo: { type: 'integer' },
            tipo: {
              type: 'string',
              enum: [
                'ENTRADA',
                'ESTACIONAMENTO',
                'CACHOEIRA',
                'MIRANTE',
                'PONTO_DE_AGUA',
                'PONTE',
                'ACAMPAMENTO',
                'BANHEIRO',
                'PERIGO',
              ],
            },
            nome: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            lat: { type: 'number', nullable: true },
            lng: { type: 'number', nullable: true },
          },
        },
        ExploreTrailPhoto: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            codigo: { type: 'integer' },
            url: {
              type: 'string',
              description: 'Caminho relativo, ex. /trails/{id}/photos/{photoId}. Baixe com o Bearer do app.',
            },
            descricao: { type: 'string', nullable: true },
          },
        },
        ExploreTrail: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            descricao: { type: 'string', nullable: true },
            comprimentoKm: { type: 'number', nullable: true },
            notaMedia: { type: 'number', nullable: true },
            inicio: {
              type: 'object',
              nullable: true,
              properties: { lat: { type: 'number' }, lng: { type: 'number' } },
            },
            fim: {
              type: 'object',
              nullable: true,
              properties: { lat: { type: 'number' }, lng: { type: 'number' } },
            },
            trajeto: {
              type: 'object',
              nullable: true,
              description: 'GeoJSON LineString ou MultiLineString (coordenadas [lng, lat])',
            },
            pontosDetalhe: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExploreTrailPoint' },
            },
            fotografias: {
              type: 'array',
              items: { $ref: '#/components/schemas/ExploreTrailPhoto' },
            },
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
      '/auth/register': {
        post: {
          tags: ['App Auth'],
          summary: 'Cria conta do app',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'birthDate', 'city', 'state'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6 },
                    birthDate: { type: 'string', example: '12/04/1995', description: 'DD/MM/AAAA ou AAAA-MM-DD' },
                    city: { type: 'string' },
                    state: { type: 'string', example: 'SP' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Conta criada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppAuthSession' },
                },
              },
            },
            409: { description: 'E-mail já cadastrado' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['App Auth'],
          summary: 'Login do app (e-mail e senha)',
          description: 'Contas só Google recebem 401: "Esta conta entra com o Google."',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Sessão do app',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppAuthSession' },
                },
              },
            },
            401: { description: 'Credenciais inválidas' },
          },
        },
      },
      '/auth/google': {
        post: {
          tags: ['App Auth'],
          summary: 'Login ou início de cadastro com Google',
          description:
            'Envie `idToken` **ou** `code` + `redirectUri` (+ `codeVerifier` no PKCE). Usuário existente devolve sessão. Usuário novo devolve `needsProfile` + `profileToken`.',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    idToken: { type: 'string' },
                    code: { type: 'string' },
                    redirectUri: { type: 'string', format: 'uri' },
                    codeVerifier: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Sessão ou pedido de perfil (needsProfile)',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      { $ref: '#/components/schemas/AppAuthSession' },
                      { $ref: '#/components/schemas/GoogleNeedsProfile' },
                    ],
                  },
                },
              },
            },
            401: { description: 'Token ou código Google inválido' },
          },
        },
      },
      '/auth/google/complete': {
        post: {
          tags: ['App Auth'],
          summary: 'Conclui o primeiro cadastro Google',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['profileToken', 'birthDate', 'city', 'state'],
                  properties: {
                    profileToken: { type: 'string' },
                    birthDate: { type: 'string', example: '12/04/1995' },
                    city: { type: 'string' },
                    state: { type: 'string', example: 'SP' },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'Conta Google criada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppAuthSession' },
                },
              },
            },
            401: { description: 'profileToken expirado' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['App Auth'],
          summary: 'Renova o access token do app',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Nova sessão',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AppAuthSession' },
                },
              },
            },
            401: { description: 'Refresh inválido ou expirado' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['App Auth'],
          summary: 'Encerra a sessão do app',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            204: { description: 'Sessão revogada' },
          },
        },
      },
      '/auth/me': {
        get: {
          tags: ['App Auth'],
          summary: 'Usuário autenticado do app',
          responses: {
            200: {
              description: 'Usuário da sessão',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { user: { $ref: '#/components/schemas/AppUser' } },
                  },
                },
              },
            },
            401: { description: 'Token ausente ou inválido' },
          },
        },
      },
      '/trails': {
        get: {
          tags: ['App Trails'],
          summary: 'Lista trilhas ativas para o mapa',
          description:
            'Requer JWT do app. Inclui trajeto GeoJSON, início/fim, pontos de interesse e até 8 fotos ativas por trilha.',
          responses: {
            200: {
              description: 'Trilhas ativas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      trails: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ExploreTrail' },
                      },
                    },
                  },
                },
              },
            },
            401: { description: 'Token ausente ou inválido' },
          },
        },
        post: {
          tags: ['App Trails'],
          summary: 'Envia uma trilha da comunidade para revisão',
          description:
            'Cria a trilha como inativa. Ela só aparece no mapa depois que um administrador publicar no painel.',
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
                    pontos: { type: 'array', items: { type: 'object' } },
                    fotos: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Trilha criada e aguardando publicação' },
            401: { description: 'Token ausente ou inválido' },
          },
        },
      },
      '/trails/mine': {
        get: {
          tags: ['App Trails'],
          summary: 'Lista as trilhas enviadas pelo usuário logado',
          responses: {
            200: { description: 'Trilhas do usuário, inclusive não publicadas' },
            401: { description: 'Token ausente ou inválido' },
          },
        },
      },
      '/trails/{id}': {
        get: {
          tags: ['App Trails'],
          summary: 'Detalhe de uma trilha ativa, com elevação',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: { description: 'Trilha com pontos, fotos e perfil de elevação' },
            401: { description: 'Token ausente ou inválido' },
            404: { description: 'Trilha inativa ou não encontrada' },
          },
        },
      },
      '/trails/{id}/photos/{photoId}': {
        get: {
          tags: ['App Trails'],
          summary: 'Baixa o arquivo de uma foto da trilha',
          description: 'Só fotos ativas de trilhas ativas. Envie o Bearer do app.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'photoId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Imagem (jpeg/png)',
              content: {
                'image/jpeg': { schema: { type: 'string', format: 'binary' } },
                'image/png': { schema: { type: 'string', format: 'binary' } },
              },
            },
            401: { description: 'Token ausente ou inválido' },
            404: { description: 'Foto ou trilha não encontrada' },
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
      '/admin/trails/{id}/photos/{photoId}': {
        get: {
          tags: ['Trails'],
          summary: 'Baixa o arquivo de uma foto (painel)',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
            {
              name: 'photoId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            200: {
              description: 'Imagem (jpeg/png)',
              content: {
                'image/jpeg': { schema: { type: 'string', format: 'binary' } },
                'image/png': { schema: { type: 'string', format: 'binary' } },
              },
            },
            404: { description: 'Foto não encontrada' },
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
