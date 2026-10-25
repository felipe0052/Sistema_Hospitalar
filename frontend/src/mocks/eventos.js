function somarDiasIso(dias, hora = 9, minuto = 0) {
  const dt = new Date();
  dt.setDate(dt.getDate() + dias);
  dt.setHours(hora, minuto, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
}

export const EVENTOS_MOCK_INICIAL = [
  {
    id_evento: 1,
    titulo: "Integração Institucional de Novos Colaboradores — Turma Anterior",
    descricao:
      "Onboarding institucional apresentando normas de biossegurança, fluxos de RH e cultura de atendimento do Hospital Decós.",
    categoria: "TREINAMENTO",
    data_inicio: somarDiasIso(-10, 9, 0),
    data_fim: somarDiasIso(-10, 12, 0),
    local: "Auditório Principal — 4º andar",
    setor: { id_setor: 8, nome: "RH" },
  },
  {
    id_evento: 2,
    titulo: "Campanha Interna de Vacinação contra Influenza e Hepatite B",
    descricao:
      "Imunização anual destinada a todos os colaboradores assistenciais e administrativos. Apresentar crachá funcional e carteira de vacinação.",
    categoria: "ACAO_INTERNA",
    data_inicio: somarDiasIso(2, 8, 0),
    data_fim: somarDiasIso(2, 14, 0),
    local: "Sala de Medicina do Trabalho — 1º andar",
    setor: { id_setor: 8, nome: "RH" },
  },
  {
    id_evento: 3,
    titulo: "Treinamento Prático de Suporte Básico de Vida (BLS) para Equipes Assistenciais",
    descricao:
      "Capacitação prática obrigatória para técnicos de enfermagem e enfermeiros da UTI, Pronto-Socorro e Centro Cirúrgico.",
    categoria: "TREINAMENTO",
    data_inicio: somarDiasIso(5, 9, 0),
    data_fim: somarDiasIso(5, 13, 0),
    local: "Centro de Simulação Clínica — 2º andar",
    setor: { id_setor: 1, nome: "UTI" },
  },
  {
    id_evento: 4,
    titulo: "Reunião Geral de Lideranças e Apresentação de Indicadores ONA",
    descricao:
      "Encontro institucional com coordenações e supervisões para análise dos indicadores mensais de segurança do paciente e metas de qualidade.",
    categoria: "INSTITUCIONAL",
    data_inicio: somarDiasIso(9, 14, 0),
    data_fim: somarDiasIso(9, 16, 0),
    local: "Auditório Principal — 4º andar",
    setor: { id_setor: 7, nome: "Administração" },
  },
  {
    id_evento: 5,
    titulo: "Ação Interna de Saúde Mental e Qualidade de Vida no Plantão",
    descricao:
      "Rodas de conversa, orientações ergonômicas e ações de acolhimento para colaboradores dos turnos diurno e noturno.",
    categoria: "ACAO_INTERNA",
    data_inicio: somarDiasIso(14, 10, 0),
    data_fim: somarDiasIso(14, 15, 0),
    local: "Espaço Convivência — Térreo",
    setor: { id_setor: 8, nome: "RH" },
  },
  {
    id_evento: 6,
    titulo: "Workshop de Segurança da Informação e Boas Práticas na Intranet",
    descricao:
      "Orientações práticas sobre proteção de credenciais, privacidade de dados hospitalares (LGPD) e utilização dos módulos da Intranet Decós.",
    categoria: "OUTRO",
    data_inicio: somarDiasIso(19, 10, 0),
    data_fim: somarDiasIso(19, 12, 0),
    local: "Sala de Treinamento TI — 4º andar",
    setor: { id_setor: 10, nome: "Tecnologia" },
  },
];

export default EVENTOS_MOCK_INICIAL;
