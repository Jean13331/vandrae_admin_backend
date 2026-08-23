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
]
