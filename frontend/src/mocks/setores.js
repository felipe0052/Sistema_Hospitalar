export const SETORES_MOCK = [
  {
    id_setor: 1,
    nome: "UTI",
    andar: "2º andar",
    ramais: [
      { id_ramal: 1, numero: "2101", descricao: "Posto de Enfermagem UTI" },
      { id_ramal: 2, numero: "2102", descricao: "Coordenação UTI" },
      { id_ramal: 3, numero: "2103", descricao: "Secretaria UTI" },
    ],
    total_usuarios: 5,
  },
  {
    id_setor: 2,
    nome: "Pronto-Socorro",
    andar: "Térreo",
    ramais: [
      { id_ramal: 4, numero: "1001", descricao: "Triagem / Classificação de Risco" },
      { id_ramal: 5, numero: "1002", descricao: "Posto de Enfermagem PS" },
      { id_ramal: 6, numero: "1003", descricao: "Sala de Emergência" },
    ],
    total_usuarios: 3,
  },
  {
    id_setor: 3,
    nome: "Centro Cirúrgico",
    andar: "3º andar",
    ramais: [
      { id_ramal: 7, numero: "3101", descricao: "Posto de Enfermagem CC" },
      { id_ramal: 8, numero: "3102", descricao: "Recuperação Pós-Anestésica (RPA)" },
    ],
    total_usuarios: 2,
  },
  {
    id_setor: 4,
    nome: "Pediatria",
    andar: "1º andar",
    ramais: [
      { id_ramal: 9, numero: "1101", descricao: "Posto de Enfermagem Pediatria" },
      { id_ramal: 10, numero: "1102", descricao: "Coordenação Pediatria" },
    ],
    total_usuarios: 2,
  },
  {
    id_setor: 5,
    nome: "Farmácia",
    andar: "Térreo",
    ramais: [
      { id_ramal: 11, numero: "1201", descricao: "Dispensação Central" },
      { id_ramal: 12, numero: "1202", descricao: "Farmácia Clínica / Controlados" },
    ],
    total_usuarios: 3,
  },
  {
    id_setor: 6,
    nome: "Recepção",
    andar: "Térreo",
    ramais: [
      { id_ramal: 13, numero: "1000", descricao: "Recepção Central" },
      { id_ramal: 14, numero: "1005", descricao: "Internação e Altas" },
    ],
    total_usuarios: 3,
  },
  {
    id_setor: 7,
    nome: "Administração",
    andar: "4º andar",
    ramais: [
      { id_ramal: 15, numero: "4001", descricao: "Diretoria Administrativa" },
      { id_ramal: 16, numero: "4002", descricao: "Financeiro e Faturamento" },
    ],
    total_usuarios: 4,
  },
  {
    id_setor: 8,
    nome: "RH",
    andar: "4º andar",
    ramais: [
      { id_ramal: 17, numero: "4101", descricao: "Atendimento ao Colaborador" },
      { id_ramal: 18, numero: "4102", descricao: "Departamento Pessoal e Benefícios" },
    ],
    total_usuarios: 3,
  },
  {
    id_setor: 9,
    nome: "Laboratório",
    andar: "1º andar",
    ramais: [
      { id_ramal: 19, numero: "1301", descricao: "Coleta e Recepção de Amostras" },
      { id_ramal: 20, numero: "1302", descricao: "Bancada de Análises Clínicas" },
    ],
    total_usuarios: 3,
  },
  {
    id_setor: 10,
    nome: "Tecnologia",
    andar: "4º andar",
    ramais: [
      { id_ramal: 21, numero: "4201", descricao: "Service Desk / Suporte TI" },
      { id_ramal: 22, numero: "4202", descricao: "Infraestrutura e Sistemas" },
    ],
    total_usuarios: 3,
  },
];

export default SETORES_MOCK;
