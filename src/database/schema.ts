export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo INTEGER NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255),
    data_nascimento DATE NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    estado VARCHAR(255) NOT NULL,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_modificacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'password',
    google_sub VARCHAR(255),
    CONSTRAINT chk_usuario_role CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_usuario_auth_provider CHECK (auth_provider IN ('password', 'google'))
  )`,
  `CREATE TABLE IF NOT EXISTS admin_email_autorizado (
    email VARCHAR(255) PRIMARY KEY,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sessao_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    access_token_jti VARCHAR(64),
    user_agent VARCHAR(255),
    ip VARCHAR(45),
    data_expiracao TIMESTAMPTZ NOT NULL,
    data_revogacao TIMESTAMPTZ,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_ultimo_uso TIMESTAMPTZ,
    CONSTRAINT fk_sessao_usuario
      FOREIGN KEY (usuario_id)
      REFERENCES usuario(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sessao_usuario ON sessao_usuario(usuario_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessao_access_jti ON sessao_usuario(access_token_jti)`,
  `DO $$
BEGIN
  IF to_regclass('public.fotografia') IS NOT NULL THEN
    ALTER TABLE fotografia ADD COLUMN IF NOT EXISTS arquivo BYTEA;
    ALTER TABLE fotografia ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'image/jpeg';
    ALTER TABLE fotografia ALTER COLUMN url DROP NOT NULL;
    ALTER TABLE fotografia ADD COLUMN IF NOT EXISTS pontos_trilha_id UUID;
    IF to_regclass('public.pontos_trilha') IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'fk_fotografia_ponto'
       ) THEN
      ALTER TABLE fotografia
        ADD CONSTRAINT fk_fotografia_ponto
        FOREIGN KEY (pontos_trilha_id)
        REFERENCES pontos_trilha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
  END IF;
  IF to_regclass('public.avaliacao') IS NOT NULL THEN
    ALTER TABLE avaliacao ADD COLUMN IF NOT EXISTS oculto BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END $$`,
  `CREATE TABLE IF NOT EXISTS auditoria (
    id VARCHAR(80) PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    ip VARCHAR(45),
    status INTEGER,
    categoria VARCHAR(20),
    ator VARCHAR(255),
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'auditoria'
      AND column_name = 'id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE auditoria ALTER COLUMN id TYPE VARCHAR(80) USING id::text;
  END IF;
END $$`,
  `CREATE INDEX IF NOT EXISTS idx_auditoria_data ON auditoria(data_cadastro DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_auditoria_status ON auditoria(status)`,
  `DO $$
BEGIN
  ALTER TABLE usuario ALTER COLUMN senha DROP NOT NULL;
  ALTER TABLE usuario ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'password';
  ALTER TABLE usuario ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_usuario_auth_provider'
  ) THEN
    ALTER TABLE usuario
      ADD CONSTRAINT chk_usuario_auth_provider
      CHECK (auth_provider IN ('password', 'google'));
  END IF;
END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_google_sub ON usuario(google_sub) WHERE google_sub IS NOT NULL`,
  `DO $$
BEGIN
  IF to_regclass('public.trilha') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS aviso_trilha (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trilha_id UUID NOT NULL,
      usuario_id UUID NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      descricao TEXT,
      localizacao GEOGRAPHY(POINT, 4326) NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_aviso_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_aviso_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT chk_aviso_tipo
        CHECK (
          tipo IN (
            'DESLIZAMENTO',
            'ARVORE_CAIDA',
            'RIO_CHEIO',
            'TRILHA_FECHADA',
            'PERIGO',
            'OUTRO'
          )
        )
    );
  END IF;
  IF to_regclass('public.aviso_trilha') IS NOT NULL THEN
    ALTER TABLE aviso_trilha ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVO';
    ALTER TABLE aviso_trilha ADD COLUMN IF NOT EXISTS data_resolucao TIMESTAMPTZ;
    ALTER TABLE aviso_trilha ADD COLUMN IF NOT EXISTS resolvido_por_id UUID;
    ALTER TABLE aviso_trilha ADD COLUMN IF NOT EXISTS arquivo BYTEA;
    ALTER TABLE aviso_trilha ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'image/jpeg';
    ALTER TABLE aviso_trilha DROP CONSTRAINT IF EXISTS chk_aviso_status;
    ALTER TABLE aviso_trilha
      ADD CONSTRAINT chk_aviso_status
      CHECK (status IN ('ATIVO', 'RESOLVIDO'));
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_aviso_resolvido_por') THEN
      ALTER TABLE aviso_trilha
        ADD CONSTRAINT fk_aviso_resolvido_por
        FOREIGN KEY (resolvido_por_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
    CREATE TABLE IF NOT EXISTS aviso_resolucao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      aviso_trilha_id UUID NOT NULL,
      usuario_id UUID NOT NULL,
      data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_aviso_resolucao_aviso
        FOREIGN KEY (aviso_trilha_id)
        REFERENCES aviso_trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_aviso_resolucao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    );
  END IF;
  IF to_regclass('public.pontos_trilha') IS NOT NULL THEN
    ALTER TABLE pontos_trilha ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
  IF to_regclass('public.denuncias') IS NOT NULL THEN
    ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS alvo VARCHAR(20) NOT NULL DEFAULT 'TRILHA';
    ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS pontos_trilha_id UUID;
    ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS fotografia_id UUID;
    ALTER TABLE denuncias ADD COLUMN IF NOT EXISTS aviso_trilha_id UUID;
    ALTER TABLE denuncias DROP CONSTRAINT IF EXISTS chk_denuncia_alvo;
    ALTER TABLE denuncias
      ADD CONSTRAINT chk_denuncia_alvo
      CHECK (alvo IN ('TRILHA', 'PONTO', 'FOTO', 'AVISO'));
    IF to_regclass('public.pontos_trilha') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_denuncia_ponto') THEN
      ALTER TABLE denuncias
        ADD CONSTRAINT fk_denuncia_ponto
        FOREIGN KEY (pontos_trilha_id)
        REFERENCES pontos_trilha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
    IF to_regclass('public.fotografia') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_denuncia_foto') THEN
      ALTER TABLE denuncias
        ADD CONSTRAINT fk_denuncia_foto
        FOREIGN KEY (fotografia_id)
        REFERENCES fotografia(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
    IF to_regclass('public.aviso_trilha') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_denuncia_aviso') THEN
      ALTER TABLE denuncias
        ADD CONSTRAINT fk_denuncia_aviso
        FOREIGN KEY (aviso_trilha_id)
        REFERENCES aviso_trilha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
    END IF;
  END IF;
END $$`,
  `DO $$
BEGIN
  IF to_regclass('public.aviso_trilha') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_aviso_trilha ON aviso_trilha(trilha_id);
    CREATE INDEX IF NOT EXISTS idx_aviso_trilha_localizacao ON aviso_trilha USING GIST (localizacao);
  END IF;
  IF to_regclass('public.aviso_resolucao') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_aviso_resolucao
      ON aviso_resolucao (aviso_trilha_id, usuario_id);
  END IF;
END $$`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_trilha_aberta
     ON denuncias (usuario_id, trilha_id)
     WHERE alvo = 'TRILHA' AND status IN ('PENDENTE', 'EM_ANALISE')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_ponto_aberta
     ON denuncias (usuario_id, pontos_trilha_id)
     WHERE alvo = 'PONTO' AND pontos_trilha_id IS NOT NULL AND status IN ('PENDENTE', 'EM_ANALISE')`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_foto_aberta
     ON denuncias (usuario_id, fotografia_id)
     WHERE alvo = 'FOTO' AND fotografia_id IS NOT NULL AND status IN ('PENDENTE', 'EM_ANALISE')`,
  `DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'denuncias' AND column_name = 'aviso_trilha_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_denuncia_aviso_aberta
      ON denuncias (usuario_id, aviso_trilha_id)
      WHERE alvo = 'AVISO' AND aviso_trilha_id IS NOT NULL AND status IN ('PENDENTE', 'EM_ANALISE');
  END IF;
  IF to_regclass('public.trilha') IS NOT NULL AND to_regclass('public.usuario') IS NOT NULL THEN
    CREATE TABLE IF NOT EXISTS trilha_conclusao (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trilha_id UUID NOT NULL,
      usuario_id UUID NOT NULL,
      data_inicio TIMESTAMPTZ,
      data_fim TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_conclusao_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
      CONSTRAINT fk_conclusao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      CONSTRAINT uq_trilha_conclusao_usuario UNIQUE (usuario_id, trilha_id)
    );
    CREATE INDEX IF NOT EXISTS idx_trilha_conclusao_trilha ON trilha_conclusao(trilha_id);
  END IF;
  IF to_regclass('public.usuario') IS NOT NULL THEN
    ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto BYTEA;
    ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto_content_type VARCHAR(100);
  END IF;
END $$`,
]
