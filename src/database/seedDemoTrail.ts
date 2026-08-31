import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Pool } from 'pg'
import { logger } from '../lib/logger'
import { hashPassword } from '../lib/password'

const DEMO_TRAIL_NAME = 'Trilha da Cachoeira do Sol'

const TRAJETO = `SRID=4326;LINESTRING(
  -46.55280 -23.25640,
  -46.55210 -23.25590,
  -46.55120 -23.25550,
  -46.55040 -23.25510,
  -46.54980 -23.25440,
  -46.55050 -23.25390,
  -46.55140 -23.25370,
  -46.55190 -23.25310,
  -46.55120 -23.25260,
  -46.55030 -23.25220,
  -46.54950 -23.25170,
  -46.54880 -23.25110,
  -46.54820 -23.25040,
  -46.54770 -23.24970,
  -46.54710 -23.24900,
  -46.54660 -23.24820,
  -46.54620 -23.24740,
  -46.54580 -23.24650
)`

const PONTOS: Array<{
  codigo: number
  tipo: string
  nome: string
  descricao: string
  lng: number
  lat: number
}> = [
  {
    codigo: 1,
    tipo: 'ESTACIONAMENTO',
    nome: 'Estacionamento da trilha',
    descricao: 'Vagas de terra batida no início do acesso.',
    lng: -46.5528,
    lat: -23.2564,
  },
  {
    codigo: 2,
    tipo: 'ENTRADA',
    nome: 'Portão de entrada',
    descricao: 'Início oficial da trilha, com placa e mapa.',
    lng: -46.5521,
    lat: -23.2559,
  },
  {
    codigo: 3,
    tipo: 'PONTO_DE_AGUA',
    nome: 'Nascente do córrego',
    descricao: 'Água para filtrar. Não beber direto da nascente.',
    lng: -46.5512,
    lat: -23.2526,
  },
  {
    codigo: 4,
    tipo: 'PONTE',
    nome: 'Ponte de madeira',
    descricao: 'Travessia estreita sobre o córrego.',
    lng: -46.5495,
    lat: -23.2517,
  },
  {
    codigo: 5,
    tipo: 'PERIGO',
    nome: 'Trecho escorregadio',
    descricao: 'Rocha lisa com musgo após chuva. Use as mãos.',
    lng: -46.5482,
    lat: -23.2504,
  },
  {
    codigo: 6,
    tipo: 'CACHOEIRA',
    nome: 'Cachoeira do Sol',
    descricao: 'Queda d’água com poço raso para descanso.',
    lng: -46.5471,
    lat: -23.249,
  },
  {
    codigo: 7,
    tipo: 'MIRANTE',
    nome: 'Mirante da Serra',
    descricao: 'Vista da serra e do vale no fim da subida.',
    lng: -46.5458,
    lat: -23.2465,
  },
]

const FOTOS: Array<{
  codigo: number
  arquivo: string
  contentType: string
  descricao: string
  tipoPonto: string
}> = [
  {
    codigo: 1,
    arquivo: 'entrada.png',
    contentType: 'image/png',
    descricao: 'Entrada da trilha, logo após o portão.',
    tipoPonto: 'ENTRADA',
  },
  {
    codigo: 2,
    arquivo: 'cachoeira.png',
    contentType: 'image/png',
    descricao: 'Cachoeira do Sol no meio do percurso.',
    tipoPonto: 'CACHOEIRA',
  },
  {
    codigo: 3,
    arquivo: 'mirante.png',
    contentType: 'image/png',
    descricao: 'Vista do mirante no topo da trilha.',
    tipoPonto: 'MIRANTE',
  },
]

function demoPhotosDir() {
  const candidates = [
    path.join(__dirname, 'demo-photos'),
    path.join(process.cwd(), 'src', 'database', 'demo-photos'),
  ]
  return candidates.find((dir) => existsSync(path.join(dir, 'entrada.png')))
}

export async function seedDemoTrail(pool: Pool) {
  const user = await pool.query<{ id: string }>(
    `SELECT id
     FROM usuario
     ORDER BY CASE WHEN role = 'ADMIN' THEN 0 ELSE 1 END, data_cadastro
     LIMIT 1`,
  )
  const usuarioId = user.rows[0]?.id
  if (!usuarioId) {
    logger.warn('[seed] nenhum usuário encontrado; trilha de exemplo não foi criada')
    return
  }

  let trilhaId = (
    await pool.query<{ id: string }>('SELECT id FROM trilha WHERE nome = $1 LIMIT 1', [DEMO_TRAIL_NAME])
  ).rows[0]?.id

  if (!trilhaId) {
    const codigoResult = await pool.query<{ next: string }>(
      'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM trilha',
    )
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO trilha (usuario_id, codigo, nome, descricao, trajeto, ativo)
       VALUES ($1, $2, $3, $4, ST_GeogFromText($5), TRUE)
       RETURNING id`,
      [
        usuarioId,
        Number(codigoResult.rows[0]?.next ?? 1),
        DEMO_TRAIL_NAME,
        'Trilha de exemplo com curvas, pontos de interesse e fotos armazenadas em binário (BYTEA).',
        TRAJETO,
      ],
    )
    trilhaId = inserted.rows[0]?.id
    logger.info(`[seed] trilha de exemplo criada: ${DEMO_TRAIL_NAME}`)
  }

  if (!trilhaId) return

  for (const ponto of PONTOS) {
    await pool.query(
      `INSERT INTO pontos_trilha (trilha_id, codigo, tipo, nome, descricao, localizacao)
       SELECT $1, $2, $3, $4, $5, ST_GeogFromText($6)
       WHERE NOT EXISTS (
         SELECT 1 FROM pontos_trilha WHERE trilha_id = $1 AND codigo = $2
       )`,
      [
        trilhaId,
        ponto.codigo,
        ponto.tipo,
        ponto.nome,
        ponto.descricao,
        `SRID=4326;POINT(${ponto.lng} ${ponto.lat})`,
      ],
    )
  }

  let fotosInseridas = 0
  let photosDir: string | undefined

  for (const foto of FOTOS) {
    const jaExiste = await pool.query(
      'SELECT 1 FROM fotografia WHERE trilha_id = $1 AND codigo = $2 LIMIT 1',
      [trilhaId, foto.codigo],
    )
    if (jaExiste.rowCount) continue

    photosDir ??= demoPhotosDir()
    if (!photosDir) {
      logger.warn('[seed] pasta de fotos de exemplo não encontrada')
      break
    }

    try {
      const arquivo = await readFile(path.join(photosDir, foto.arquivo))
      const inserted = await pool.query(
        `INSERT INTO fotografia (usuario_id, trilha_id, codigo, url, arquivo, content_type, descricao, ativo)
         SELECT $1, $2, $3, NULL, $4, $5, $6, TRUE
         WHERE NOT EXISTS (
           SELECT 1 FROM fotografia WHERE trilha_id = $2 AND codigo = $3
         )`,
        [usuarioId, trilhaId, foto.codigo, arquivo, foto.contentType, foto.descricao],
      )
      if (inserted.rowCount) fotosInseridas += 1
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.warn(`[seed] não foi possível gravar ${foto.arquivo}: ${reason}`)
    }
  }

  if (fotosInseridas > 0) {
    logger.info(`[seed] ${fotosInseridas} foto(s) de exemplo gravadas em ${DEMO_TRAIL_NAME}`)
  }

  for (const foto of FOTOS) {
    await pool.query(
      `UPDATE fotografia f
       SET pontos_trilha_id = p.id
       FROM pontos_trilha p
       WHERE f.trilha_id = $1
         AND f.codigo = $2
         AND p.trilha_id = $1
         AND p.tipo = $3
         AND f.pontos_trilha_id IS NULL`,
      [trilhaId, foto.codigo, foto.tipoPonto],
    )
  }

  await seedDemoCommunity(pool, trilhaId)
}

async function ensureUser(
  pool: Pool,
  input: { email: string; nome: string; cidade: string; estado: string },
) {
  const existing = await pool.query<{ id: string }>(
    'SELECT id FROM usuario WHERE lower(email) = lower($1) LIMIT 1',
    [input.email],
  )
  if (existing.rows[0]?.id) return existing.rows[0].id

  const passwordHash = await hashPassword('vandrae-demo')
  const codigoResult = await pool.query<{ next: string }>(
    'SELECT COALESCE(MAX(codigo), 0) + 1 AS next FROM usuario',
  )
  const inserted = await pool.query<{ id: string }>(
    `INSERT INTO usuario (codigo, nome, email, senha, data_nascimento, cidade, estado, role, ativo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'USER', TRUE)
     RETURNING id`,
    [
      Number(codigoResult.rows[0]?.next ?? 1),
      input.nome,
      input.email,
      passwordHash,
      '1994-06-12',
      input.cidade,
      input.estado,
    ],
  )
  return inserted.rows[0]?.id
}

async function seedDemoCommunity(pool: Pool, trilhaId: string) {
  const anaId = await ensureUser(pool, {
    email: 'ana.trilha@vandrae.com',
    nome: 'Ana Trilheira',
    cidade: 'Atibaia',
    estado: 'SP',
  })
  const brunoId = await ensureUser(pool, {
    email: 'bruno.caminhante@vandrae.com',
    nome: 'Bruno Caminhante',
    cidade: 'Nazaré Paulista',
    estado: 'SP',
  })
  if (!anaId || !brunoId) return

  await pool.query(
    `INSERT INTO avaliacao (usuario_id, trilha_id, nota, comentario, oculto)
     SELECT $1::uuid, $2::uuid, 5, $3::text, FALSE
     WHERE NOT EXISTS (
       SELECT 1 FROM avaliacao WHERE usuario_id = $1::uuid AND trilha_id = $2::uuid
     )`,
    [anaId, trilhaId, 'Trilha linda, bem marcada e com água no caminho.'],
  )
  await pool.query(
    `INSERT INTO avaliacao (usuario_id, trilha_id, nota, comentario, oculto)
     SELECT $1::uuid, $2::uuid, 2, $3::text, FALSE
     WHERE NOT EXISTS (
       SELECT 1 FROM avaliacao WHERE usuario_id = $1::uuid AND trilha_id = $2::uuid
     )`,
    [brunoId, trilhaId, 'Comentário ofensivo de teste para o admin ocultar.'],
  )

  const reports = [
    {
      usuarioId: anaId,
      motivo: 'Informação incorreta',
      descricao: 'O ponto da cachoeira parece estar uns 200 m deslocado no mapa.',
      status: 'PENDENTE',
    },
    {
      usuarioId: brunoId,
      motivo: 'Conteúdo impróprio',
      descricao: 'A descrição da trilha tem linguagem inadequada.',
      status: 'EM_ANALISE',
    },
  ]

  for (const report of reports) {
    await pool.query(
      `INSERT INTO denuncias (usuario_id, trilha_id, motivo, descricao, status)
       SELECT $1::uuid, $2::uuid, $3::varchar, $4::text, $5::varchar
       WHERE NOT EXISTS (
         SELECT 1 FROM denuncias
         WHERE usuario_id = $1::uuid AND trilha_id = $2::uuid AND motivo = $3::varchar
       )`,
      [report.usuarioId, trilhaId, report.motivo, report.descricao, report.status],
    )
  }
}

const isDirectRun = process.argv[1]?.includes('seedDemoTrail')

if (isDirectRun) {
  void (async () => {
    await import('dotenv/config')
    const { loadEnv } = await import('../config/env.js')
    const { connectDatabase } = await import('./index.js')
    const env = loadEnv()
    const pool = await connectDatabase(env)
    await seedDemoTrail(pool)
    await pool.end()
  })().catch((error) => {
    logger.error('[seed]', error)
    process.exit(1)
  })
}
