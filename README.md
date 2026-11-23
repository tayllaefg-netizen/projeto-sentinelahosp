# 🏥 Tayla — Sistema de Gestão Hospitalar Profissional (v2.0)

[![Status dos Testes](https://img.shields.io/badge/Testes-19%20Passaram%20%2F%200%20Falhas-success)](tests/test_all.js)
[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B%20%7C%20v24%2B-blue)](package.json)
[![Licença Acadêmica](https://img.shields.io/badge/Licen%C3%A7a-Acad%C3%AAmica%20%26%20Demonstra%C3%A7%C3%A3o-pink)](README.md)
[![Identidade Visual](https://img.shields.io/badge/UI%2FUX-Amandinha%20Pink%20Executive-ff9ec6)](frontend/css/style.css)

> **⚠️ AVISO REGULATÓRIO & ACADÊMICO:**  
> Este projeto foi desenvolvido para fins **acadêmicos, didáticos e de demonstração tecnológica**. Não se destina a uso clínico, assistencial ou diagnóstico real em ambiente hospitalar sem validação técnica, ensaios clínicos, conformidade jurídica com a LGPD e certificação por órgãos de vigilância sanitária.

---

## 📌 Sumário

1. [Visão Geral & Evolução do Projeto](#-visão-geral--evolução-do-projeto)
2. [Identidade Visual Corporativa](#-identidade-visual-corporativa)
3. [Arquitetura do Sistema](#-arquitetura-do-sistema)
4. [Problemas Diagnosticados e Corrigidos](#-problemas-diagnosticados-e-corrigidos)
5. [Funcionalidades Implementadas por Módulo](#-funcionalidades-implementadas-por-módulo)
6. [Credenciais de Demonstração (Demonstration Accounts)](#-credenciais-de-demonstração)
7. [Instalação e Execução Local](#-instalação-e-execução-local)
8. [Configuração do Banco de Dados (JSON & PostgreSQL)](#-configuração-do-banco-de-dados)
9. [Instruções de Deploy (Vercel, Docker, VPS)](#-instruções-de-deploy)
10. [Relatório da Suíte de Testes Obrigatórios](#-relatório-da-suíte-de-testes-obrigatórios)
11. [Limitações Conhecidas e Próximos Passos](#-limitações-conhecidas-e-próximos-passos)

---

## 🌸 Visão Geral & Evolução do Projeto

O **Tayla Hospitalar v2.0** é a reestruturação e profissionalização completa do sistema hospitalar original. Toda a identidade estética amigável em tons de rosa foi preservada, porém repensada sob diretrizes modernas de **Design System SaaS e sistemas hospitalares executivos**, eliminando elementos infantis e incorporando componentes limpos, tipografia equilibrada, dados reais em tempo real e segurança de ponta a ponta.

O sistema deixou de ser um protótipo com dados estáticos e telas isoladas em `localStorage` para se tornar um **ecossistema hospitalar integrado**: desde a chegada do paciente na recepção, passando pela triagem com classificação de risco Manchester, atendimento médico, solicitação e gestão de leitos, farmácia hospitalar com baixa automática de estoque, almoxarifado de insumos e painel de TV em tempo real.

---

## 🎨 Identidade Visual Corporativa

O projeto adota uma paleta elegante e contrastante:
- **Rosa Tayla Suave (`#F7DCE7`):** Usado em backgrounds leves, estados de hover e cartões de destaque.
- **Rosa Corporativo Principal (`#D98EAD` / `#B35378`):** Botões principais, indicadores de marca e acentos visuais.
- **Azul-Marinho Executivo (`#26364A`):** Barra lateral profissional (sidebar), tipografia principal, cabeçalhos de tabela e botões secundários.
- **Cinza Hospitalar Suave (`#F7F8FA`):** Fundo ergonômico de baixa fadiga visual para telas de trabalho clínico.
- **Branco Puro (`#FFFFFF`):** Cards e cartões de prontuário com sombras suaves (`0 4px 12px rgba(38, 54, 74, 0.06)`).

---

## 🏛️ Arquitetura do Sistema

```
tayla-hospital/
├── backend/
│   ├── config/
│   │   ├── env.js           # Carregamento seguro de variáveis de ambiente
│   │   └── constants.js     # Perfis, Manchester, status de leitos e pacientes
│   ├── db/
│   │   ├── storage.js       # Repositório transacional (JSON com gravação atômica)
│   │   ├── postgres.js      # Adaptador pool para PostgreSQL
│   │   ├── seed.js          # Carga de dados iniciais e senhas hash
│   │   └── db.json          # Persistência JSON estruturada
│   ├── middleware/
│   │   ├── auth.js          # Autenticação JWT e RBAC por perfil
│   │   ├── audit.js         # Trilha de auditoria das operações clínicas
│   │   ├── validator.js     # Validação de CPF e sanitização XSS
│   │   └── errorHandler.js  # Tratamento centralizado de erros
│   ├── routes/
│   │   ├── auth.routes.js         # Login, perfil atual, gestão de usuários
│   │   ├── pacientes.routes.js    # CRUD de pacientes, histórico e validações
│   │   ├── triagem.routes.js      # Manchester, sinais vitais e suporte IA
│   │   ├── consultas.routes.js    # Prontuário, anamnese, diagnóstico e conduta
│   │   ├── leitos.routes.js       # Censo de leitos e disponibilidade
│   │   ├── internacoes.routes.js  # Admissão, transferência e evolução clínica
│   │   ├── altas.routes.js        # Registro de alta e liberação de leito
│   │   ├── farmacia.routes.js     # Catálogo, lotes, dispensação e estoque
│   │   ├── almoxarifado.routes.js # Insumos, categorias e requisição setorial
│   │   ├── tv.routes.js           # Chamadas indoor e histórico
│   │   ├── dashboard.routes.js    # Indicadores e métricas em tempo real
│   │   └── auditoria.routes.js    # Logs de auditoria para o administrador
│   ├── services/
│   │   └── aiTriageService.js     # Motor Manchester heurístico e Gemini IA
│   ├── utils/
│   │   ├── crypto.js        # Hasher PBKDF2 com salt e emissor/validador JWT
│   │   ├── cpfValidator.js  # Algoritmo oficial de validação de CPF
│   │   └── xss.js           # Sanitizador contra injeção de scripts
│   └── server.js            # Express app, middlewares e listener HTTP
├── frontend/
│   ├── css/
│   │   └── style.css        # Design System completo Amandinha
│   ├── js/
│   │   └── app.js           # Client-side framework, auth, toasts, Web Audio
│   ├── index.html           # Tela de Login com cartões de credenciais rápidas
│   ├── dashboard.html       # Painel de Gestão Hospitalar & Indicadores
│   ├── atendimento.html     # Recepção, Cadastro e Fila de Entrada
│   ├── triagem.html         # Triagem Manchester, Sinais Vitais e IA
│   ├── medico.html          # Consultório, Prontuário e Prescrição
│   ├── internacao.html      # Gestão de Leitos, Admissão e Transferência
│   ├── internaçao.html      # Alias/redirect transparente para internacao.html
│   ├── alta.html            # Alta Hospitalar com layout para Impressão/PDF
│   ├── medicacoes.html      # Farmácia Hospitalar, Dispensação e Estoque
│   ├── almoxarifado.html    # Almoxarifado Central e Requisições Setoriais
│   ├── tv.html              # Painel de TV / Mídia Indoor em Tela Cheia
│   └── auditoria.html       # Visualização da Trilha de Auditoria
├── tests/
│   └── test_all.js          # Suíte completa com 19 testes automatizados
├── api/
│   └── index.js             # Ponto de entrada Serverless da Vercel
├── database.sql             # DDL completo PostgreSQL (DDL, Foreign Keys, Seeds)
├── .env.example             # Modelo de configuração de ambiente
├── .env                     # Configuração local padrão
├── package.json             # Scripts de inicialização, teste e seed
└── README.md                # Esta documentação
```

---

## 🛠️ Problemas Diagnosticados e Corrigidos

| Problema Original | Causa Raiz Identificada | Solução Definitiva Implementada |
|---|---|---|
| **Divergência de backend** | Havia `backend/server.js` e `frontend/api/index.js` com rotas e comportamentos diferentes. | Backend unificado em `backend/server.js`, com rotas modulares organizadas em `backend/routes/`. `api/index.js` e `frontend/api/index.js` agora reutilizam o mesmo aplicativo. |
| **Inicialização quebrada no `package.json`** | O script `"start"` apontava para `"node api/index.js"`, inexistente na raiz. | `"main": "backend/server.js"`, `"start": "node backend/server.js"`, além de scripts `"seed"` e `"test"`. |
| **`vercel.json` incompatível** | Rewrites apontavam para caminhos incorretos. | Atualizado com regras de reescrita completas para `/api/*` e entrega estática de `/frontend/*`. |
| **Caminho divergente do `db.json`** | Múltiplos caminhos relativos provocavam leituras em arquivos diferentes. | Centralizado em `backend/db/storage.js` apontando canonicamente para `backend/db.json` com gravação atômica via arquivo temporário. |
| **Caractere acentuado `internaçao.html`** | O caractere `ç` causava falhas de codificação e 404 em diversos ambientes. | Arquivo canônico renomeado para `internacao.html` e rota com alias transparente para `internaçao.html`. |
| **Hardcoded `localhost:3000` no frontend** | Chamadas `fetch("http://localhost:3000/...")` quebravam em outras portas ou deploys. | Todas as chamadas agora usam caminhos relativos padronizados via função central `apiFetch(...)`. |
| **Login com senha em texto puro** | Comparação direta `u.senha === req.body.senha`. | Criptografia com hash seguro **PBKDF2 com Salt de 16 bytes e 100.000 iterações**, além de migração suave de senhas legadas. |
| **Ausência de autenticação e proteção de rotas** | Qualquer tela podia ser aberta sem login e qualquer usuário podia chamar qualquer rota. | Tokens JWT assinados com HMAC SHA-256, middleware de autorização por perfil (RBAC) e guarda de rotas no client-side. |
| **Vulnerabilidade a XSS** | Injeção crua via `innerHTML` de variáveis fornecidas pelo usuário. | Sanitização de dados no backend (`backend/utils/xss.js`) e função `escapeHtml` em todas as renderizações de tabelas e cards. |
| **Internação baseada apenas em `localStorage`** | A tela `internaçao.html` apenas gravava no `localStorage` e fechava a janela. | Módulo completo com persistência no banco de dados, mapa de leitos, controle de status e histórico de transferências. |
| **Conflito de leitos (dupla ocupação)** | Não havia controle para impedir que dois pacientes ocupassem o mesmo leito. | Validação estrita no backend: rejeita com erro HTTP 400 qualquer tentativa de alocar leito ocupado ou em manutenção. |
| **Alta hospitalar desconectada** | A tela de alta não atualizava o backend nem liberava o leito. | A alta médica agora atualiza o status do paciente para `alta`, libera o leito para `Livre` e gera o documento clínico formatado. |
| **Almoxarifado incompleto** | A página `almoxarifado.html` possuía apenas 57 linhas com HTML quebrado e sem script. | Módulo 100% funcional de Almoxarifado com catálogo de materiais, categorias, estoques mínimos, requisições por setor e estatísticas. |
| **Farmácia com lista estática** | A rota `/medicacoes` apenas retornava consultas salvas. | Módulo completo de Farmácia com controle de lotes, datas de validade, alertas de estoque baixo e dispensação para pacientes. |
| **Ausência de validação de CPF** | Qualquer sequência de caracteres era aceita. | Implementado o algoritmo oficial com cálculo de dígitos verificadores e rejeição de CPFs inválidos ou duplicados. |

---

## 🚀 Funcionalidades Implementadas por Módulo

### 1. Recepção & Cadastro de Pacientes (`atendimento.html`)
- Cadastro com Nome, CPF, RG, Data de Nascimento, Sexo, Telefone, E-mail, Endereço completo, Modalidade (Particular, Convênio com nº de carteirinha, SUS, Emergência) e Alergias.
- Validação algorítmica de CPF e bloqueio de cadastros duplicados.
- Geração automática de senha de atendimento amigável (`A-01`, `P-02`, `E-03`).
- Fila de pacientes com busca e filtros por nome, CPF e status.
- Modal de Prontuário / Histórico integrado do paciente.

### 2. Triagem Manchester (`triagem.html`)
- Fila em tempo real de pacientes aguardando triagem.
- Aferição de sinais vitais completos: Pressão Arterial (PA), Frequência Cardíaca (FC), Frequência Respiratória (FR), Temperatura (°C), Saturação de O2 (SpO2), Glicemia capilar e Escala Visual Analógica de Dor (EVA 0-10).
- Classificação de Risco pelo Protocolo de Manchester:
  - 🔴 **Vermelho:** Emergência (Atendimento imediato - 0 min)
  - 🟠 **Laranja:** Muito Urgente (Atendimento em até 10 min)
  - 🟡 **Amarelo:** Urgente (Atendimento em até 50 min)
  - 🟢 **Verde:** Pouco Urgente (Atendimento em até 120 min)
  - 🔵 **Azul:** Não Urgente (Atendimento em até 240 min)
- **Assistente de Triagem com IA:**
  - Análise clínica heurística do Protocolo de Manchester integrada no backend.
  - Suporte opcional à API do Google Gemini com fallback automático e transparente em caso de ausência de rede.
  - Exigência explícita de validação humana pelo enfermeiro responsável (a IA nunca toma decisões clínicas autônomas).
- Botão "Chamar na TV" para enviar a chamada sonora ao painel de TV.

### 3. Consultório Médico & Prontuário (`medico.html`)
- Fila de espera ordenada automaticamente por prioridade clínica Manchester e tempo de chegada.
- Chamada do paciente no consultório transmitida em tempo real para a TV com sinal sonoro.
- Painel de visualização rápida dos sinais vitais aferidos na triagem e alerta de alergias em destaque.
- Registro de anamnese, exame físico, diagnóstico (CID-10), conduta clínica e orientações.
- Prescrição eletrônica integrada ao catálogo da farmácia hospitalar.
- Decisão clínica com 1 clique: Alta com prescrição domiciliar ou solicitação de Internação hospitalar.

### 4. Gestão de Leitos & Internação (`internacao.html`)
- Mapa visual de leitos organizado por setor (UTI Geral, UTI Pediátrica, Enfermarias Adulto, Pediatria, Isolamento).
- Indicadores visuais de status:
  - 🟢 **Livre:** Disponível para ocupação imediata.
  - 🔴 **Ocupado:** Apresenta paciente internado e data de entrada.
  - 🛠️ **Em Manutenção:** Bloqueado para higienização ou manutenção de equipamentos.
  - 🟡 **Reservado:** Pré-alocado.
- Validação rigorosa: o backend impede que dois pacientes ocupem o mesmo leito.
- Transferência de leitos com registro do leito de origem, leito de destino, motivo e responsável.
- Registro de evolução clínica diária no prontuário da internação.

### 5. Alta Hospitalar (`alta.html`)
- Emissão de alta médica com identificação completa do paciente, data, hora e médico assistente (com CRM).
- Registro de resumo clínico, prescrição domiciliar de continuidade, orientações gerais e retorno ambulatorial.
- **Liberação automática do leito ocupado** no banco de dados e atualização do status do paciente para `alta`.
- Layout em padrão folha timbrada hospitalar com formatação otimizada para impressão física ou geração de PDF (`@media print`).

### 6. Farmácia Hospitalar (`medicacoes.html`)
- Catálogo de medicamentos com princípio ativo, forma farmacêutica, concentração, lote e data de validade.
- Controle de saldo em estoque em tempo real.
- Registro de entradas (recebimento de fornecedor) e saídas.
- **Dispensação de medicação para pacientes com 1 clique:** deduz do estoque e bloqueia movimentações com saldo insuficiente.
- Alertas automáticos para estoque abaixo do mínimo e medicamentos com validade próxima (&lt; 60 dias).

### 7. Almoxarifado Central (`almoxarifado.html`)
- Catálogo de insumos médicos, descartáveis, equipamentos e materiais de higiene.
- Requisições setoriais: baixa de materiais para a UTI, Centro Cirúrgico, Pronto Atendimento e Enfermarias.
- Indicadores de total de itens, estoque normal, estoque baixo e materiais esgotados/zerados.

### 8. Painel de TV / Mídia Indoor (`tv.html`)
- Interface em tela cheia com alta legibilidade e contraste.
- Exibição destacada da chamada atual (Nome ou Senha do Paciente e Consultório/Guichê de destino).
- Histórico das últimas chamadas na barra lateral.
- **Sinal sonoro polifônico hospitalar** gerado nativamente via Web Audio API (sem dependência de arquivos externos).
- Relógio digital em tempo real e atualização contínua (polling a cada 2,5s).

### 9. Dashboard de Gestão Hospitalar (`dashboard.html`)
- Total de pacientes cadastrados.
- Consultas realizadas no dia.
- Pacientes na fila aguardando triagem.
- Pacientes aguardando médico discriminados por cor do Protocolo de Manchester.
- Censo hospitalar: leitos totais, livres, ocupados, em manutenção e taxa percentual de ocupação.
- Alertas críticos de suprimentos do almoxarifado e medicamentos da farmácia.

### 10. Trilha de Auditoria & Segurança (`auditoria.html`)
- Registro cronológico imutável de logins, cadastros de pacientes, triagens, prescrições, internações, transferências de leito, dispensações e altas.
- Rastreamento por usuário, perfil, endereço IP, rota HTTP e data/hora.

---

## 🔑 Credenciais de Demonstração

Para facilitar a avaliação da banca e a demonstração acadêmica, o sistema já vem populado com usuários pré-configurados. Você pode clicar nos botões de preenchimento rápido na própria tela de login (`index.html`):

| Perfil | Usuário | Senha Padrão | Compatibilidade | Nome do Profissional |
|---|---|---|---|---|
| **Administrador** | `admin` | `admin123` | `admin123` | Dra. Amanda Valente (Diretora Clínica) |
| **Médico Plantonista** | `medico` | `123` | `123` | Dr. Roberto Santos (CRM/SP 198452) |
| **Enfermagem / Triagem** | `triagem` | `123` | `123` | Enfª. Amanda Silveira (COREN/SP 43210) |
| **Recepção / Atendimento** | `atendimento` | `123` | `123` | Fernanda Lima (Recepção Central) |
| **Farmacêutico** | `farmacia` | `123` | `123` | Drª. Patrícia Mendes (CRF/SP 78945) |
| **Almoxarife** | `almoxarifado` | `123` | `123` | Carlos Eduardo (Almoxarifado) |

*Nota: Todas as senhas são armazenadas como hash seguro PBKDF2 (`pbkdf2$100000$...`) no banco de dados.*

---

## 💻 Instalação e Execução Local

### Pré-requisitos
- **Node.js:** Versão 18.x, 20.x ou superior (testado com sucesso no Node.js v24).
- **NPM:** Versão 9.x ou superior.

### Passo a Passo

1. **Extrair o arquivo ZIP do projeto** em uma pasta de sua preferência (ex: `C:\projetos\amandinha-hospital`).
2. **Abrir o terminal** na pasta raiz do projeto.
3. **Instalar as dependências** (caso esteja em ambiente sem dependências pré-instaladas):
   ```bash
   npm install
   ```
4. **Inicializar o banco de dados e sementes iniciais (Seeds):**
   ```bash
   npm run seed
   ```
5. **Executar a suíte de testes automatizados:**
   ```bash
   npm test
   ```
6. **Iniciar o servidor da aplicação:**
   ```bash
   npm start
   ```
7. **Acessar no navegador:**
   - Tela de Login: [http://localhost:3000](http://localhost:3000)
   - Painel de TV: [http://localhost:3000/tv.html](http://localhost:3000/tv.html)
   - Healthcheck: [http://localhost:3000/health](http://localhost:3000/health)

---

## 🗄️ Configuração do Banco de Dados

O sistema foi arquitetado com uma **Camada de Acesso a Dados (Repository Pattern)** flexível:

### Opção 1: JSON Transacional (Padrão Out-of-the-Box)
- **Como funciona:** O sistema persiste todas as entidades no arquivo `backend/db.json`. Para garantir integridade e evitar corrupção durante acessos simultâneos, o repositório (`backend/db/storage.js`) utiliza gravação atômica via arquivo temporário (`.tmp`) seguido de substituição atômica (`fs.renameSync`).
- **Vantagem:** Executa imediatamente em qualquer computador sem necessidade de instalar ou configurar servidores externos de banco de dados. Ideal para demonstração acadêmica imediata.
- **Limitação documentada:** O formato JSON não suporta transações distribuídas nem índices B-Tree de alta concorrência em produção de grande porte.

### Opção 2: PostgreSQL (Ambientes de Produção)
- **Como configurar:**
  1. Instale o PostgreSQL (ou utilize um serviço em nuvem como Supabase, Neon ou AWS RDS).
  2. Crie uma base de dados: `CREATE DATABASE hospital_amandinha;`
  3. Execute o script SQL completo fornecido no arquivo [`database.sql`](database.sql):
     ```bash
     psql -U postgres -d hospital_amandinha -f database.sql
     ```
  4. No arquivo `.env`, altere o cliente e informe a URL de conexão:
     ```env
     DB_CLIENT=postgres
     DATABASE_URL=postgres://usuario:senha@localhost:5432/hospital_amandinha
     ```
  5. Instale o driver do PostgreSQL:
     ```bash
     npm install pg
     ```

---

## ☁️ Instruções de Deploy

### Deploy na Vercel (Serverless)
O projeto já conta com [`vercel.json`](vercel.json) e [`api/index.js`](api/index.js) configurados:
1. Conecte seu repositório GitHub à Vercel.
2. Nas configurações de ambiente (*Environment Variables*), configure:
   - `JWT_SECRET`: uma chave aleatória forte.
   - `NODE_ENV`: `production`.
3. O deploy reconhecerá automaticamente a função serverless em `api/index.js` e servirá o frontend estático.

### Deploy em VPS / Servidor Linux (PM2)
```bash
# Instala o PM2 globalmente
npm install -g pm2

# Inicia o servidor Amandinha em background com reinício automático
pm2 start backend/server.js --name "amandinha-hospital"

# Configura inicialização no boot do sistema operacional
pm2 startup
pm2 save
```

---

## 🧪 Relatório da Suíte de Testes Obrigatórios

A suíte de testes automatizados (`tests/test_all.js`) foi executada e obteve **100% de aprovação (19 de 19 testes)**:

```
================================================================
🧪 INICIANDO SUÍTE DE TESTES OBRIGATÓRIOS DO SISTEMA AMANDINHA
================================================================

✅ PASSOU: 1. Inicialização do servidor e rota de healthcheck
✅ PASSOU: 2. Login com verificação de hash seguro e tokens JWT
✅ PASSOU: 3. Controle de acesso por perfil (RBAC)
✅ PASSOU: 4. Validação de CPF (Rejeição de dígitos inválidos)
✅ PASSOU: 5. Cadastro de paciente com dados cadastrais completos
✅ PASSOU: 6. Prevenção de duplicidade de CPF
✅ PASSOU: 7. Criação de triagem e classificação de risco Manchester
✅ PASSOU: 8. Atualização e persistência do fluxo de status do paciente
✅ PASSOU: 9. Atendimento médico, diagnóstico e prescrição
✅ PASSOU: 10. Consulta de leitos livres e ocupados
✅ PASSOU: 11. Cadastro de internação hospitalar persistida no backend
✅ PASSOU: 12. Bloqueio no backend de alocação de leito já ocupado
✅ PASSOU: 13. Alta hospitalar e liberação automática do leito no banco
✅ PASSOU: 14. Farmácia: controle de estoque, dispensação e bloqueio de saldo negativo
✅ PASSOU: 15. Almoxarifado: requisição setorial, atualização de estoque e estatísticas
✅ PASSOU: 16. Painel de TV: emissão de chamada e consulta em tempo real
✅ PASSOU: 17. Dashboard Administrativo com métricas reais agregadas
✅ PASSOU: 18. Entrega e navegação entre todas as páginas HTML do frontend
✅ PASSOU: 19. Trilha de auditoria das operações clínicas gravadas

================================================================
📊 RESUMO DA EXECUÇÃO DOS TESTES:
Total: 19 | Passaram: 19 | Falharam: 0
================================================================
```

---

## ⚠️ Limitações Conhecidas e Próximos Passos

Como todo software em contínua evolução acadêmica, as seguintes melhorias estão mapeadas para versões futuras:
1. **Integração HL7 / FHIR:** Implementação do padrão internacional HL7 FHIR para interoperabilidade com outros hospitais e laboratórios de análises clínicas.
2. **Certificação Digital ICP-Brasil:** Assinatura digital com certificado A3/em nuvem nos relatórios de alta e prescrições médicas para cumprimento integral da resolução do CFM.
3. **WebSockets nativos para o Painel de TV:** Embora o polling a cada 2,5 segundos funcione com extrema estabilidade e baixo consumo, a transição para Socket.io / WebSockets reduzirá ainda mais a latência da chamada.
4. **Leitor biométrico / leitor de código de barras:** Integração direta com leitores de código de barras para checagem beira-leito de medicamentos administrados pela enfermagem.

---

**Tayla Hospital Pro** • Desenvolvido com carinho e excelência técnica para demonstração acadêmica • 2026
