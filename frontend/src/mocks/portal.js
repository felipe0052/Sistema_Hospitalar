export const MOCK_AVISOS = [
  {
    id_aviso: 1,
    titulo: "Hospital Decós conquista certificação ONA Nível III em Gestão da Qualidade",
    resumo:
      "Após auditoria realizada no último ciclo avaliativo, o Hospital Decós conquistou a certificação ONA Nível III, reafirmando o compromisso com a segurança do paciente.",
    conteudo:
      "Após auditoria realizada no último ciclo avaliativo, o Hospital Decós conquistou a certificação ONA Nível III (Acreditado com Excelência), reafirmando o compromisso de todas as equipes assistenciais e administrativas com a segurança do paciente e a melhoria contínua dos processos hospitalares.",
    categoria: "NOTICIA",
    destaque: true,
    data_publicacao: "2026-10-20T09:00:00",
    autor: { id_usuario: 1, nome: "Comunicação Institucional" },
    imagem: "1576091160550-2173dba999ef",
  },
  {
    id_aviso: 2,
    titulo: "Atualização obrigatória do protocolo de higienização das mãos e controle de infecção",
    resumo:
      "A Comissão de Controle de Infecção Hospitalar (CCIH) informa que a revisão anual do protocolo de higienização das mãos já está em vigor em todas as unidades.",
    conteudo:
      "A Comissão de Controle de Infecção Hospitalar (CCIH) informa que a revisão anual do protocolo de higienização das mãos e precauções de contato já está em vigor em todas as unidades assistenciais. Consulte o POP atualizado na Central de Documentos.",
    categoria: "COMUNICADO",
    destaque: true,
    data_publicacao: "2026-10-19T14:30:00",
    autor: { id_usuario: 1, nome: "CCIH · Controle de Infecção" },
    imagem: "1519494026892-4ade0b5c4da2",
  },
  {
    id_aviso: 3,
    titulo: "Parabéns aos colaboradores promovidos no ciclo de avaliação semestral",
    resumo:
      "O setor de Recursos Humanos parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia e Administração.",
    conteudo:
      "O setor de Recursos Humanos parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia e Administração. Agradecemos a dedicação ao cuidado hospitalar.",
    categoria: "PROMOCAO",
    destaque: false,
    data_publicacao: "2026-10-17T10:00:00",
    autor: { id_usuario: 3, nome: "Recursos Humanos" },
    imagem: "1600880292203-757bb62b4baf",
  },
  {
    id_aviso: 4,
    titulo: "Transferência do atendimento presencial do RH para o 4º andar",
    resumo:
      "Informamos que a sala de atendimento ao colaborador do setor de Recursos Humanos passa a atender exclusivamente no 4º andar (ramais 4101 e 4102).",
    conteudo:
      "Informamos que a sala de atendimento ao colaborador do setor de Recursos Humanos e Departamento Pessoal passa a atender exclusivamente no 4º andar (ramais 4101 e 4102).",
    categoria: "MUDANCA_SETOR",
    destaque: false,
    data_publicacao: "2026-10-15T11:15:00",
    autor: { id_usuario: 3, nome: "Recursos Humanos" },
    imagem: "1582750433449-648ed127bb54",
  },
];

export const MOCK_EVENTOS = [
  {
    id_evento: 1,
    titulo: "Treinamento Prático de Suporte Básico de Vida (BLS)",
    descricao:
      "Capacitação prática obrigatória para técnicos de enfermagem e enfermeiros da UTI, Pronto-Socorro e Centro Cirúrgico.",
    categoria: "TREINAMENTO",
    data_inicio: "2026-10-24T08:00:00",
    data_fim: "2026-10-24T12:00:00",
    local: "Centro de Simulação Clínica — 2º andar",
    setor: { id_setor: 1, nome: "UTI" },
  },
  {
    id_evento: 2,
    titulo: "Campanha Interna de Saúde Mental e Qualidade de Vida no Plantão",
    descricao:
      "Rodas de conversa, orientações ergonômicas e ações de acolhimento para colaboradores de todos os turnos.",
    categoria: "ACAO_INTERNA",
    data_inicio: "2026-10-28T09:00:00",
    data_fim: "2026-10-28T15:00:00",
    local: "Espaço Convivência — Térreo",
    setor: { id_setor: 8, nome: "RH" },
  },
  {
    id_evento: 3,
    titulo: "Apresentação de Indicadores de Qualidade e Segurança do Paciente",
    descricao:
      "Reunião institucional aberta às lideranças e equipes administrativas sobre metas de qualidade e protocolos ONA.",
    categoria: "INSTITUCIONAL",
    data_inicio: "2026-11-03T14:00:00",
    data_fim: "2026-11-03T16:00:00",
    local: "Auditório Principal — 4º andar",
    setor: { id_setor: 7, nome: "Administração" },
  },
  {
    id_evento: 4,
    titulo: "Workshop de Segurança da Informação e Boas Práticas na Intranet",
    descricao:
      "Orientações rápidas sobre proteção de credenciais, privacidade de dados hospitalares e uso do novo portal interno.",
    categoria: "OUTRO",
    data_inicio: "2026-11-10T10:00:00",
    data_fim: "2026-11-10T12:00:00",
    local: "Sala de Treinamento TI — 4º andar",
    setor: { id_setor: 10, nome: "Tecnologia" },
  },
];

const _HOJE_MOCK = new Date();
const _DIA_ATUAL_MOCK = _HOJE_MOCK.getDate();
const _MES_ATUAL_MOCK = _HOJE_MOCK.getMonth() + 1;

export const MOCK_ANIVERSARIANTES = [
  {
    id_usuario: 2,
    nome: "Carlos Menezes",
    cargo: "Técnico de Enfermagem",
    setor: { id_setor: 1, nome: "UTI" },
    dia: _DIA_ATUAL_MOCK,
    mes: _MES_ATUAL_MOCK,
    aniversario_hoje: true,
  },
  {
    id_usuario: 14,
    nome: "Isabela Martins",
    cargo: "Enfermeira de Emergência",
    setor: { id_setor: 2, nome: "Pronto-Socorro" },
    dia: _DIA_ATUAL_MOCK,
    mes: _MES_ATUAL_MOCK,
    aniversario_hoje: true,
  },
  {
    id_usuario: 6,
    nome: "Juliana Torres",
    cargo: "Recepcionista Hospitalar",
    setor: { id_setor: 6, nome: "Recepção" },
    dia: 5,
    mes: 10,
    aniversario_hoje: _DIA_ATUAL_MOCK === 5 && _MES_ATUAL_MOCK === 10,
  },
  {
    id_usuario: 21,
    nome: "Priscila Dantas",
    cargo: "Farmacêutica Clínica",
    setor: { id_setor: 5, nome: "Farmácia" },
    dia: 12,
    mes: 10,
    aniversario_hoje: _DIA_ATUAL_MOCK === 12 && _MES_ATUAL_MOCK === 10,
  },
  {
    id_usuario: 31,
    nome: "Beatriz Nogueira",
    cargo: "Enfermeira Volante (Pool Assistencial)",
    setor: null,
    dia: 15,
    mes: 10,
    aniversario_hoje: _DIA_ATUAL_MOCK === 15 && _MES_ATUAL_MOCK === 10,
  },
  {
    id_usuario: 7,
    nome: "Rafael Vasconcelos",
    cargo: "Enfermeiro Intensivista",
    setor: { id_setor: 1, nome: "UTI" },
    dia: 18,
    mes: 10,
    aniversario_hoje: _DIA_ATUAL_MOCK === 18 && _MES_ATUAL_MOCK === 10,
  },
  {
    id_usuario: 8,
    nome: "Fernanda Queiroz",
    cargo: "Supervisora de Atendimento",
    setor: { id_setor: 6, nome: "Recepção" },
    dia: 25,
    mes: 10,
    aniversario_hoje: _DIA_ATUAL_MOCK === 25 && _MES_ATUAL_MOCK === 10,
  },
  {
    id_usuario: 12,
    nome: "Bruno Cavalcanti",
    cargo: "Técnico de Farmácia",
    setor: { id_setor: 5, nome: "Farmácia" },
    dia: 3,
    mes: 11,
    aniversario_hoje: _DIA_ATUAL_MOCK === 3 && _MES_ATUAL_MOCK === 11,
  },
  {
    id_usuario: 23,
    nome: "Natália Gomes",
    cargo: "Assistente de Departamento Pessoal",
    setor: { id_setor: 8, nome: "RH" },
    dia: 23,
    mes: 11,
    aniversario_hoje: _DIA_ATUAL_MOCK === 23 && _MES_ATUAL_MOCK === 11,
  },
];

export const MOCK_DOCUMENTOS = [
  {
    id_doc: 1,
    titulo: "POP — Administração de Medicamentos via Sonda Nasogástrica",
    tipo: "POP",
    categoria: "Enfermagem",
    descricao: "Procedimento assistencial padronizado para administração segura de medicamentos por sonda.",
    palavras_chave: ["sonda", "medicamentos", "enfermagem"],
    nome_arquivo: "pop-sonda-nasogastrica.pdf",
    mime_type: "application/pdf",
    tamanho_bytes: 421888,
    data_upload: "2026-10-10T10:00:00",
    autor: { id_usuario: 1, nome: "André Luiz" },
  },
  {
    id_doc: 2,
    titulo: "POP — Curativo Simples e Complexo em Acesso Venoso Central",
    tipo: "POP",
    categoria: "Enfermagem",
    descricao: "Técnica asséptica e periodicidade de troca de curativo central na UTI e internação.",
    palavras_chave: ["curativo", "cateter", "acesso venoso"],
    nome_arquivo: "pop-curativo-central.pdf",
    mime_type: "application/pdf",
    tamanho_bytes: 653312,
    data_upload: "2026-10-12T14:20:00",
    autor: { id_usuario: 1, nome: "André Luiz" },
  },
  {
    id_doc: 3,
    titulo: "POP — Dispensação e Rastreabilidade de Medicamentos Controlados",
    tipo: "POP",
    categoria: "Farmácia",
    descricao: "Normas de conferência dupla e controle de lote da Farmácia Hospitalar.",
    palavras_chave: ["controlados", "farmácia", "dispensação"],
    nome_arquivo: "pop-dispensacao-controlados.pdf",
    mime_type: "application/pdf",
    tamanho_bytes: 532480,
    data_upload: "2026-10-14T09:15:00",
    autor: { id_usuario: 1, nome: "André Luiz" },
  },
  {
    id_doc: 4,
    titulo: "Protocolo de Acolhimento e Fluxo de Internação na Recepção Central",
    tipo: "DOCUMENTO",
    categoria: "Administrativo",
    descricao: "Diretrizes de atendimento inicial, conferência documental e encaminhamento aos setores.",
    palavras_chave: ["recepção", "internação", "atendimento"],
    nome_arquivo: "fluxo-recepcao-internacao.pdf",
    mime_type: "application/pdf",
    tamanho_bytes: 348160,
    data_upload: "2026-10-16T16:00:00",
    autor: { id_usuario: 1, nome: "André Luiz" },
  },
];

export const MOCK_FAQS = [
  {
    categoria: "Benefícios",
    perguntas: [
      {
        id_faq: 1,
        pergunta: "Como incluir dependentes no plano de saúde e odontológico?",
        resposta:
          "Compareça ao RH (4º andar, ramal 4102) apresentando certidão de casamento ou nascimento, CPF e documento de identidade do dependente em até 30 dias após o evento ou admissão.",
        categoria: "Benefícios",
        ordem: 1,
      },
      {
        id_faq: 2,
        pergunta: "Em que dia ocorre a recarga do vale-alimentação e vale-transporte?",
        resposta:
          "O crédito do vale-alimentação/refeição e do vale-transporte é disponibilizado até o último dia útil do mês anterior ao mês de competência.",
        categoria: "Benefícios",
        ordem: 2,
      },
    ],
  },
  {
    categoria: "Escalas",
    perguntas: [
      {
        id_faq: 3,
        pergunta: "Qual o procedimento para solicitar troca de plantão entre colaboradores?",
        resposta:
          "As trocas de plantão devem ser solicitadas com no mínimo 48 horas de antecedência, mediante assinatura de ambos os profissionais e aprovação formal da coordenação do setor.",
        categoria: "Escalas",
        ordem: 1,
      },
      {
        id_faq: 4,
        pergunta: "Quando a escala mensal do setor é divulgada?",
        resposta:
          "As escalas mensais das áreas assistenciais e de apoio são publicadas pelas coordenações até o dia 25 do mês anterior.",
        categoria: "Escalas",
        ordem: 2,
      },
    ],
  },
  {
    categoria: "Férias",
    perguntas: [
      {
        id_faq: 5,
        pergunta: "Com quanta antecedência devo alinhar o período de férias com minha coordenação?",
        resposta:
          "A solicitação de férias deve ser alinhada com o gestor imediato e registrada junto ao RH com no mínimo 60 dias de antecedência do início do gozo.",
        categoria: "Férias",
        ordem: 1,
      },
    ],
  },
  {
    categoria: "Normas Hospitalares",
    perguntas: [
      {
        id_faq: 6,
        pergunta: "Quais são as regras sobre o uso de adornos nas áreas assistenciais?",
        resposta:
          "Em conformidade com a NR-32 e diretrizes da CCIH, é estritamente proibido o uso de anéis, alianças, relógios, pulseiras e colares expostos nas áreas de assistência ao paciente.",
        categoria: "Normas Hospitalares",
        ordem: 1,
      },
    ],
  },
];
