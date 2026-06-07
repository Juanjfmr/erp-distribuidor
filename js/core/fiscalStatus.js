// js/core/fiscalStatus.js
// Enum central de estados fiscais — consultar antes de emitir qualquer documento.
// NUNCA usar condicionais fiscais espalhadas no código — use estas funções.

const FISCAL_STATUS = {
  NAO_CONFIGURADO:        'NAO_CONFIGURADO',
  BLOQUEADO_CPF:          'BLOQUEADO_CPF',
  REGISTRANDO:            'REGISTRANDO',
  SEM_CERTIFICADO:        'SEM_CERTIFICADO',
  ERRO_REGISTRO:          'ERRO_REGISTRO',
  CERTIFICADO_INSTALADO:  'CERTIFICADO_INSTALADO',
  ERRO_CERTIFICADO:       'ERRO_CERTIFICADO',
  CONFIGURADO:            'CONFIGURADO',
  CONFIGURADO_NAO_TESTADO:'CONFIGURADO_NAO_TESTADO',
  CONFIGURADO_TESTADO:    'CONFIGURADO_TESTADO',
  PRODUCAO_ATIVA:         'PRODUCAO_ATIVA',
};

// Retorna true se o tenant pode emitir NF-e via Focus NFe.
function canEmitNFe(company) {
  const s = company?.fiscalStatus;
  return s === FISCAL_STATUS.CERTIFICADO_INSTALADO
      || s === FISCAL_STATUS.CONFIGURADO
      || s === FISCAL_STATUS.CONFIGURADO_NAO_TESTADO
      || s === FISCAL_STATUS.CONFIGURADO_TESTADO
      || s === FISCAL_STATUS.PRODUCAO_ATIVA;
}

// Fatura PDF está sempre disponível — nunca bloquear por status fiscal.
function canEmitFatura(company) { return true; }

// Retorna true se deve exibir banner de aviso no Dashboard.
function needsBanner(company) {
  return company?.fiscalStatus !== FISCAL_STATUS.PRODUCAO_ATIVA;
}

// Retorna { icone, texto, ctaLabel, ctaAction } por estado.
// ctaAction: string de ação executada ao clicar no CTA.
function getBannerConfig(company) {
  const s = company?.fiscalStatus || FISCAL_STATUS.NAO_CONFIGURADO;
  const gotoFiscal = "navigate('config'); openFiscalTab()";
  const configs = {
    [FISCAL_STATUS.NAO_CONFIGURADO]: {
      icone: '⚙️', ctaLabel: 'Configurar agora', ctaAction: gotoFiscal,
      texto: 'Configure o módulo fiscal para emitir NF-e.',
    },
    [FISCAL_STATUS.BLOQUEADO_CPF]: {
      icone: 'ℹ️', ctaLabel: 'Saiba mais', ctaAction: gotoFiscal,
      texto: 'Você usa CPF — faturas disponíveis. NF-e requer CNPJ.',
    },
    [FISCAL_STATUS.REGISTRANDO]: {
      icone: '⏳', ctaLabel: 'Ver detalhes', ctaAction: gotoFiscal,
      texto: 'Registro em andamento. Se persistir, tente novamente.',
    },
    [FISCAL_STATUS.SEM_CERTIFICADO]: {
      icone: '⚠️', ctaLabel: 'Completar', ctaAction: gotoFiscal,
      texto: 'Dados salvos. Faça upload do certificado A1 para emitir NF-e.',
    },
    [FISCAL_STATUS.ERRO_REGISTRO]: {
      icone: '🔴', ctaLabel: 'Tentar novamente', ctaAction: gotoFiscal,
      texto: `Erro ao registrar na Focus NFe: ${company?.fiscalData?.lastError?.mensagem || 'verifique os dados.'}`,
    },
    [FISCAL_STATUS.CERTIFICADO_INSTALADO]: {
      icone: '✅', ctaLabel: 'Testar agora', ctaAction: gotoFiscal,
      texto: 'Empresa registrada com certificado instalado. Recomendamos testar em homologação.',
    },
    [FISCAL_STATUS.ERRO_CERTIFICADO]: {
      icone: '🔴', ctaLabel: 'Corrigir', ctaAction: gotoFiscal,
      texto: `Erro ao instalar certificado: ${company?.certLastError || 'verifique o arquivo e a senha.'}`,
    },
    [FISCAL_STATUS.CONFIGURADO]: {
      icone: '✅', ctaLabel: 'Testar agora', ctaAction: gotoFiscal,
      texto: 'Módulo fiscal configurado. Recomendamos testar em homologação.',
    },
    [FISCAL_STATUS.CONFIGURADO_NAO_TESTADO]: {
      icone: '⚠️', ctaLabel: 'Ver detalhes', ctaAction: gotoFiscal,
      texto: 'Teste de emissão falhou. Verifique os dados fiscais.',
    },
    [FISCAL_STATUS.CONFIGURADO_TESTADO]: {
      icone: '✅', ctaLabel: 'Ativar produção', ctaAction: gotoFiscal,
      texto: 'Homologação testada. Pronto para produção quando quiser.',
    },
  };
  return configs[s] || configs[FISCAL_STATUS.NAO_CONFIGURADO];
}
