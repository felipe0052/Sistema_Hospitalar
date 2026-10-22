ALTER SESSION SET CONTAINER=FREEPDB1;
ALTER SESSION SET CURRENT_SCHEMA=DECOS;

-- =====================================================================
-- 1. SETORES (10 setores hospitalares com andar)
-- =====================================================================
INSERT INTO SETORES (NOME, ANDAR) VALUES ('UTI', '2º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Pronto-Socorro', 'Térreo');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Centro Cirúrgico', '3º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Pediatria', '1º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Farmácia', 'Térreo');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Recepção', 'Térreo');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Administração', '4º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('RH', '4º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Laboratório', '1º andar');
INSERT INTO SETORES (NOME, ANDAR) VALUES ('Tecnologia', '4º andar');

-- =====================================================================
-- 2. RAMAIS (1 a 3 ramais por setor)
-- =====================================================================
-- UTI (ID_SETOR = 1)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('2101', 'Posto de Enfermagem UTI', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'UTI'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('2102', 'Coordenação UTI', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'UTI'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('2103', 'Secretaria UTI', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'UTI'));

-- Pronto-Socorro (ID_SETOR = 2)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1001', 'Triagem / Classificação de Risco', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Pronto-Socorro'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1002', 'Posto de Enfermagem PS', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Pronto-Socorro'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1003', 'Sala de Emergência', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Pronto-Socorro'));

-- Centro Cirúrgico (ID_SETOR = 3)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('3101', 'Posto de Enfermagem CC', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Centro Cirúrgico'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('3102', 'Recuperação Pós-Anestésica (RPA)', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Centro Cirúrgico'));

-- Pediatria (ID_SETOR = 4)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1101', 'Posto de Enfermagem Pediatria', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Pediatria'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1102', 'Coordenação Pediatria', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Pediatria'));

-- Farmácia (ID_SETOR = 5)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1201', 'Dispensação Central', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Farmácia'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1202', 'Farmácia Clínica / Controlados', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Farmácia'));

-- Recepção (ID_SETOR = 6)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1000', 'Recepção Central', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Recepção'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1005', 'Internação e Altas', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Recepção'));

-- Administração (ID_SETOR = 7)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4001', 'Diretoria Administrativa', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Administração'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4002', 'Financeiro e Faturamento', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Administração'));

-- RH (ID_SETOR = 8)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4101', 'Atendimento ao Colaborador', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'RH'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4102', 'Departamento Pessoal e Benefícios', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'RH'));

-- Laboratório (ID_SETOR = 9)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1301', 'Coleta e Recepção de Amostras', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Laboratório'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('1302', 'Bancada de Análises Clínicas', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Laboratório'));

-- Tecnologia (ID_SETOR = 10)
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4201', 'Service Desk / Suporte TI', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Tecnologia'));
INSERT INTO RAMAIS (NUMERO, DESCRICAO, ID_SETOR) VALUES ('4202', 'Infraestrutura e Sistemas', (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Tecnologia'));

-- =====================================================================
-- 3. AVISOS (8 avisos: 2 de cada categoria, 2 com DESTAQUE='S', 1 expirado)
-- =====================================================================
-- 1. NOTICIA (DESTAQUE = 'S', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Hospital Decós conquista certificação ONA Nível III em Gestão da Qualidade',
    'Após auditoria realizada no último ciclo avaliativo, o Hospital Decós conquistou a certificação ONA Nível III (Acreditado com Excelência), reafirmando o compromisso de todas as equipes assistenciais e administrativas com a segurança do paciente e a melhoria contínua dos processos hospitalares.',
    'NOTICIA',
    'S',
    CURRENT_TIMESTAMP - INTERVAL '1' DAY,
    NULL
);

-- 2. NOTICIA (DESTAQUE = 'N', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Inauguração do novo Centro de Simulação Clínica para treinamentos internos',
    'O novo espaço de capacitação assistencial conta com manequins de alta fidelidade e sala de debriefing para treinamentos de suporte básico e avançado de vida e procedimentos de enfermagem.',
    'NOTICIA',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '3' DAY,
    NULL
);

-- 3. COMUNICADO (DESTAQUE = 'S', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Atualização obrigatória do protocolo de higienização das mãos e controle de infecção',
    'A Comissão de Controle de Infecção Hospitalar (CCIH) informa que a revisão anual do protocolo de higienização das mãos e precauções de contato já está em vigor em todas as unidades assistenciais. Consulte o POP atualizado na Central de Documentos.',
    'COMUNICADO',
    'S',
    CURRENT_TIMESTAMP - INTERVAL '2' DAY,
    TRUNC(SYSDATE) + 60
);

-- 4. COMUNICADO (DESTAQUE = 'N', EXPIRADO para testar filtro de vigência)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Manutenção preventiva concluída nos elevadores do Bloco A',
    'Informamos que a manutenção preventiva programada nos elevadores do Bloco A foi realizada no último mês sem intercorrências. Este aviso já teve sua vigência encerrada.',
    'COMUNICADO',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '15' DAY,
    TRUNC(SYSDATE) - 5
);

-- 5. PROMOCAO (DESTAQUE = 'N', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Parabéns aos colaboradores promovidos no ciclo de avaliação semestral',
    'O setor de Recursos Humanos parabeniza os profissionais promovidos neste semestre nos setores de Enfermagem, Farmácia e Administração. Agradecemos a dedicação ao cuidado hospitalar.',
    'PROMOCAO',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '4' DAY,
    TRUNC(SYSDATE) + 30
);

-- 6. PROMOCAO (DESTAQUE = 'N', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Nova coordenação de Enfermagem da Unidade de Terapia Intensiva',
    'Comunicamos a promoção da enfermeira sênior Ana Beatriz Costa ao cargo de Coordenadora de Enfermagem da UTI, desejando sucesso na condução da equipe assistencial.',
    'PROMOCAO',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '6' DAY,
    NULL
);

-- 7. MUDANCA_SETOR (DESTAQUE = 'N', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Transferência do atendimento presencial do RH para o 4º andar',
    'Informamos que a sala de atendimento ao colaborador do setor de Recursos Humanos e Departamento Pessoal passa a atender exclusivamente no 4º andar (ramais 4101 e 4102).',
    'MUDANCA_SETOR',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '5' DAY,
    TRUNC(SYSDATE) + 45
);

-- 8. MUDANCA_SETOR (DESTAQUE = 'N', vigente)
INSERT INTO AVISOS (TITULO, CONTEUDO, CATEGORIA, DESTAQUE, DATA_PUBLICACAO, DATA_EXPIRACAO)
VALUES (
    'Reorganização física da Central de Coleta do Laboratório no 1º andar',
    'A recepção interna de amostras biológicas do Laboratório foi unificada na ala norte do 1º andar para agilizar o fluxo de exames de urgência do Pronto-Socorro e UTI.',
    'MUDANCA_SETOR',
    'N',
    CURRENT_TIMESTAMP - INTERVAL '7' DAY,
    NULL
);

-- =====================================================================
-- 4. EVENTOS (6 eventos: 4 futuros e 2 passados, categorias variadas)
-- =====================================================================
-- Passado 1
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Integração Institucional de Novos Colaboradores — Turma Anterior',
    'Onboarding institucional apresentando normas de biossegurança, fluxos de RH e cultura de atendimento do Hospital Decós.',
    'TREINAMENTO',
    CURRENT_TIMESTAMP - INTERVAL '14' DAY,
    CURRENT_TIMESTAMP - INTERVAL '14' DAY + INTERVAL '3' HOUR,
    'Auditório Principal — 4º andar',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'RH')
);

-- Passado 2
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Reunião de Alinhamento sobre Dispensação de Medicamentos Controlados',
    'Revisão dos fluxos de rastreabilidade de lotes e conferência dupla entre Farmácia e postos de enfermagem.',
    'INSTITUCIONAL',
    CURRENT_TIMESTAMP - INTERVAL '7' DAY,
    CURRENT_TIMESTAMP - INTERVAL '7' DAY + INTERVAL '2' HOUR,
    'Sala de Reuniões — Térreo',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Farmácia')
);

-- Futuro 1
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Treinamento Prático de Suporte Básico de Vida (BLS) para Equipes Assistenciais',
    'Capacitação prática obrigatória para técnicos de enfermagem e enfermeiros da UTI, Pronto-Socorro e Centro Cirúrgico.',
    'TREINAMENTO',
    CURRENT_TIMESTAMP + INTERVAL '3' DAY,
    CURRENT_TIMESTAMP + INTERVAL '3' DAY + INTERVAL '4' HOUR,
    'Centro de Simulação Clínica — 2º andar',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'UTI')
);

-- Futuro 2
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Campanha Interna de Saúde Mental e Qualidade de Vida no Plantão',
    'Rodas de conversa, orientações ergonômicas e ações de acolhimento para colaboradores de todos os turnos.',
    'ACAO_INTERNA',
    CURRENT_TIMESTAMP + INTERVAL '7' DAY,
    CURRENT_TIMESTAMP + INTERVAL '7' DAY + INTERVAL '6' HOUR,
    'Espaço Convivência — Térreo',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'RH')
);

-- Futuro 3
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Apresentação de Indicadores de Qualidade e Segurança do Paciente',
    'Reunião institucional aberta às lideranças e equipes administrativas sobre metas de qualidade e protocolos ONA.',
    'INSTITUCIONAL',
    CURRENT_TIMESTAMP + INTERVAL '12' DAY,
    CURRENT_TIMESTAMP + INTERVAL '12' DAY + INTERVAL '2' HOUR,
    'Auditório Principal — 4º andar',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Administração')
);

-- Futuro 4
INSERT INTO EVENTOS (TITULO, DESCRICAO, CATEGORIA, DATA_INICIO, DATA_FIM, LOCAL, ID_SETOR)
VALUES (
    'Workshop de Segurança da Informação e Boas Práticas na Intranet',
    'Orientações rápidas sobre proteção de credenciais, privacidade de dados hospitalares e uso do novo portal interno.',
    'OUTRO',
    CURRENT_TIMESTAMP + INTERVAL '18' DAY,
    CURRENT_TIMESTAMP + INTERVAL '18' DAY + INTERVAL '2' HOUR,
    'Sala de Treinamento TI — 4º andar',
    (SELECT ID_SETOR FROM SETORES WHERE NOME = 'Tecnologia')
);

-- =====================================================================
-- 5. FAQS (12 FAQs em 4 categorias: Férias, Benefícios, Escalas, Normas Hospitalares)
-- =====================================================================
-- Categoria 1: Férias
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Com quanta antecedência devo alinhar o período de férias com minha coordenação?',
    'A solicitação de férias deve ser alinhada com o gestor imediato e registrada junto ao RH com no mínimo 60 dias de antecedência do início do gozo, garantindo a organização das escalas do setor.',
    'Férias',
    1
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Posso parcelar minhas férias em até quantos períodos?',
    'Conforme a legislação vigente e política interna do Hospital Decós, as férias podem ser fracionadas em até 3 períodos, desde que um deles não seja inferior a 14 dias corridos e os demais não sejam inferiores a 5 dias corridos cada.',
    'Férias',
    2
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Como funciona a solicitação do abono pecuniário (venda de 1/3 das férias)?',
    'O colaborador que desejar converter 1/3 do período de férias em abono pecuniário deve formalizar o pedido no RH até 15 dias antes do término do período aquisitivo.',
    'Férias',
    3
);

-- Categoria 2: Benefícios
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Como incluir dependentes no plano de saúde e odontológico?',
    'Para incluir cônjuge ou filhos como dependentes, compareça ao RH (4º andar, ramal 4102) apresentando certidão de casamento ou nascimento, CPF e documento de identidade do dependente em até 30 dias após o evento ou admissão.',
    'Benefícios',
    1
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Em que dia ocorre a recarga do vale-alimentação e vale-transporte?',
    'O crédito do vale-alimentação/refeição e do vale-transporte é disponibilizado até o último dia útil do mês anterior ao mês de competência.',
    'Benefícios',
    2
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'O que fazer em caso de perda ou dano ao cartão de benefícios?',
    'Solicite imediatamente o bloqueio pelo aplicativo da operadora do cartão e comunique o Departamento Pessoal no ramal 4102 para emissão da segunda via.',
    'Benefícios',
    3
);

-- Categoria 3: Escalas
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Qual o procedimento para solicitar troca de plantão entre colaboradores?',
    'As trocas de plantão devem ser solicitadas com no mínimo 48 horas de antecedência, mediante assinatura de ambos os profissionais e aprovação formal da coordenação do setor, respeitando o intervalo interjornada mínimo de 11 horas.',
    'Escalas',
    1
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Quando a escala mensal do setor é divulgada?',
    'As escalas mensais das áreas assistenciais e de apoio são publicadas pelas coordenações até o dia 25 do mês anterior.',
    'Escalas',
    2
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Como proceder em caso de ausência imprevista por motivo de saúde?',
    'Comunique imediatamente sua liderança direta por telefone/ramal do setor antes do início do turno e entregue o atestado médico original à Medicina do Trabalho/RH em até 48 horas.',
    'Escalas',
    3
);

-- Categoria 4: Normas Hospitalares
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Quais são as regras sobre o uso de adornos nas áreas assistenciais?',
    'Em conformidade com a NR-32 e diretrizes da CCIH, é estritamente proibido o uso de anéis, alianças, relógios, pulseiras e colares expostos em todas as áreas de assistência ao paciente e manipulação de insumos.',
    'Normas Hospitalares',
    1
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'O uso do crachá de identificação é obrigatório em todas as dependências?',
    'Sim. Todo colaborador deve portar o crachá institucional em local visível durante toda a permanência nas dependências do Hospital Decós, utilizando-o também nas catracas de acesso.',
    'Normas Hospitalares',
    2
);
INSERT INTO FAQS (PERGUNTA, RESPOSTA, CATEGORIA, ORDEM)
VALUES (
    'Onde encontro os Procedimentos Operacionais Padrão (POPs) vigentes do meu setor?',
    'Todos os POPs vigentes estão centralizados no menu "Documentos (POPs)" desta Intranet, onde é possível filtrar por categoria (Enfermagem, Farmácia, Administrativo, etc.) ou buscar por palavras-chave.',
    'Normas Hospitalares',
    3
);

COMMIT;
