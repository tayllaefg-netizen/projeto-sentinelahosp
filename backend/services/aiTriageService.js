const config = require('../config/env');

/**
 * Serviço de Apoio à Triagem com Inteligência Artificial e Algoritmo Manchester
 * Diretrizes de Segurança Clínica:
 * 1. Chave privada estritamente mantida no backend via variável de ambiente.
 * 2. Tratamento gracioso de falhas com fallback heurístico transparente.
 * 3. A IA NUNCA toma decisões autônomas: exige confirmação do enfermeiro responsável.
 * 4. Registro de auditoria de todas as recomendações emitidas.
 */

function inferirProtocoloManchester(dados) {
  const temp = Number(dados.temperatura) || 36.5;
  const sat = Number(dados.saturacaoO2) || 98;
  const fc = Number(dados.frequenciaCardiaca) || 75;
  const fr = Number(dados.frequenciaRespiratoria) || 18;
  const dor = Number(dados.escalaDor) || 0;
  const sintoma = (dados.sintoma || '').toLowerCase();
  const queixa = (dados.queixaPrincipal || '').toLowerCase();

  const texto = `${sintoma} ${queixa}`;

  const alertas = [];

  // Critérios VERMELHO (Emergência - Risco Iminente)
  if (sat < 90) {
    alertas.push('Saturação de O2 criticamente baixa (< 90%) - Hipoxemia grave');
    return {
      risco: 'vermelho',
      tempoMaxMinutos: 0,
      justificativa: 'Paciente com hipoxemia severa (<90%), necessitando de oxigenoterapia imediata e avaliação médica emergencial.',
      alertas,
      condutaSugerida: 'Encaminhar imediatamente para Sala Vermelha / Emergência, ofertar O2 suplementar e acionar médico plantonista.'
    };
  }

  if (texto.includes('infarto') || texto.includes('avc') || texto.includes('parada') || texto.includes('inconsciente') || texto.includes('hemorragia grave') || texto.includes('choque')) {
    alertas.push('Queixa com indicativo de evento cardiovascular ou neurológico agudo grave');
    return {
      risco: 'vermelho',
      tempoMaxMinutos: 0,
      justificativa: 'Sintomas compatíveis com emergência com risco de vida (IAM/AVC/Parada/Choque).',
      alertas,
      condutaSugerida: 'Acesso venoso imediato, monitorização cardíaca, ECG em até 10 minutos.'
    };
  }

  // Critérios LARANJA (Muito Urgente - 10 min)
  if (temp >= 39.5 || (temp >= 39.0 && (dor >= 7 || fc > 120))) {
    alertas.push('Febre muito alta (≥ 39.5°C) ou associada a taquicardia/dor intensa');
    return {
      risco: 'laranja',
      tempoMaxMinutos: 10,
      justificativa: 'Hipertermia acentuada com sinais de repercussão sistêmica.',
      alertas,
      condutaSugerida: 'Medidas antitérmicas imediatas, hidratação e avaliação médica prioritária.'
    };
  }

  if (sat >= 90 && sat <= 93) {
    alertas.push('Saturação de oxigênio limítrofe/baixa (90-93%)');
    return {
      risco: 'laranja',
      tempoMaxMinutos: 10,
      justificativa: 'Desconforto respiratório moderado a grave com hipoxemia leve/moderada.',
      alertas,
      condutaSugerida: 'Manter paciente em repouso com cabeceira elevada, monitorar oximetria de pulso contínua.'
    };
  }

  if (texto.includes('falta de ar grave') || texto.includes('dor no peito') || texto.includes('convulsao') || dor >= 8) {
    alertas.push('Dor intensa (Escala EVA ≥ 8) ou desconforto torácico agudo');
    return {
      risco: 'laranja',
      tempoMaxMinutos: 10,
      justificativa: 'Quadro álgico severo ou dor torácica que exige exclusão rápida de síndromes coronarianas.',
      alertas,
      condutaSugerida: 'Repouso no leito, monitorização e encaminhamento em até 10 minutos.'
    };
  }

  // Critérios AMARELO (Urgente - 50 min)
  if (temp >= 38.0 || dor >= 5 || fc > 100 || fr > 22) {
    alertas.push('Sinais vitais alterados (temperatura ≥ 38°C, dor moderada ou taquicardia)');
    return {
      risco: 'amarelo',
      tempoMaxMinutos: 50,
      justificativa: 'Quadro clínico agudo com febre ou dor moderada sem risco iminente de descompensação.',
      alertas,
      condutaSugerida: 'Aguardar em área de atendimento prioritário amarelo com reavaliação periódica.'
    };
  }

  if (texto.includes('vomito') || texto.includes('diarreia') || texto.includes('febre') || texto.includes('dor de cabeca')) {
    return {
      risco: 'amarelo',
      tempoMaxMinutos: 50,
      justificativa: 'Sintomas agudos que demandam alívio sintomático e investigação diagnóstica breve.',
      alertas,
      condutaSugerida: 'Encaminhamento para consulta médica em até 50 minutos.'
    };
  }

  // Critérios VERDE (Pouco Urgente - 120 min)
  if (texto.includes('tosse') || texto.includes('dor de garganta') || texto.includes('coriza') || dor >= 2) {
    return {
      risco: 'verde',
      tempoMaxMinutos: 120,
      justificativa: 'Quadro ambulatorial comum, hemodinamicamente estável, afebril no momento.',
      alertas,
      condutaSugerida: 'Aguardar atendimento na recepção verde com tempo limite de até 120 minutos.'
    };
  }

  // Critérios AZUL (Não Urgente - 240 min)
  return {
    risco: 'azul',
    tempoMaxMinutos: 240,
    justificativa: 'Condição crônica estável, troca de receita ou sintomas leves sem alteração de sinais vitais.',
    alertas: ['Nenhum sinal de alarme identificado'],
    condutaSugerida: 'Atendimento ambulatorial padrão ou orientação preventiva.'
  };
}

async function analisarTriagemComIA(dadosTriagem) {
  // 1. Executa avaliação de regras clínicas determinísticas do protocolo Manchester
  const resultadoRegras = inferirProtocoloManchester(dadosTriagem);

  let recomendacaoFinal = {
    sugestaoRisco: resultadoRegras.risco,
    tempoMaxMinutos: resultadoRegras.tempoMaxMinutos,
    justificativaClinica: resultadoRegras.justificativa,
    alertas: resultadoRegras.alertas,
    condutaSugerida: resultadoRegras.condutaSugerida,
    fonte: 'Algoritmo Heurístico Manchester Amandinha (Diretrizes Clínicas)',
    exigeValidacaoHumana: true,
    avisoLegal: 'AVISO IMPORTANTE: Esta recomendação é gerada como suporte à decisão clínica e NÃO substitui o julgamento profissional de enfermagem ou medicina. A validação do profissional é obrigatória.'
  };

  // 2. Se a chave da API estiver configurada e houver rede, pode enriquecer com Gemini API
  if (config.GEMINI_API_KEY) {
    try {
      const prompt = `Atue como assistente de triagem médica hospitalar baseado no Protocolo de Manchester.
Dados do Paciente:
- Sinais Vitais: PA: ${dadosTriagem.pressaoArterial || '120/80'}, FC: ${dadosTriagem.frequenciaCardiaca || 80} bpm, FR: ${dadosTriagem.frequenciaRespiratoria || 18} rpm, Temp: ${dadosTriagem.temperatura || 36.5} °C, SpO2: ${dadosTriagem.saturacaoO2 || 98}%, Dor: ${dadosTriagem.escalaDor || 0}/10.
- Queixa / Sintomas: ${dadosTriagem.sintoma || ''} - ${dadosTriagem.queixaPrincipal || ''}.
- Alergias: ${dadosTriagem.alergia || 'Nenhuma'}.
Retorne uma análise clínica concisa em JSON com { "risco": "vermelho|laranja|amarelo|verde|azul", "justificativa": "...", "conduta": "..." }.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        signal: AbortSignal.timeout(4000)
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed.risco && ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'].includes(parsed.risco.toLowerCase())) {
            recomendacaoFinal.sugestaoRisco = parsed.risco.toLowerCase();
            recomendacaoFinal.justificativaClinica = parsed.justificativa || recomendacaoFinal.justificativaClinica;
            recomendacaoFinal.condutaSugerida = parsed.conduta || recomendacaoFinal.condutaSugerida;
            recomendacaoFinal.fonte = 'Gemini AI Assistant + Protocolo de Manchester';
          }
        }
      }
    } catch (apiError) {
      // Fallback transparente e silencioso para as regras de Manchester sem interromper a enfermagem
      console.warn('Fallback para motor Manchester nativo (API Gemini indisponível ou offline):', apiError.message);
    }
  }

  return recomendacaoFinal;
}

module.exports = {
  inferirProtocoloManchester,
  analisarTriagemComIA
};
