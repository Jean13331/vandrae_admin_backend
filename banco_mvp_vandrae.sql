-- =========================================================
-- EXTENSÃO POSTGIS
-- =========================================================

CREATE EXTENSION IF NOT EXISTS postgis;


-- =========================================================
-- USUÁRIO
-- =========================================================

CREATE TABLE IF NOT EXISTS usuario (
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

    CONSTRAINT chk_usuario_role
        CHECK (role IN ('USER', 'ADMIN')),
    CONSTRAINT chk_usuario_auth_provider
        CHECK (auth_provider IN ('password', 'google'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_google_sub
ON usuario(google_sub)
WHERE google_sub IS NOT NULL;


-- =========================================================
-- E-MAILS AUTORIZADOS NO PAINEL ADMIN
-- =========================================================
-- Mesmo com role ADMIN, só estes e-mails entram no painel.

CREATE TABLE IF NOT EXISTS admin_email_autorizado (
    email VARCHAR(255) PRIMARY KEY,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- SESSÃO (REFRESH TOKEN)
-- =========================================================
-- Access token (JWT): NÃO gravar. É curto (minutos), validado por assinatura + exp.
-- Refresh token: gravar só o HASH. Serve para emitir um novo access token
-- e para revogar a sessão (logout, troca de senha, dispositivo perdido).

CREATE TABLE IF NOT EXISTS sessao_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,

    -- SHA-256/bcrypt do refresh token. Nunca armazene o token em texto puro.
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,

    -- Identificador do access token atual (claim jti), só se quiser
    -- invalidar o JWT antes do exp (logout imediato). Opcional.
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
);

CREATE INDEX IF NOT EXISTS idx_sessao_usuario
ON sessao_usuario(usuario_id);

CREATE INDEX IF NOT EXISTS idx_sessao_access_jti
ON sessao_usuario(access_token_jti);

CREATE INDEX IF NOT EXISTS idx_sessao_expiracao
ON sessao_usuario(data_expiracao)
WHERE data_revogacao IS NULL;


-- =========================================================
-- TRILHA
-- =========================================================

CREATE TABLE IF NOT EXISTS trilha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    codigo INTEGER NOT NULL UNIQUE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Trajeto completo da trilha
    trajeto GEOGRAPHY(LINESTRING, 4326) NOT NULL,

    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_modificacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_trilha_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);


-- =========================================================
-- PONTOS DA TRILHA
-- =========================================================

CREATE TABLE IF NOT EXISTS pontos_trilha (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trilha_id UUID NOT NULL,
    codigo INTEGER NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,

    -- Localização do ponto de interesse
    localizacao GEOGRAPHY(POINT, 4326) NOT NULL,

    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ponto_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_ponto_tipo
        CHECK (
            tipo IN (
                'CACHOEIRA',
                'MIRANTE',
                'ESTACIONAMENTO',
                'ENTRADA',
                'ACAMPAMENTO',
                'PERIGO',
                'PONTE',
                'BANHEIRO',
                'PONTO_DE_AGUA'
            )
        )
);


-- =========================================================
-- FOTOGRAFIA
-- =========================================================

CREATE TABLE IF NOT EXISTS fotografia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    trilha_id UUID NOT NULL,
    codigo INTEGER NOT NULL,
    url VARCHAR(500),
    arquivo BYTEA,
    content_type VARCHAR(100) DEFAULT 'image/jpeg',
    descricao TEXT,
    pontos_trilha_id UUID,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_fotografia_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_fotografia_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_fotografia_ponto
        FOREIGN KEY (pontos_trilha_id)
        REFERENCES pontos_trilha(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


-- =========================================================
-- AVALIAÇÃO
-- =========================================================

CREATE TABLE IF NOT EXISTS avaliacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    trilha_id UUID NOT NULL,
    nota SMALLINT NOT NULL,
    comentario TEXT,
    oculto BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_avaliacao_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_avaliacao_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_avaliacao_nota
        CHECK (nota BETWEEN 1 AND 5),

    CONSTRAINT uq_avaliacao_usuario_trilha
        UNIQUE (usuario_id, trilha_id)
);


-- =========================================================
-- FAVORITO
-- =========================================================

CREATE TABLE IF NOT EXISTS favorito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    trilha_id UUID NOT NULL,
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_favorito_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT uq_favorito_usuario_trilha
        UNIQUE (usuario_id, trilha_id)
);


-- =========================================================
-- DENÚNCIAS
-- =========================================================

CREATE TABLE IF NOT EXISTS denuncias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    trilha_id UUID NOT NULL,
    motivo VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
    data_criacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_denuncia_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_denuncia_trilha
        FOREIGN KEY (trilha_id)
        REFERENCES trilha(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_denuncia_status
        CHECK (
            status IN (
                'PENDENTE',
                'EM_ANALISE',
                'ACEITA',
                'REJEITADA'
            )
        )
);


-- =========================================================
-- ÍNDICES ESPACIAIS
-- =========================================================

CREATE INDEX idx_trilha_trajeto
ON trilha
USING GIST (trajeto);

CREATE INDEX idx_pontos_trilha_localizacao
ON pontos_trilha
USING GIST (localizacao);

CREATE INDEX idx_trilha_usuario
ON trilha(usuario_id);

CREATE INDEX idx_fotografia_trilha
ON fotografia(trilha_id);

CREATE INDEX idx_fotografia_ponto
ON fotografia(pontos_trilha_id);

CREATE INDEX idx_avaliacao_trilha
ON avaliacao(trilha_id);

CREATE INDEX idx_denuncia_trilha
ON denuncias(trilha_id);


-- =========================================================
-- AUDITORIA
-- =========================================================

CREATE TABLE IF NOT EXISTS auditoria (
    id VARCHAR(80) PRIMARY KEY,
    nivel VARCHAR(20) NOT NULL,
    mensagem TEXT NOT NULL,
    ip VARCHAR(45),
    status INTEGER,
    categoria VARCHAR(20),
    ator VARCHAR(255),
    data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_data
ON auditoria(data_cadastro DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_status
ON auditoria(status);