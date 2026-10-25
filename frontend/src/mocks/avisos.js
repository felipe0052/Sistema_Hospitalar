export const AVISOS_MOCK_INICIAL = [
  {
    id_aviso: 1,
    titulo: "Hospital Decós conquista certificação ONA Nível III em Gestão da Qualidade",
    resumo:
      "Após auditoria realizada no último ciclo avaliativo, o Hospital Decós conquistou a certificação ONA Nível III (Acreditado com Excelência), reafirmando o compromisso de todas as equipes assistenciais e administrativas.",
    conteudo:
      "<p>Após auditoria realizada no último ciclo avaliativo, o <strong>Hospital Decós</strong> conquistou a certificação <strong>ONA Nível III (Acreditado com Excelência)</strong>, reafirmando o compromisso de todas as equipes assistenciais e administrativas com a segurança do paciente e a melhoria contínua dos processos hospitalares.</p><p>Agradecemos a dedicação de cada colaborador em manter nossos protocolos assistenciais e operacionais em conformidade com os mais altos padrões nacionais.</p>",
    categoria: "NOTICIA",
    destaque: true,
    data_publicacao: "2026-10-23T09:00:00",
    data_expiracao: null,
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 4, nome: "Maria Silva" },
  },
  {
    id_aviso: 2,
    titulo: "Atualização obrigatória do protocolo de higienização das mãos e controle de infecção",
    resumo:
      "A Comissão de Controle de Infecção Hospitalar (CCIH) informa que a revisão anual do protocolo de higienização das mãos e precauções de contato já está em vigor em todas as unidades assistenciais.",
    conteudo:
      "<p>A <strong>Comissão de Controle de Infecção Hospitalar (CCIH)</strong> informa que a revisão anual do protocolo de higienização das mãos e precauções de contato já está em vigor em todas as unidades assistenciais.</p><ul><li>Reforçar os 5 momentos para a higienização das mãos;</li><li>Conferir a disponibilidade de dispensadores de solução alcoólica nos postos;</li><li>Consultar o POP atualizado na Central de Documentos.</li></ul>",
    categoria: "COMUNICADO",
    destaque: true,
    data_publicacao: "2026-10-22T14:30:00",
    data_expiracao: "2026-12-31",
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 1, nome: "André Luiz (Administrador)" },
  },
  {
    id_aviso: 3,
    titulo: "Parabéns aos colaboradores promovidos no ciclo de avaliação semestral",
    resumo:
      "O setor de Recursos Humanos parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia, Recepção e Administração.",
    conteudo:
      "<p>O setor de <strong>Recursos Humanos</strong> parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia, Recepção e Administração.</p><p>O reconhecimento reflete a excelência técnica, a empatia no acolhimento e a dedicação diária ao cuidado hospitalar.</p>",
    categoria: "PROMOCAO",
    destaque: true,
    data_publicacao: "2026-10-21T10:00:00",
    data_expiracao: "2026-11-30",
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 3, nome: "Patrícia Nunes" },
  },
  {
    id_aviso: 4,
    titulo: "Inauguração do novo Centro de Simulação Clínica para treinamentos internos",
    resumo:
      "O novo espaço de capacitação assistencial no 2º andar conta com manequins de alta fidelidade e sala de debriefing para treinamentos de suporte básico e avançado de vida.",
    conteudo:
      "<p>O novo espaço de capacitação assistencial no 2º andar conta com manequins de alta fidelidade e sala de debriefing para treinamentos de suporte básico e avançado de vida e procedimentos de enfermagem.</p>",
    categoria: "NOTICIA",
    destaque: false,
    data_publicacao: "2026-10-20T16:15:00",
    data_expiracao: null,
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 4, nome: "Maria Silva" },
  },
  {
    id_aviso: 5,
    titulo: "Transferência do atendimento presencial do RH para o 4º andar",
    resumo:
      "Informamos que a sala de atendimento ao colaborador do setor de Recursos Humanos e Departamento Pessoal passa a atender exclusivamente no 4º andar (ramais 4101 e 4102).",
    conteudo:
      "<p>Informamos que a sala de atendimento ao colaborador do setor de <strong>Recursos Humanos e Departamento Pessoal</strong> passa a atender exclusivamente no 4º andar (ramais 4101 e 4102), de segunda a sexta-feira, das 08h às 17h30.</p>",
    categoria: "MUDANCA_SETOR",
    destaque: false,
    data_publicacao: "2026-10-19T11:15:00",
    data_expiracao: "2026-12-15",
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 3, nome: "Patrícia Nunes" },
  },
  {
    id_aviso: 6,
    titulo: "Nova coordenação de Enfermagem da Unidade de Terapia Intensiva",
    resumo:
      "Comunicamos a promoção da enfermeira sênior Ana Beatriz Costa ao cargo de Coordenadora de Enfermagem da UTI, desejando sucesso na condução da equipe assistencial.",
    conteudo:
      "<p>Comunicamos a promoção da enfermeira sênior <strong>Ana Beatriz Costa</strong> ao cargo de Coordenadora de Enfermagem da UTI, desejando sucesso na condução da equipe assistencial do 2º andar.</p>",
    categoria: "PROMOCAO",
    destaque: false,
    data_publicacao: "2026-10-18T09:40:00",
    data_expiracao: null,
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 3, nome: "Patrícia Nunes" },
  },
  {
    id_aviso: 7,
    titulo: "Reorganização física da Central de Coleta do Laboratório no 1º andar",
    resumo:
      "A recepção interna de amostras biológicas do Laboratório foi unificada na ala norte do 1º andar (ramais 1301 e 1302) para agilizar o fluxo de exames de urgência.",
    conteudo:
      "<p>A recepção interna de amostras biológicas do Laboratório foi unificada na ala norte do 1º andar (ramais 1301 e 1302) para agilizar o fluxo de exames de urgência do Pronto-Socorro e UTI.</p>",
    categoria: "MUDANCA_SETOR",
    destaque: false,
    data_publicacao: "2026-10-17T15:00:00",
    data_expiracao: null,
    data_atualizacao: null,
    expirado: false,
    autor: { id_usuario: 1, nome: "André Luiz (Administrador)" },
  },
  {
    id_aviso: 8,
    titulo: "Manutenção preventiva concluída nos elevadores do Bloco A",
    resumo:
      "Informamos que a manutenção preventiva programada nos elevadores do Bloco A foi realizada no último mês sem intercorrências. Este aviso já teve sua vigência encerrada.",
    conteudo:
      "<p>Informamos que a manutenção preventiva programada nos elevadores do Bloco A foi realizada no último mês sem intercorrências. Este aviso já teve sua vigência encerrada.</p>",
    categoria: "COMUNICADO",
    destaque: false,
    data_publicacao: "2026-10-05T08:30:00",
    data_expiracao: "2026-10-15",
    data_atualizacao: null,
    expirado: true,
    autor: { id_usuario: 1, nome: "André Luiz (Administrador)" },
  },
];

export default AVISOS_MOCK_INICIAL;
