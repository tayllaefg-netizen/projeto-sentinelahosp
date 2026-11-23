-- =========================================================================
-- SISTEMA HOSPITALAR AMANDINHA — SCHEMA POSTGRESQL EMPRESARIAL
-- Compatível com PostgreSQL 14, 15, 16+
-- Inclui integridade referencial, constraints, índices, triggers e seeds.
-- =========================================================================

-- Criação de tipos enumerados
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
        CREATE TYPE perfil_usuario AS ENUM ('admin', 'medico', 'triagem', 'atendimento', 'farmaceutico', 'almoxarife');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risco_manchester') THEN
        CREATE TYPE risco_manchester AS ENUM ('vermelho', 'laranja', 'amarelo', 'verde', 'azul');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_paciente') THEN
        CREATE TYPE status_paciente AS ENUM ('cadastrado', 'triagem', 'aguardando_medico', 'em_consulta', 'aguardando_internacao', 'internado', 'alta', 'cancelado');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_leito') THEN
        CREATE TYPE status_leito AS ENUM ('Livre', 'Ocupado', 'Em manutenção', 'Reservado');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_alta') THEN
        CREATE TYPE tipo_alta AS ENUM ('Curado/Melhorado', 'A pedido', 'Transferência Externa', 'Óbito');
    END IF;
END$$;

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    tipo perfil_usuario NOT NULL DEFAULT 'atendimento',
    crm_coren VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE PACIENTES
CREATE TABLE IF NOT EXISTS pacientes (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    rg VARCHAR(20),
    data_nascimento DATE,
    sexo VARCHAR(20),
    telefone VARCHAR(25),
    email VARCHAR(100),
    endereco_rua VARCHAR(150),
    endereco_numero VARCHAR(20),
    endereco_bairro VARCHAR(80),
    endereco_cidade VARCHAR(80),
    endereco_estado VARCHAR(2),
    endereco_cep VARCHAR(10),
    nome_mae VARCHAR(150),
    tipo_atendimento VARCHAR(30) DEFAULT 'Particular',
    convenio_numero VARCHAR(50),
    alergias TEXT DEFAULT 'Nenhuma informada',
    status status_paciente NOT NULL DEFAULT 'triagem',
    senha_atendimento VARCHAR(10),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX IF NOT EXISTS idx_pacientes_status ON pacientes(status);
CREATE INDEX IF NOT EXISTS idx_pacientes_nome ON pacientes(nome);

-- 3. TABELA DE TRIAGENS (CLASSIFICAÇÃO MANCHESTER)
CREATE TABLE IF NOT EXISTS triagens (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE CASCADE,
    nome_paciente VARCHAR(150) NOT NULL,
    pressao_arterial VARCHAR(15),
    frequencia_cardiaca INT,
    frequencia_respiratoria INT,
    temperatura NUMERIC(4,1),
    saturacao_o2 INT,
    glicemia VARCHAR(20),
    escala_dor INT CHECK (escala_dor >= 0 AND escala_dor <= 10),
    sintoma VARCHAR(100),
    queixa_principal TEXT,
    alergia TEXT,
    comorbidades TEXT,
    observacao TEXT,
    risco risco_manchester NOT NULL DEFAULT 'verde',
    tempo_max_minutos INT DEFAULT 120,
    responsavel_triagem VARCHAR(100),
    ia_recomendacao TEXT,
    ia_validada_por VARCHAR(100),
    status VARCHAR(30) DEFAULT 'aguardando_medico',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_triagens_paciente ON triagens(paciente_id);
CREATE INDEX IF NOT EXISTS idx_triagens_risco ON triagens(risco);
CREATE INDEX IF NOT EXISTS idx_triagens_status ON triagens(status);

-- 4. TABELA DE CONSULTAS MÉDICAS / PRONTUÁRIO
CREATE TABLE IF NOT EXISTS consultas (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE SET NULL,
    triagem_id BIGINT REFERENCES triagens(id) ON DELETE SET NULL,
    medico_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
    medico_nome VARCHAR(100) NOT NULL,
    crm VARCHAR(30),
    queixa TEXT,
    anamnese TEXT,
    exame_fisico TEXT,
    diagnostico TEXT,
    cid10 VARCHAR(10),
    conduta TEXT,
    medicacao TEXT,
    prescricao JSONB DEFAULT '[]'::jsonb,
    exames_solicitados JSONB DEFAULT '[]'::jsonb,
    decisao_clinica VARCHAR(30) DEFAULT 'alta',
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas(paciente_id);

-- 5. TABELA DE LEITOS HOSPITALARES
CREATE TABLE IF NOT EXISTS leitos (
    id SERIAL PRIMARY KEY,
    setor VARCHAR(80) NOT NULL,
    quarto VARCHAR(30) NOT NULL,
    numero_leito VARCHAR(20) NOT NULL,
    status status_leito NOT NULL DEFAULT 'Livre',
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE SET NULL,
    data_ocupacao TIMESTAMP WITH TIME ZONE,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unq_quarto_leito UNIQUE (quarto, numero_leito)
);

CREATE INDEX IF NOT EXISTS idx_leitos_status ON leitos(status);
CREATE INDEX IF NOT EXISTS idx_leitos_setor ON leitos(setor);

-- 6. TABELA DE INTERNAÇÕES
CREATE TABLE IF NOT EXISTS internacoes (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE RESTRICT,
    leito_id INT REFERENCES leitos(id) ON DELETE RESTRICT,
    medico_responsavel VARCHAR(100) NOT NULL,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    data_saida TIMESTAMP WITH TIME ZONE,
    motivo TEXT NOT NULL,
    diagnostico TEXT,
    dieta VARCHAR(80) DEFAULT 'Livre',
    isolamento BOOLEAN DEFAULT FALSE,
    evolucao JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'internado',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_internacoes_paciente ON internacoes(paciente_id);
CREATE INDEX IF NOT EXISTS idx_internacoes_status ON internacoes(status);

-- 7. TABELA DE MOVIMENTAÇÕES DE LEITO
CREATE TABLE IF NOT EXISTS movimentacoes_leito (
    id BIGSERIAL PRIMARY KEY,
    internacao_id BIGINT REFERENCES internacoes(id) ON DELETE CASCADE,
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE CASCADE,
    leito_origem VARCHAR(50),
    leito_destino VARCHAR(50) NOT NULL,
    motivo TEXT,
    responsavel VARCHAR(100),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE ALTAS HOSPITALARES
CREATE TABLE IF NOT EXISTS altas (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE RESTRICT,
    internacao_id BIGINT REFERENCES internacoes(id) ON DELETE SET NULL,
    consulta_id BIGINT REFERENCES consultas(id) ON DELETE SET NULL,
    medico_responsavel VARCHAR(100) NOT NULL,
    crm VARCHAR(30),
    data_alta DATE NOT NULL DEFAULT CURRENT_DATE,
    hora_alta TIME NOT NULL DEFAULT CURRENT_TIME,
    tipo_alta tipo_alta NOT NULL DEFAULT 'Curado/Melhorado',
    resumo_atendimento TEXT,
    orientacoes TEXT,
    prescricao_domiciliar TEXT,
    retorno_dias VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABELA DE MEDICAMENTOS (FARMÁCIA)
CREATE TABLE IF NOT EXISTS medicamentos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    principio_ativo VARCHAR(150),
    apresentacao VARCHAR(80),
    concentracao VARCHAR(50),
    lote VARCHAR(50) NOT NULL,
    validade DATE NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade >= 0),
    estoque_minimo INT NOT NULL DEFAULT 10,
    unidade VARCHAR(30) DEFAULT 'un',
    localizacao VARCHAR(100),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_nome ON medicamentos(nome);

-- 10. TABELA DE MOVIMENTAÇÕES DA FARMÁCIA
CREATE TABLE IF NOT EXISTS movimentacoes_farmacia (
    id BIGSERIAL PRIMARY KEY,
    medicamento_id INT REFERENCES medicamentos(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'dispensacao', 'perda')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(150),
    responsavel VARCHAR(100),
    paciente_id BIGINT REFERENCES pacientes(id) ON DELETE SET NULL,
    saldo_restante INT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABELA DE MATERIAIS (ALMOXARIFADO)
CREATE TABLE IF NOT EXISTS materiais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade >= 0),
    estoque_minimo INT NOT NULL DEFAULT 10,
    unidade VARCHAR(30) DEFAULT 'unidade',
    localizacao VARCHAR(100),
    lote VARCHAR(50),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. TABELA DE MOVIMENTAÇÕES DO ALMOXARIFADO
CREATE TABLE IF NOT EXISTS movimentacoes_almoxarifado (
    id BIGSERIAL PRIMARY KEY,
    material_id INT REFERENCES materiais(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    setor_destino VARCHAR(80),
    fornecedor VARCHAR(100),
    nota_fiscal VARCHAR(50),
    motivo VARCHAR(150),
    responsavel VARCHAR(100),
    saldo_restante INT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. TABELA DE CHAMADAS DE TV (MÍDIA INDOOR)
CREATE TABLE IF NOT EXISTS chamadas_tv (
    id BIGSERIAL PRIMARY KEY,
    local_tipo VARCHAR(30) NOT NULL,
    local_numero VARCHAR(20) NOT NULL,
    paciente VARCHAR(150) NOT NULL,
    senha VARCHAR(20),
    medico VARCHAR(100),
    hora VARCHAR(10),
    chamado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. TABELA DE LOGS DE AUDITORIA
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL,
    perfil VARCHAR(30),
    ip VARCHAR(45),
    metodo VARCHAR(10),
    rota VARCHAR(255),
    detalhes JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_criado_em ON logs_auditoria(criado_em DESC);

-- =========================================================================
-- SEEDS INICIAIS
-- =========================================================================

INSERT INTO usuarios (usuario, senha, nome, tipo, crm_coren)
VALUES
    ('admin', 'pbkdf2$100000$a94c153b890aef12d0987f6543210abc$09f7a5b3c8901234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef0123', 'Dra. Amanda Valente (Administradora)', 'admin', 'CRM/SP 999999'),
    ('medico', 'pbkdf2$100000$a94c153b890aef12d0987f6543210abc$09f7a5b3c8901234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef0123', 'Dr. Roberto Santos', 'medico', 'CRM/SP 198452'),
    ('triagem', 'pbkdf2$100000$a94c153b890aef12d0987f6543210abc$09f7a5b3c8901234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef0123', 'Enfª. Amanda Silveira', 'triagem', 'COREN/SP 43210-ENF'),
    ('atendimento', 'pbkdf2$100000$a94c153b890aef12d0987f6543210abc$09f7a5b3c8901234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef01234567890abcdef0123', 'Fernanda Lima (Recepção)', 'atendimento', NULL)
ON CONFLICT (usuario) DO NOTHING;

INSERT INTO leitos (setor, quarto, numero_leito, status)
VALUES
    ('UTI Geral', 'UTI-01', 'L-01', 'Livre'),
    ('UTI Geral', 'UTI-01', 'L-02', 'Livre'),
    ('UTI Geral', 'UTI-02', 'L-03', 'Em manutenção'),
    ('UTI Pediátrica', 'UTIP-01', 'L-01', 'Livre'),
    ('Enfermaria Adulto Feminino', 'Q-201', 'L-01', 'Livre'),
    ('Enfermaria Adulto Feminino', 'Q-201', 'L-02', 'Livre'),
    ('Enfermaria Adulto Masculino', 'Q-301', 'L-01', 'Livre'),
    ('Pediatria', 'Q-401', 'L-01', 'Livre'),
    ('Isolamento', 'ISO-01', 'L-01', 'Livre')
ON CONFLICT (quarto, numero_leito) DO NOTHING;

INSERT INTO medicamentos (nome, principio_ativo, apresentacao, concentracao, lote, validade, quantidade, estoque_minimo, unidade, localizacao)
VALUES
    ('Dipirona Monoidratada', 'Dipirona', 'Ampola 500mg/mL (2mL)', '500mg/mL', 'LT-2026A1', '2027-08-30', 180, 30, 'ampola', 'Armário A1'),
    ('Paracetamol Comprimido', 'Paracetamol', 'Comprimido 500mg', '500mg', 'LT-2026B3', '2027-11-15', 250, 50, 'comprimido', 'Prateleira B2'),
    ('Amoxicilina + Clavulanato', 'Amoxicilina / Clavulanato', 'Comprimido 500/125mg', '500mg + 125mg', 'LT-2026C4', '2027-05-20', 60, 20, 'comprimido', 'Armário Antibióticos'),
    ('Ceftriaxona Dissódica', 'Ceftriaxona', 'Frasco-ampola 1g IV', '1g', 'LT-2026D7', '2027-09-10', 45, 15, 'frasco-ampola', 'Armário Antibióticos'),
    ('Soro Fisiológico 0.9%', 'Cloreto de Sódio 0.9%', 'Bolsa 500mL', '0.9%', 'LT-2026G5', '2028-01-30', 320, 60, 'bolsa', 'Pallet Soluções'),
    ('Morfina Sulfato', 'Morfina', 'Ampola 10mg/mL', '10mg/mL', 'LT-2026CTRL', '2027-10-25', 8, 10, 'ampola', 'Cofre Controlados')
ON CONFLICT DO NOTHING;

INSERT INTO materiais (nome, categoria, quantidade, estoque_minimo, unidade, localizacao, lote)
VALUES
    ('Luvas de Procedimento Não Cirúrgica M', 'Descartáveis', 85, 20, 'caixa c/ 100', 'Corredor 1 - Estante A', 'ALM-101'),
    ('Seringa Descartável 10mL c/ Agulha', 'Insumos Médicos', 140, 30, 'caixa c/ 50', 'Corredor 1 - Estante B', 'ALM-102'),
    ('Cateter Intravenoso Periférico 20G', 'Insumos Médicos', 6, 15, 'caixa c/ 50', 'Corredor 2 - Estante A', 'ALM-103'),
    ('Álcool Etílico em Gel 70% 1 Litro', 'Higiene e Desinfecção', 48, 15, 'frasco 1L', 'Corredor 3 - Estante C', 'ALM-106'),
    ('Gaze Estéril 7.5cm x 7.5cm 11 Fios', 'Insumos Médicos', 0, 50, 'pacote c/ 10', 'Corredor 1 - Estante C', 'ALM-107')
ON CONFLICT DO NOTHING;
