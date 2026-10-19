import { useState, useEffect, useRef } from "react";
import decoLogo from "./imports/Decos_Hospital_Logo_Horizontal_Transparente.png";
import { DataProvider, useData } from "./lib/data-context";
import * as api from "./lib/api";
import { AuthProvider, useAuth } from "./lib/auth-context";
import Login from "./Login";

// ─── Icon helper ─────────────────────────────────────────────────────────────
function Icon({ path, size = 20, className = "", style }: { path: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  home:          "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
  bell:          "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0",
  search:        "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
  megaphone:     "M3 11l19-9-9 19-2-8-8-2z",
  calendar:      "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  award:         "M12 15a7 7 0 100-14 7 7 0 000 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
  folder:        "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  logout:        "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
  chevronRight:  "M9 18l6-6-6-6",
  eye:           "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12a3 3 0 100-6 3 3 0 000 6",
  heart:         "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  chat:          "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  plus:          "M12 5v14 M5 12h14",
  gift:          "M20 12v10H4V12 M2 7h20v5H2z M12 22V7 M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z",
  users:         "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  settings:      "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
  pin:           "M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z M12 9a2 2 0 100-4 2 2 0 000 4",
  file:          "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  download:      "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
  mapPin:        "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z M12 10a3 3 0 100-6 3 3 0 000 6",
  clock:         "M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6v6l4 2",
  quote:         "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type NavKey = "home" | "noticias" | "eventos" | "diretorio" | "reconhecimentos" | "documentos" | "faq";
type DocCategory = string;
type EventType = "campanha" | "treinamento" | "institucional" | "social" | "saude";

interface EventFull {
  id: number;
  date: string;
  title: string;
  type: EventType;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  location: string;
  description: string;
}

interface QuickLink { id: string; label: string; icon: string; }

// ─── Nav ──────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "home",           label: "Início",                   icon: "home" },
  { key: "noticias",       label: "Notícias e Comunicados",   icon: "megaphone", badge: 3 },
  { key: "eventos",        label: "Eventos",                  icon: "calendar" },
  { key: "diretorio",      label: "Diretório e Ramais",       icon: "users" },
  { key: "reconhecimentos",label: "Reconhecimentos",          icon: "award" },
  { key: "documentos",     label: "Documentos (POPs)",        icon: "folder" },
  { key: "faq",            label: "FAQ (Central de Ajuda)",   icon: "chat" },
];

// ─── Events data ──────────────────────────────────────────────────────────────
const EVENTS_FULL: EventFull[] = [
  { id: 1,  date: "2026-08-29", title: "Semana da Saúde Mental — Abertura", type: "campanha",      startHour: 8,  startMin: 0,  endHour: 17, endMin: 0,  location: "Auditório Principal", description: "Palestras, rodas de conversa e atividades de bem-estar para colaboradores de todas as unidades da rede Decós." },
  { id: 2,  date: "2026-09-02", title: "Treinamento BLS/ACLS — Turma C",   type: "treinamento",   startHour: 8,  startMin: 0,  endHour: 16, endMin: 0,  location: "Centro de Simulação · Pav. B", description: "Suporte Básico e Avançado de Vida. Obrigatório para equipes de UTI, Pronto-Atendimento e Centro Cirúrgico." },
  { id: 3,  date: "2026-09-05", title: "Check-up Preventivo — Turma Manhã",type: "saude",          startHour: 7,  startMin: 30, endHour: 12, endMin: 0,  location: "Medicina do Trabalho · Pav. A", description: "Exames periódicos obrigatórios para colaboradores admitidos até março de 2026. Leve documento com foto." },
  { id: 4,  date: "2026-09-05", title: "Assembleia Geral dos Colaboradores",type: "institucional", startHour: 14, startMin: 0,  endHour: 16, endMin: 0,  location: "Auditório Principal · Sede", description: "Apresentação dos resultados do Q2 2026, metas do Q3 e comunicados estratégicos da diretoria executiva." },
  { id: 5,  date: "2026-09-10", title: "Workshop: Comunicação Não-Violenta", type: "treinamento",  startHour: 9,  startMin: 0,  endHour: 13, endMin: 0,  location: "Sala 3B · RH", description: "Técnicas de CNV aplicadas ao ambiente hospitalar. Facilitadora: Profa. Dra. Cláudia Torres — USP Ribeirão." },
  { id: 6,  date: "2026-09-10", title: "Reunião de Setor — Farmácia",       type: "institucional", startHour: 15, startMin: 0,  endHour: 16, endMin: 30, location: "Sala de Reuniões 1A", description: "Alinhamento sobre novo protocolo de dispensação de controlados e integração com o MV Soul v4.2." },
  { id: 7,  date: "2026-09-15", title: "Confraternização Dia do Médico",    type: "social",        startHour: 19, startMin: 0,  endHour: 22, endMin: 0,  location: "Rooftop · Torre Decós", description: "Celebração do Dia do Médico com jantar, música ao vivo e homenagem aos profissionais da casa." },
  { id: 8,  date: "2026-09-22", title: "Comitê de Qualidade — ONA",         type: "institucional", startHour: 10, startMin: 0,  endHour: 12, endMin: 0,  location: "Sala Executiva · 8º Andar", description: "Revisão dos indicadores pós-certificação ONA Nível III e planejamento das auditorias internas Q4." },
  { id: 9,  date: "2026-09-22", title: "Integração de Novos Colaboradores", type: "treinamento",   startHour: 8,  startMin: 0,  endHour: 11, endMin: 0,  location: "Auditório B · RH", description: "Onboarding da turma de setembro: apresentação institucional, políticas internas e tour pelas unidades." },
  { id: 10, date: "2026-09-25", title: "Apresentação de Resultados Q3",     type: "institucional", startHour: 9,  startMin: 0,  endHour: 10, endMin: 30, location: "Sala Executiva · 8º Andar", description: "Análise financeira, indicadores clínicos e operacionais do terceiro trimestre de 2026." },
];

// ─── News data (fallback quando a API não está acessível) ────────────────────
const MOCK_NEWS = [
  { id: 1, title: "Decós conquista certificação ONA Nível III em Gestão da Qualidade", excerpt: "Após auditoria realizada em agosto, o grupo Decós recebe a mais alta certificação da Organização Nacional de Acreditação, reafirmando o compromisso com a excelência no atendimento ao paciente e segurança institucional.", author: "Comunicação Institucional", date: "28 ago 2026", readTime: "4 min", image: "1576091160550-2173dba999ef", category: "Institucional", views: 1240, likes: 187 },
  { id: 2, title: "Programa Saúde do Colaborador: inscrições abertas para check-up anual", excerpt: "A Medicina do Trabalho informa que as agendas para check-up preventivo 2026 estão disponíveis no portal de benefícios. Acesso por CPF, sem necessidade de senha.", author: "Recursos Humanos", date: "27 ago 2026", readTime: "2 min", image: "1582750433449-648ed127bb54", category: "Saúde", views: 312, likes: 48 },
  { id: 3, title: "Novo protocolo de higienização das mãos entra em vigor em setembro", excerpt: "Atualização baseada nas diretrizes da ANVISA e OMS é obrigatória para todas as unidades. Treinamento online disponível na plataforma de EAD da instituição.", author: "CCIH · Controle de Infecção", date: "26 ago 2026", readTime: "3 min", image: "1519494026892-4ade0b5c4da2", category: "Protocolo", views: 890, likes: 124 },
  { id: 4, title: "MV Soul v4.2: novo módulo de prescrição eletrônica disponível", excerpt: "A atualização traz assinatura digital de laudos, integração em tempo real com a farmácia e novo fluxo de prescrição para pacientes pediátricos.", author: "TI · Sistemas Hospitalares", date: "25 ago 2026", readTime: "3 min", image: "1504439468489-c8920d58c4b4", category: "TI", views: 521, likes: 67 },
  { id: 5, title: "Trilha de desenvolvimento para líderes: inscrições até 5 de setembro", excerpt: "O programa Líderes Decós 2026 abre turma exclusiva para coordenadores e supervisores. Formato híbrido, 40 horas, em parceria com a Fundação Dom Cabral.", author: "Educação Continuada", date: "24 ago 2026", readTime: "2 min", image: "1600880292203-757bb62b4baf", category: "Desenvolvimento", views: 445, likes: 91 },
  { id: 6, title: "Resultado da pesquisa de clima organizacional 2026", excerpt: "Com 94% de participação, a pesquisa aponta índice de satisfação de 81% — crescimento de 6 pontos em relação ao ano anterior. Destaques: liderança imediata e infraestrutura.", author: "Gestão de Pessoas", date: "22 ago 2026", readTime: "5 min", image: "1573496359142-b8d87734a5a2", category: "Institucional", views: 780, likes: 210 },
  { id: 7, title: "Inauguração do novo Centro de Simulação Clínica — Pav. B", excerpt: "O espaço conta com manequins de alta fidelidade, sala de debriefing e infraestrutura para treinamentos de emergência, suporte avançado de vida e cirurgia laparoscópica.", author: "Comunicação Institucional", date: "20 ago 2026", readTime: "3 min", image: "1516549655169-df83a0d514ea", category: "Institucional", views: 634, likes: 142 },
  { id: 8, title: "Benefício flexível: nova opção de auxílio home-office aprovada", excerpt: "A partir de outubro, colaboradores em regime híbrido poderão converter parte do vale-refeição em auxílio equipamento. Regulamento disponível no Portal RH.", author: "Recursos Humanos", date: "18 ago 2026", readTime: "2 min", image: "1450101499163-c8848c66ca85", category: "Benefícios", views: 920, likes: 301 },
];

// ─── Recognitions data ────────────────────────────────────────────────────────
const ALL_RECOGNITIONS = [
  { id: 1, honoree: "Equipe da UTI Neonatal",    honoreeRole: "Enfermagem",        honoreeUnit: "UTI Neonatal",         honoreeAvatar: "1582750433449-648ed127bb54", message: "Profissionalismo e dedicação absolutos no caso da semana passada. O comprometimento de vocês faz toda a diferença para os pacientes e suas famílias.", fromName: "Ana Beatriz Costa",  fromRole: "Supervisora de Enfermagem",    fromAvatar: "1438761681033-6461ffad8d80", time: "há 2 horas",  likes: 34 },
  { id: 2, honoree: "Farmácia Hospitalar",        honoreeRole: "Farmácia",          honoreeUnit: "Sede",                 honoreeAvatar: "1472099645785-5658abf4ff4e", message: "Agilidade incrível na dispensação de emergência do plantão de sexta. O atendimento imediato foi fundamental para o desfecho positivo do paciente.", fromName: "Dr. Henrique Faria", fromRole: "Médico Plantonista · PA",      fromAvatar: "1500648767791-00dcc994a43e", time: "há 5 horas",  likes: 22 },
  { id: 3, honoree: "Dra. Luciana Barros",        honoreeRole: "Cardiologista",     honoreeUnit: "Hospital Central",     honoreeAvatar: "1494790108377-be9c29b29330", message: "Sua liderança durante a reorganização do protocolo de IAMCSST foi exemplar. O time se sentiu muito seguro com sua condução durante todo o processo.", fromName: "Dr. Rafael Vasconcelos", fromRole: "Coordenador Médico · UTI",  fromAvatar: "1472099645785-5658abf4ff4e", time: "há 1 dia",   likes: 45 },
  { id: 4, honoree: "Recepção — Clínica Norte",   honoreeRole: "Atendimento",       honoreeUnit: "Clínica Norte",        honoreeAvatar: "1573496359142-b8d87734a5a2", message: "O cuidado e a empatia no acolhimento dos pacientes idosos na última semana foram percebidos pela família e destacados em elogio formal enviado à ouvidoria.", fromName: "Fernanda Queiroz",  fromRole: "Gerente de Experiência",       fromAvatar: "1438761681033-6461ffad8d80", time: "há 2 dias",  likes: 58 },
  { id: 5, honoree: "Thiago Barros",              honoreeRole: "Analista de TI",    honoreeUnit: "Sede Administrativa",  honoreeAvatar: "1500648767791-00dcc994a43e", message: "Resolveu um incidente crítico no servidor de imagens às 2h da manhã, garantindo que todos os exames estivessem disponíveis para os cirurgiões na abertura do CC.", fromName: "Alexandre Mota",    fromRole: "Gerente de TI",                fromAvatar: "1472099645785-5658abf4ff4e", time: "há 3 dias",  likes: 71 },
  { id: 6, honoree: "Equipe de Hotelaria",        honoreeRole: "Hotelaria",         honoreeUnit: "Hospital Central",     honoreeAvatar: "1516549655169-df83a0d514ea", message: "A preparação impecável das suítes VIP para a inspeção da ONA foi decisiva para a certificação. Detalhes que fazem toda a diferença na avaliação.", fromName: "Dra. Marcia Lins",   fromRole: "Diretora Assistencial",        fromAvatar: "1494790108377-be9c29b29330", time: "há 4 dias",  likes: 38 },
];

// ─── Documents data (fallback quando a API não está acessível) ───────────────
const MOCK_DOCUMENTS = [
  { id: 1,  title: "POP — Administração de Medicamentos via Sonda Nasogástrica",   category: "Enfermagem",    uploadDate: "15 ago 2026", version: "v3.2", size: "412 KB" },
  { id: 2,  title: "POP — Curativo Simples e Complexo em Feridas Crônicas",         category: "Enfermagem",    uploadDate: "10 ago 2026", version: "v2.1", size: "638 KB" },
  { id: 3,  title: "POP — Coleta de Hemoculturas: Técnica Asséptica",               category: "Enfermagem",    uploadDate: "05 ago 2026", version: "v4.0", size: "290 KB" },
  { id: 4,  title: "Procedimento — Abertura e Fechamento de Caixa ADM",              category: "Administrativo",uploadDate: "20 ago 2026", version: "v1.5", size: "185 KB" },
  { id: 5,  title: "Fluxo de Atendimento ao Paciente Particular — Recepção",        category: "Administrativo",uploadDate: "18 ago 2026", version: "v2.3", size: "340 KB" },
  { id: 6,  title: "POP — Dispensação de Medicamentos Controlados",                  category: "Farmácia",      uploadDate: "22 ago 2026", version: "v5.1", size: "520 KB" },
  { id: 7,  title: "Rastreabilidade de Lote — Farmácia Hospitalar",                  category: "Farmácia",      uploadDate: "14 ago 2026", version: "v2.0", size: "275 KB" },
  { id: 8,  title: "Manual de Acesso ao MV Soul — Prescrição Eletrônica",            category: "TI",            uploadDate: "25 ago 2026", version: "v1.0", size: "1.2 MB" },
  { id: 9,  title: "Política de Segurança da Informação e Uso de Senhas",            category: "TI",            uploadDate: "01 ago 2026", version: "v3.0", size: "210 KB" },
  { id: 10, title: "Protocolo de Auditoria Interna — Gestão da Qualidade ONA",       category: "Qualidade",     uploadDate: "28 ago 2026", version: "v2.4", size: "780 KB" },
  { id: 11, title: "Checklist de Rondas de Higiene e Limpeza Terminal — UTI",        category: "Hotelaria",     uploadDate: "12 ago 2026", version: "v1.8", size: "156 KB" },
  { id: 12, title: "POP — Controle de Temperatura de Geladeiras Farmácia",           category: "Farmácia",      uploadDate: "08 ago 2026", version: "v2.2", size: "198 KB" },
];

const MOCK_DOC_CATEGORIES: DocCategory[] = ["Enfermagem", "Administrativo", "Farmácia", "TI", "Qualidade", "Hotelaria"];

// ─── Dashboard data (fallback quando a API não está acessível) ───────────────
const MOCK_BIRTHDAYS = [
  { name: "Dr. Carlos Mendes",      role: "Cardiologista · UTI Adulto", avatar: "1472099645785-5658abf4ff4e", today: true },
  { name: "Enfª Patrícia Lima",     role: "Coordenadora · CC",          avatar: "1494790108377-be9c29b29330", today: true },
  { name: "Rafael Augusto Santos",  role: "Analista TI · Sistemas",     avatar: "1500648767791-00dcc994a43e", today: false },
];

const ALERTS = [
  { id: 1, type: "urgent", text: "AVISO URGENTE: Manutenção programada dos elevadores do Bloco A — 29/ago das 22h às 06h. Use escadas ou Bloco B." },
  { id: 2, type: "info",   text: "NOVO: Módulo de Agendamento Online disponível no portal para colaboradores a partir de hoje." },
];

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { id: "rh",     label: "Portal RH",          icon: "users"    },
  { id: "escala", label: "Escala de Plantão",   icon: "calendar" },
  { id: "ti",     label: "Requisição TI",       icon: "settings" },
  { id: "docs",   label: "Documentos (POPs)",   icon: "folder"   },
  { id: "faq",    label: "FAQ / Central de Ajuda", icon: "chat"  },
];

// ─── API → UI mappers ─────────────────────────────────────────────────────────
// Convertem as respostas do back-end (FastAPI) para o formato que as views
// abaixo já esperavam a partir dos dados mock, sem alterar o layout.
type NewsItem = (typeof MOCK_NEWS)[number];
type DocItem = (typeof MOCK_DOCUMENTS)[number] & { url?: string };
type BirthdayItem = (typeof MOCK_BIRTHDAYS)[number];

const NEWS_IMAGE_POOL = [
  "1576091160550-2173dba999ef", "1582750433449-648ed127bb54", "1519494026892-4ade0b5c4da2",
  "1504439468489-c8920d58c4b4", "1600880292203-757bb62b4baf", "1573496359142-b8d87734a5a2",
  "1516549655169-df83a0d514ea", "1450101499163-c8848c66ca85",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function avisoToNewsItem(a: api.AvisoOut, index: number): NewsItem {
  const words = a.conteudo.trim().split(/\s+/).filter(Boolean).length;
  return {
    id: a.id_aviso,
    title: a.titulo,
    excerpt: a.conteudo.length > 160 ? `${a.conteudo.slice(0, 157)}…` : a.conteudo,
    author: "Comunicação Institucional",
    date: formatDate(a.data_publicacao),
    readTime: `${Math.max(1, Math.round(words / 200))} min`,
    image: NEWS_IMAGE_POOL[index % NEWS_IMAGE_POOL.length],
    category: a.categoria ?? "Comunicado",
    views: 0,
    likes: 0,
  };
}

function documentoToDocItem(d: api.DocumentoOut): DocItem {
  return {
    id: d.id_doc,
    title: d.titulo,
    category: d.categoria ?? "Geral",
    uploadDate: formatDate(d.data_upload),
    version: "—",
    size: "—",
    url: d.url_arquivo,
  };
}

function aniversarianteToBirthday(u: api.AniversarianteOut): BirthdayItem {
  const hoje = new Date();
  const nascimento = u.data_nascimento ? new Date(`${u.data_nascimento}T12:00:00`) : null;
  return {
    name: u.nome,
    role: u.cargo ?? u.setor?.nome ?? "",
    avatar: "1472099645785-5658abf4ff4e",
    today: nascimento !== null && nascimento.getDate() === hoje.getDate() && nascimento.getMonth() === hoje.getMonth(),
  };
}

function groupFaqByCategoria(items: api.FaqOut[]): Record<string, { q: string; a: string }[]> {
  const grouped: Record<string, { q: string; a: string }[]> = {};
  for (const item of items) {
    const categoria = item.categoria ?? "Geral";
    (grouped[categoria] ??= []).push({ q: item.pergunta, a: item.resposta });
  }
  return grouped;
}

// ─── Color maps ───────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, [string, string]> = {
  Institucional:  ["#e0e7ff", "#4338ca"],
  Saúde:          ["#dcfce7", "#15803d"],
  Protocolo:      ["#fee2e2", "#dc2626"],
  TI:             ["#dbeafe", "#1d4ed8"],
  Desenvolvimento:["#fef9c3", "#a16207"],
  Benefícios:     ["#fce7f3", "#9d174d"],
  Enfermagem:     ["#fce7f3", "#9d174d"],
  Administrativo: ["#e0f2fe", "#0369a1"],
  "Farmácia":     ["#f3e8ff", "#7e22ce"],
  Qualidade:      ["#fef3c7", "#b45309"],
  Hotelaria:      ["#d1fae5", "#065f46"],
};

const EVENT_TYPE_STYLE: Record<EventType, { bg: string; text: string; border: string; label: string }> = {
  campanha:     { bg: "#dcfce7", text: "#15803d", border: "#86efac", label: "Campanha"     },
  treinamento:  { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd", label: "Treinamento"  },
  institucional:{ bg: "#e0e7ff", text: "#4338ca", border: "#a5b4fc", label: "Institucional"},
  social:       { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4", label: "Social"       },
  saude:        { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", label: "Saúde"        },
};

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAY_SHORT   = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Avatar({ id, size = 32, ring = false }: { id: string; size?: number; ring?: boolean }) {
  return (
    <img
      src={`https://images.unsplash.com/photo-${id}?w=${size * 2}&h=${size * 2}&fit=crop&crop=face&auto=format`}
      alt="foto"
      style={{ width: size, height: size, minWidth: size }}
      className={`rounded-full object-cover ${ring ? "ring-2 ring-white" : ""}`}
    />
  );
}

// ─── Admin flag & helper ─────────────────────────────────────────────────────
const IS_ADMIN = true; // Simula o usuário logado como Administrador

function AdminAddButton({ label = "+ Adicionar Novo", onClick }: { label?: string; onClick?: () => void }) {
  if (!IS_ADMIN) return null;
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:shadow-md"
      style={{ backgroundColor: "#800020" }}>
      <Icon path={ICONS.plus} size={14} />
      {label}
    </button>
  );
}

function CategoryPill({ label }: { label: string }) {
  const [bg, text] = CATEGORY_COLORS[label] ?? ["#f1f5f9", "#64748b"];
  return (
    <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color: text }}>
      {label}
    </span>
  );
}

function EventTypeBadge({ type }: { type: EventType }) {
  const s = EVENT_TYPE_STYLE[type];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>
      {s.label}
    </span>
  );
}

// ─── EVENTS VIEW ──────────────────────────────────────────────────────────────
const HOUR_START  = 7;
const HOUR_END    = 22;
const HOUR_H      = 60; // px per hour

function pad(n: number) { return String(n).padStart(2, "0"); }
function timeLabel(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }

function assignCols(events: EventFull[]): Array<EventFull & { col: number; totalCols: number }> {
  if (!events.length) return [];
  const sorted = [...events].sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin));
  const cols: number[] = []; // last end-minute of each column
  const withCol = sorted.map(ev => {
    const start = ev.startHour * 60 + ev.startMin;
    const end   = ev.endHour   * 60 + ev.endMin;
    let col = cols.findIndex(lastEnd => lastEnd <= start);
    if (col === -1) { col = cols.length; cols.push(end); }
    else cols[col] = end;
    return { ...ev, col };
  });
  const totalCols = cols.length;
  return withCol.map(ev => ({ ...ev, totalCols }));
}

function EventsView() {
  const [calMonth,    setCalMonth]    = useState(8);   // 0-indexed, 8 = Sep
  const [calYear]                     = useState(2026);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"todos" | "aniversariantes" | "eventos">("todos");

  // Calendar geometry
  const firstDow  = new Date(calYear, calMonth, 1).getDay();       // 0=Sun
  const offset    = (firstDow + 6) % 7;                             // Mon-based offset
  const daysInMon = new Date(calYear, calMonth + 1, 0).getDate();

  // Event sets for current month
  const eventsThisMonth = EVENTS_FULL.filter(e => { const d = new Date(e.date + "T12:00:00"); return d.getMonth() === calMonth && d.getFullYear() === calYear; });
  const eventCountByDay = eventsThisMonth.reduce((acc, e) => {
    const day = new Date(e.date + "T12:00:00").getDate();
    acc.set(day, (acc.get(day) || 0) + 1);
    return acc;
  }, new Map<number, number>());

  // Simple birthday mapping for demo (map sample birthdays to days)
  const BIRTHDAY_BY_DAY = new Map<number, Array<{ name: string; role?: string }>>();
  // map sample MOCK_BIRTHDAYS to demo days (today and a couple others)
  (MOCK_BIRTHDAYS || []).forEach((b, i) => {
    const day = b.today ? 4 : (i === 1 ? 5 : 10);
    const arr = BIRTHDAY_BY_DAY.get(day) || [];
    arr.push({ name: b.name, role: b.role });
    BIRTHDAY_BY_DAY.set(day, arr);
  });

  const selectedDayNum = selectedDate ? new Date(selectedDate + "T12:00:00").getDate() : null;
  const dayEvents = selectedDate
    ? EVENTS_FULL.filter(e => e.date === selectedDate).sort((a, b) => (a.startHour * 60 + a.startMin) - (b.startHour * 60 + b.startMin))
    : [];
  const dayBirthdays = selectedDayNum ? (BIRTHDAY_BY_DAY.get(selectedDayNum) || []) : [];

  const evWithCols = assignCols(dayEvents);
  const totalH     = (HOUR_END - HOUR_START) * HOUR_H;
  const LABEL_W    = 48; // px

  function eventTop(ev: EventFull)    { return (ev.startHour + ev.startMin / 60 - HOUR_START) * HOUR_H; }
  function eventHeight(ev: EventFull) { return Math.max((ev.endHour + ev.endMin / 60 - ev.startHour - ev.startMin / 60) * HOUR_H - 4, 28); }

  const fmtSelectedDate = () => {
    if (!selectedDate) return "";
    const d = new Date(selectedDate + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const prevMonth = () => setCalMonth(m => { setSelectedDate(null); return m === 0 ? 11 : m - 1; });
  const nextMonth = () => setCalMonth(m => { setSelectedDate(null); return m === 11 ? 0 : m + 1; });

  return (
    <div className="p-6 space-y-5" style={{ fontFamily: "var(--font-family-sans)" }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#334155" }}>Agenda de Eventos</h1>
          <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Calendário de eventos, treinamentos e compromissos institucionais da rede Decós</p>
        </div>
        <div>
          <AdminAddButton onClick={() => (window as any).__openAddModal?.('evento')} />
        </div>
      </div>

      {/* ── CALENDAR ── */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "#e2e8f0" }}>
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold uppercase tracking-wider" style={{ color: "#334155" }}>
            {MONTH_NAMES[calMonth]} {calYear}
          </h2>
          <div className="flex gap-1">
            {[prevMonth, nextMonth].map((fn, i) => (
              <button key={i} onClick={fn}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors hover:bg-gray-100"
                style={{ color: "#94a3b8" }}>
                {i === 0 ? "‹" : "›"}
              </button>
            ))}
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-3">
          {([['todos','Todos'], ['aniversariantes','Aniversariantes'], ['eventos','Eventos']] as Array<[any,string]>).map(([key,label]) => (
            <button key={key} onClick={() => setFilterMode(key)}
              className="px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ backgroundColor: filterMode === key ? '#800020' : '#f1f5f9', color: filterMode === key ? '#fff' : '#64748b', border: `1px solid ${filterMode === key ? '#800020' : '#e2e8f0'}` }}>
              {label}
            </button>
          ))}
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_SHORT.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-wider py-1" style={{ color: "#94a3b8" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array(offset).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: daysInMon }, (_, i) => i + 1).map(day => {
            const dateStr  = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selectedDate === dateStr;
            const isToday    = dateStr === "2026-09-04";
            const eventCount = eventCountByDay.get(day) || 0;
            const birthdays = BIRTHDAY_BY_DAY.get(day) || [];

            // apply filter mode
            const showEvents = filterMode === 'todos' || filterMode === 'eventos';
            const showBirthdays = filterMode === 'todos' || filterMode === 'aniversariantes';

            const visibleEventCount = showEvents ? eventCount : 0;
            const visibleBirthdayCount = showBirthdays ? birthdays.length : 0;
            const totalVisible = visibleEventCount + visibleBirthdayCount;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(prev => prev === dateStr ? null : dateStr)}
                className="flex flex-col items-center py-1.5 rounded-xl transition-all hover:bg-gray-50 group"
                style={{ backgroundColor: isSelected ? "#800020" : undefined }}
              >
                <span
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold transition-colors"
                  style={{
                    color: isSelected ? "#ffffff" : isToday ? "#800020" : "#334155",
                    fontWeight: isToday || isSelected ? 700 : 400,
                    boxShadow: isToday && !isSelected ? "0 0 0 2px #800020" : undefined,
                  }}
                >
                  {day}
                </span>

                {/* single event preview */}
                {totalVisible === 1 && visibleEventCount === 1 && (
                  (() => {
                    const ev = eventsThisMonth.find(e => new Date(e.date + "T12:00:00").getDate() === day);
                    return ev ? (
                      <div className="mt-2 px-2 py-1 rounded-lg text-[11px] text-left w-full truncate" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.08)" : "#fff", color: "#334155", border: "1px solid #f1f5f9" }}>
                        <div className="font-semibold truncate" style={{ color: "#334155" }}>{ev.title}</div>
                      </div>
                    ) : null;
                  })()
                )}

                {/* single birthday preview */}
                {totalVisible === 1 && visibleBirthdayCount === 1 && (
                  <div className="mt-2 px-2 py-1 rounded-lg text-[12px] w-full text-center" style={{ backgroundColor: "#fff5f5", color: "#800020", border: "1px solid #fdecea" }}>
                    🎂 {birthdays[0]?.name.split(' ')[0]}
                  </div>
                )}

                {/* multiple indicator */}
                {totalVisible > 1 && (
                  <div className="mt-2 px-2 py-1 rounded-full text-[11px] font-semibold" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.12)" : "#800020", color: "#fff" }}>
                    +{totalVisible}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4" style={{ borderTop: "1px solid #f1f5f9" }}>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2" style={{ borderColor: "#800020" }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>Hoje</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#800020" }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>Com eventos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-lg" style={{ backgroundColor: "#800020" }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>Selecionado</span>
          </div>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      {selectedDate ? (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
          {/* Timeline header */}
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <div>
              <h3 className="font-bold text-base capitalize" style={{ color: "#334155" }}>{fmtSelectedDate()}</h3>
              <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                { (dayEvents.length + dayBirthdays.length) === 0 ? "Nenhum evento agendado para este dia" : `${dayEvents.length + dayBirthdays.length} item${dayEvents.length + dayBirthdays.length > 1 ? "s" : ""} agendado${dayEvents.length + dayBirthdays.length > 1 ? "s" : ""}` }
              </p>
            </div>
            <div className="flex gap-2">
              {Array.from(new Set(dayEvents.map(e => e.type))).map(t => (
                <EventTypeBadge key={t} type={t as EventType} />
              ))}
            </div>
          </div>
   

   
          {(dayEvents.length + dayBirthdays.length) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
                <Icon path={ICONS.calendar} size={24} style={{ color: "#cbd5e1" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Nenhum evento para este dia</p>
              <p className="text-xs" style={{ color: "#cbd5e1" }}>Selecione outra data no calendário</p>
            </div>
          ) : (
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 560 }}>
              {/* show birthdays first */}
              {dayBirthdays.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold" style={{ color: "#334155" }}>Aniversariantes</h4>
                  <div className="mt-2 space-y-2">
                    {dayBirthdays.map((b, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border" style={{ borderColor: "#f1f5f9" }}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold" style={{ color: "#334155" }}>{b.name}</div>
                            <div className="text-xs" style={{ color: "#94a3b8" }}>{b.role}</div>
                          </div>
                          <div className="text-sm text-white px-3 py-1 rounded-full" style={{ backgroundColor: "#800020" }}>🎂 Hoje</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative" style={{ height: totalH, marginLeft: LABEL_W }}>

                {/* Hour grid lines + labels */}
                {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => i + HOUR_START).map(hour => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 flex items-center gap-3"
                    style={{ top: (hour - HOUR_START) * HOUR_H - 9, marginLeft: -LABEL_W }}
                  >
                    <span className="text-[11px] font-mono font-semibold w-10 text-right flex-shrink-0" style={{ color: "#cbd5e1" }}>
                      {pad(hour)}h
                    </span>
                    <div className="flex-1 border-t" style={{ borderColor: "#f1f5f9" }} />
                  </div>
                ))}

                {/* Events */}
                {evWithCols.map(ev => {
                  const top    = eventTop(ev);
                  const height = eventHeight(ev);
                  const w      = `calc(${100 / ev.totalCols}% - ${ev.totalCols > 1 ? 6 : 0}px)`;
                  const left   = `calc(${(ev.col / ev.totalCols) * 100}% + ${ev.col > 0 ? 4 : 0}px)`;
                  const s      = EVENT_TYPE_STYLE[ev.type];

                  return (
                    <div
                      key={ev.id}
                      className="absolute rounded-xl px-3 py-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]"
                      style={{
                        top,
                        height,
                        left,
                        width: w,
                        backgroundColor: s.bg,
                        borderLeft: `3px solid ${s.text}`,
                        border: `1px solid ${s.border}`,
                        borderLeftWidth: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Icon path={ICONS.clock} size={11} style={{ color: s.text, flexShrink: 0 }} />
                            <span className="text-[10px] font-bold" style={{ color: s.text }}>
                              {timeLabel(ev.startHour, ev.startMin)} – {timeLabel(ev.endHour, ev.endMin)}
                            </span>
                          </div>
                          <div className="text-xs font-semibold leading-tight truncate" style={{ color: "#334155" }}>{ev.title}</div>
                          {height > 56 && (
                            <div className="text-[11px] mt-1 leading-tight line-clamp-2" style={{ color: "#64748b" }}>{ev.description}</div>
                          )}
                          {height > 80 && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Icon path={ICONS.mapPin} size={10} style={{ color: "#94a3b8" }} />
                              <span className="text-[10px] truncate" style={{ color: "#94a3b8" }}>{ev.location}</span>
                            </div>
                          )}
                        </div>
                        <EventTypeBadge type={ev.type} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed flex items-center justify-center py-12 gap-3" style={{ borderColor: "#e2e8f0" }}>
          <Icon path={ICONS.calendar} size={20} style={{ color: "#cbd5e1" }} />
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Selecione um dia no calendário para ver a linha do tempo</p>
        </div>
      )}
    </div>
  );
}

// ─── NEWS VIEW ────────────────────────────────────────────────────────────────
function NewsView() {
  const data = useData();
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const news: NewsItem[] = data.apiOnline && !data.loading ? data.avisos.map(avisoToNewsItem) : MOCK_NEWS;
  const featured = news[0];

  const toggleLike = (id: number) =>
    setLikedPosts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filtered = news.filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#334155" }}>Notícias e Comunicados</h1>
          <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Informações institucionais, protocolos e atualizações da rede Decós</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
          <Icon path={ICONS.search} size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar notícias..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none placeholder:text-[#94a3b8]"
            style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#334155" }} />
        </div>
          <AdminAddButton onClick={() => (window as any).__openAddModal?.('noticia')} />
        </div>
      </div>

      {/* Featured */}
      {featured ? (<div className="relative rounded-2xl overflow-hidden h-56 group cursor-pointer">
        <img src={`https://images.unsplash.com/photo-${featured.image}?w=1200&h=450&fit=crop&auto=format`}
          alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute top-4 left-4">
          <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#800020" }}>★ Destaque</span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CategoryPill label={featured.category} />
            <span className="text-white/60 text-xs">{featured.date} · {featured.readTime} de leitura</span>
          </div>
          <h2 className="text-white font-bold text-lg leading-snug">{featured.title}</h2>
        </div>
      </div>) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum comunicado publicado ainda.</p>}

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.slice(1).map(news => (
          <article key={news.id}
            className="bg-white rounded-xl border overflow-hidden flex flex-col group cursor-pointer hover:shadow-md transition-all"
            style={{ borderColor: "#e2e8f0" }}>
            <div className="h-40 overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={`https://images.unsplash.com/photo-${news.image}?w=500&h=280&fit=crop&auto=format`}
                alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CategoryPill label={news.category} />
                <span className="text-[11px]" style={{ color: "#94a3b8" }}>{news.readTime}</span>
              </div>
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1 transition-colors group-hover:text-[#800020]" style={{ color: "#334155" }}>
                {news.title}
              </h3>
              <p className="text-xs mt-2 line-clamp-2" style={{ color: "#94a3b8" }}>{news.excerpt}</p>
              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                <span className="text-xs font-medium flex-1 truncate" style={{ color: "#94a3b8" }}>{news.date}</span>
                <button className="flex items-center gap-1 text-xs transition-colors" style={{ color: "#94a3b8" }}>
                  <Icon path={ICONS.eye} size={12} />{news.views}
                </button>
                <button onClick={e => { e.stopPropagation(); toggleLike(news.id); }}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: likedPosts.has(news.id) ? "#800020" : "#94a3b8" }}>
                  <Icon path={ICONS.heart} size={12} />{news.likes + (likedPosts.has(news.id) ? 1 : 0)}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border flex flex-col items-center justify-center py-16" style={{ borderColor: "#e2e8f0" }}>
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Nenhuma notícia encontrada para "{search}"</p>
        </div>
      )}
    </div>
  );
}

// ─── RECOGNITIONS VIEW ────────────────────────────────────────────────────────
function RecognitionsView() {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const toggleLike = (id: number) =>
    setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#334155" }}>Mural de Reconhecimentos</h1>
          <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Valorize quem faz a diferença — celebre pessoas e equipes da rede Decós</p>
        </div>
        <AdminAddButton label="+ Adicionar Novo" onClick={() => (window as any).__openAddModal?.('noticia')} />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Reconhecimentos este mês", value: "38", sub: "+12% vs. mês anterior" },
          { label: "Colaboradores homenageados", value: "24", sub: "de 8 setores diferentes" },
          { label: "Curtidas acumuladas",        value: "268", sub: "em todo o mural" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border p-4" style={{ borderColor: "#e2e8f0" }}>
            <div className="text-2xl font-black" style={{ color: "#800020" }}>{s.value}</div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: "#334155" }}>{s.label}</div>
            <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-3 gap-4">
        {ALL_RECOGNITIONS.map(rec => (
          <div key={rec.id} className="bg-white rounded-xl border flex flex-col hover:shadow-md transition-all" style={{ borderColor: "#e2e8f0" }}>
            {/* Top band */}
            <div className="h-2 rounded-t-xl" style={{ backgroundColor: "#800020" }} />

            <div className="p-5 flex flex-col flex-1 gap-3">
              {/* Honoree */}
              <div className="flex items-center gap-3">
                <Avatar id={rec.honoreeAvatar} size={44} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: "#334155" }}>{rec.honoree}</div>
                  <div className="text-xs" style={{ color: "#94a3b8" }}>{rec.honoreeRole} · {rec.honoreeUnit}</div>
                </div>
                <span className="text-lg">🏅</span>
              </div>

              {/* Message */}
              <div className="flex-1 relative pl-3" style={{ borderLeft: "2px solid #b33951" }}>
                <Icon path={ICONS.quote} size={14} className="absolute -top-1 -left-1 opacity-20" style={{ color: "#800020" }} />
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "#64748b" }}>{rec.message}</p>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
                <Avatar id={rec.fromAvatar} size={24} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: "#334155" }}>{rec.fromName}</span>
                  <span className="text-xs ml-1" style={{ color: "#94a3b8" }}>· {rec.fromRole}</span>
                </div>
                <span className="text-[10px] mr-2" style={{ color: "#94a3b8" }}>{rec.time}</span>
                <button
                  onClick={() => toggleLike(rec.id)}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: liked.has(rec.id) ? "#800020" : "#94a3b8" }}>
                  <Icon path={ICONS.heart} size={13} />
                  {rec.likes + (liked.has(rec.id) ? 1 : 0)}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DOCUMENTS VIEW ───────────────────────────────────────────────────────────
function DocumentsView() {
  const data = useData();
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState<DocCategory | "Todos">("Todos");

  const documents: DocItem[] = data.apiOnline && !data.loading ? data.documentos.map(documentoToDocItem) : MOCK_DOCUMENTS;
  const docCategories: DocCategory[] =
    data.apiOnline && !data.loading
      ? Array.from(new Set(documents.map(d => d.category)))
      : MOCK_DOC_CATEGORIES;

  const filtered = documents.filter(d => {
    const matchCat    = activeFilter === "Todos" || d.category === activeFilter;
    const q           = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "#334155" }}>Documentos e POPs</h1>
        <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Procedimentos Operacionais Padrão e documentos regulatórios da instituição</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-xl">
        <Icon path={ICONS.search} size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar Procedimentos Operacionais Padrão (POPs) ou palavras-chave..."
          className="w-full pl-12 pr-5 py-3.5 text-sm bg-white border rounded-xl focus:outline-none transition-all placeholder:text-[#94a3b8]"
          style={{ borderColor: "#e2e8f0", color: "#334155" }} />
        </div>
        <div className="pl-4">
          <AdminAddButton onClick={() => (window as any).__openAddModal?.('noticia')} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["Todos", ...docCategories].map(cat => {
          const active = activeFilter === cat;
          return (
            <button key={cat} onClick={() => setActiveFilter(cat as DocCategory | "Todos")}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{ backgroundColor: active ? "#800020" : "#f1f5f9", color: active ? "#ffffff" : "#64748b", border: `1px solid ${active ? "#800020" : "#e2e8f0"}` }}>
              {cat}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e2e8f0" }}>
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b text-xs font-semibold uppercase tracking-wider" style={{ borderColor: "#e2e8f0", backgroundColor: "#f8fafc", color: "#94a3b8" }}>
          <div /><div>Título</div><div className="text-center">Categoria</div><div className="text-right">Upload</div><div className="text-center">Ação</div>
        </div>
        {filtered.map((doc, i) => (
          <div key={doc.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3.5 items-center transition-colors hover:bg-[#fdf8f9] group"
            style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff5f5" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="#fecaca" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M14 2v6h6" stroke="#ef4444" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <text x="5.5" y="17" fontSize="5" fontWeight="800" fill="#ef4444" fontFamily="Inter,sans-serif">PDF</text>
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold truncate transition-colors group-hover:text-[#800020]" style={{ color: "#334155" }}>{doc.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Versão {doc.version} · {doc.size}</div>
            </div>
            <div className="flex justify-center"><CategoryPill label={doc.category} /></div>
            <div className="text-sm text-right" style={{ color: "#94a3b8" }}>{doc.uploadDate}</div>
            <div className="flex justify-center">
              <a href={doc.url ?? "#"} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ color: "#800020", backgroundColor: "#fff5f5", border: "1px solid #fecaca" }}
                onMouseEnter={e => { const el = e.currentTarget; el.style.backgroundColor = "#800020"; el.style.color = "#fff"; el.style.borderColor = "#800020"; }}
                onMouseLeave={e => { const el = e.currentTarget; el.style.backgroundColor = "#fff5f5"; el.style.color = "#800020"; el.style.borderColor = "#fecaca"; }}>
                <Icon path={ICONS.download} size={13} />Baixar
              </a>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-14 gap-2">
            <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>Nenhum documento encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DIRECTORY / RAMAIS VIEW ─────────────────────────────────────────────────
const MOCK_HOSPITAL_SECTORS = ["UTI", "Pronto-Socorro", "Centro Cirúrgico", "Pediatria", "Farmácia", "Recepção", "Administração"];
const MOCK_CONTACTS = [
  { id: 1, name: "Dr. Carlos Mendes", role: "Cardiologista", sector: "UTI", phone: "(16) 3333-1010", ext: "2101" },
  { id: 2, name: "Enfª Patrícia Lima", role: "Coordenadora", sector: "Centro Cirúrgico", phone: "(16) 3333-1020", ext: "2202" },
  { id: 3, name: "Rafael Augusto", role: "Analista TI", sector: "Administração", phone: "(16) 3333-1030", ext: "2303" },
  { id: 4, name: "Dra. Luciana Barros", role: "Pediatria", sector: "Pediatria", phone: "(16) 3333-1040", ext: "2404" },
];

function DirectoryView() {
  const data = useData();
  const [q, setQ] = useState("");
  const [sector, setSector] = useState<string | "Todos">("Todos");

  const useApi = data.apiOnline && !data.loading;
  const sectors = useApi ? data.setores.map(s => s.nome) : MOCK_HOSPITAL_SECTORS;
  const contacts = useApi
    ? data.contatos.map(c => ({
        id: c.id_usuario,
        name: c.nome,
        role: c.cargo ?? "",
        sector: c.setor?.nome ?? "—",
        phone: c.setor?.ramal ? `Ramal ${c.setor.ramal}` : "—",
        ext: c.setor?.ramal ?? "—",
      }))
    : MOCK_CONTACTS;

  const filtered = contacts.filter(c => {
    const matchQ = !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.role.toLowerCase().includes(q.toLowerCase());
    const matchSector = sector === "Todos" || c.sector === sector;
    return matchQ && matchSector;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#334155" }}>Diretório e Ramais</h1>
          <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Lista de colaboradores, setores e ramais internos</p>
        </div>
        <div>
          <AdminAddButton onClick={() => (window as any).__openAddModal?.('noticia')} />
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative w-96">
          <Icon path={ICONS.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nome, cargo ou setor"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg" style={{ backgroundColor: "#f1f5f9", border: "1px solid #e2e8f0", color: "#334155" }} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSector("Todos")} className="px-3 py-1.5 rounded-full" style={{ backgroundColor: sector === "Todos" ? "#800020" : "#f1f5f9", color: sector === "Todos" ? "#fff" : "#64748b" }}>Todos</button>
          {sectors.map(s => (
            <button key={s} onClick={() => setSector(s)} className="px-3 py-1.5 rounded-full"
              style={{ backgroundColor: sector === s ? "#800020" : "#f8fafc", color: sector === s ? "#fff" : "#64748b", border: `1px solid ${sector === s ? "#800020" : "#e2e8f0"}` }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border p-3 flex items-center justify-between" style={{ borderColor: "#e2e8f0" }}>
            <div className="flex items-center gap-3">
              <Avatar id={"1472099645785-5658abf4ff4e"} size={48} />
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate" style={{ color: "#334155" }}>{c.name}</div>
                <div className="text-xs" style={{ color: "#94a3b8" }}>{c.role} · {c.sector}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold" style={{ color: "#334155" }}>{c.phone}</div>
              <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Ramal: {c.ext}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: "#e2e8f0" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>Nenhum colaborador encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FAQ VIEW ────────────────────────────────────────────────────────────────
const MOCK_FAQ_DATA: Record<string, { q: string; a: string }[]> = {
  Geral: [
    { q: "Como solicitar férias?", a: "NÃO TEM FERIAS " },
    { q: "Como acessar o sistema MV?", a: "Use usuário institucional e autenticação em dois fatores." },
  ],
  "Diretório e Ramais": [
    { q: "Como cadastrar um novo ramal?", a: "Apenas administradores podem cadastrar ramais via painel de telefones." },
  ],
  TI: [
    { q: "Quem contatar em caso de queda de sistema?", a: "Tem que abrir um chamado." },
  ],
};

function FAQView() {
  const data = useData();
  const [open, setOpen] = useState<Record<string, number | null>>({});
  const faqData = data.apiOnline && !data.loading ? groupFaqByCategoria(data.faq) : MOCK_FAQ_DATA;
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#334155" }}>FAQ — Central de Ajuda</h1>
          <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>Perguntas frequentes organizadas por categoria</p>
        </div>
        <div>
          <AdminAddButton onClick={() => (window as any).__openAddModal?.('noticia')} />
        </div>
      </div>

      <div className="grid gap-4">
        {Object.entries(faqData).map(([cat, list]) => (
          <div key={cat} className="bg-white rounded-xl border p-4" style={{ borderColor: "#e2e8f0" }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold" style={{ color: "#334155" }}>{cat}</h3>
              <span className="text-xs" style={{ color: "#94a3b8" }}>{list.length} perguntas</span>
            </div>
            <div className="mt-3 space-y-2">
              {list.map((it, i) => (
                <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#f1f5f9" }}>
                  <button className="w-full text-left flex items-center justify-between" onClick={() => setOpen(prev => ({ ...prev, [cat]: prev[cat] === i ? null : i }))}>
                    <div>
                      <div className="font-medium" style={{ color: "#334155" }}>{it.q}</div>
                      {open[cat] === i && <div className="text-sm mt-1" style={{ color: "#64748b" }}>{it.a}</div>}
                    </div>
                    <Icon path={ICONS.chevronRight} size={16} style={{ transform: open[cat] === i ? "rotate(90deg)" : undefined, color: "#94a3b8" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MINI CALENDAR (dashboard widget) ────────────────────────────────────────
const EVT_DAYS_DASH = new Set([5, 10, 15, 22, 25]);
const TODAY_DAY     = 4;

function MiniCalendar() {
  const [month, setMonth] = useState(8);
  const [year]            = useState(2026);

  const firstDay   = new Date(year, month, 1).getDay();
  const offset     = (firstDay + 6) % 7;
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const isThisMonth = month === 8 && year === 2026;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid #f1f5f9" }}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth(m => m === 0 ? 11 : m - 1)}
          className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold hover:bg-gray-100 transition-colors" style={{ color: "#94a3b8" }}>‹</button>
        <span className="text-xs font-semibold" style={{ color: "#334155" }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setMonth(m => m === 11 ? 0 : m + 1)}
          className="w-6 h-6 flex items-center justify-center rounded text-xs font-bold hover:bg-gray-100 transition-colors" style={{ color: "#94a3b8" }}>›</button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>{d[0]}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array(offset).fill(null).map((_, i) => <div key={`p${i}`} />)}
        {Array.from({ length: daysInMon }, (_, i) => i + 1).map(day => {
          const isToday    = isThisMonth && day === TODAY_DAY;
          const hasEvent   = isThisMonth && EVT_DAYS_DASH.has(day);
          return (
            <div key={day} className="flex flex-col items-center py-0.5">
              <div className="w-6 h-6 flex items-center justify-center rounded-full text-[11px]"
                style={{ backgroundColor: isToday ? "#800020" : "transparent", color: isToday ? "#fff" : "#334155", fontWeight: isToday || hasEvent ? 700 : 400 }}>
                {day}
              </div>
              {hasEvent && !isToday && (
                <span className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: "#800020" }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: "1px solid #f1f5f9" }}>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#800020" }} />
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>Hoje</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#800020" }} />
          <span className="text-[10px]" style={{ color: "#94a3b8" }}>Evento</span>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
  const data = useData();
  const { signOut } = useAuth();
  const useApi = data.apiOnline && !data.loading;

  const [activeNav,    setActiveNav]    = useState<NavKey>("home");
  const [activeAlert,  setActiveAlert]  = useState(0);
  const [likedPosts,   setLikedPosts]   = useState<Set<number>>(new Set());
  const [activeTab,    setActiveTab]    = useState<"noticias" | "reconhecimentos">("noticias");
  const [notifOpen,    setNotifOpen]    = useState(false);
  const [searchFocused,setSearchFocused]= useState(false);
  const quickAccessDialog = useRef<HTMLDialogElement>(null);
  const [quickAccessNotice, setQuickAccessNotice] = useState("");

  function openQuickAccess() {
    setQuickAccessNotice("");
    quickAccessDialog.current?.showModal();
  }

  function selectQuickLink(link: QuickLink) {
    if (link.id === "docs" || link.id === "faq") {
      quickAccessDialog.current?.close();
      setActiveNav(link.id === "docs" ? "documentos" : "faq");
      return;
    }
    setQuickAccessNotice(`${link.label}: o acesso estará disponível assim que o endereço do serviço for informado.`);
  }

  // Add-new modal state (admin)
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'noticia' | 'evento' | 'aniversariante'>('noticia');
  const [modalForm, setModalForm] = useState({ title: '', name: '', date: '', description: '', category: 'Institucional', role: '' });
  const [refreshKey, setRefreshKey] = useState(0);

  function setModalField<K extends keyof typeof modalForm>(field: K, value: string) {
    setModalForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleCreateFromModal() {
    try {
      if (addType === 'evento') {
        const newId = (EVENTS_FULL.length ? Math.max(...EVENTS_FULL.map(e => e.id)) : 0) + 1;
        EVENTS_FULL.push({ id: newId, date: modalForm.date || new Date().toISOString().slice(0, 10), title: modalForm.title || modalForm.name || 'Novo Evento', type: 'institucional', startHour: 9, startMin: 0, endHour: 10, endMin: 0, location: '', description: modalForm.description || '' } as any);
      } else if (addType === 'noticia') {
        if (useApi && data.token) {
          // Cria o aviso de verdade via API e recarrega a lista do back-end.
          await api.createAviso(
            {
              titulo: modalForm.title || modalForm.name || 'Nova Notícia',
              conteudo: modalForm.description || modalForm.title || 'Sem conteúdo informado.',
              categoria: modalForm.category || 'Comunicado',
            },
            data.token,
          );
          await data.refetchAvisos();
        } else {
          const newId = (MOCK_NEWS.length ? Math.max(...MOCK_NEWS.map(n => n.id)) : 0) + 1;
          MOCK_NEWS.unshift({ id: newId, title: modalForm.title || modalForm.name || 'Nova Notícia', excerpt: (modalForm.description || '').slice(0, 140), author: 'Admin', date: modalForm.date || '', readTime: '1 min', image: '', category: modalForm.category || 'Institucional', views: 0, likes: 0 } as any);
        }
      } else if (addType === 'aniversariante') {
        MOCK_BIRTHDAYS.push({ name: modalForm.name || modalForm.title || 'Novo Colaborador', role: modalForm.role || '', avatar: '', today: false });
      }
    } catch (err) {
      console.error("Falha ao criar registro:", err);
    } finally {
      setShowAddModal(false);
      setModalForm({ title: '', name: '', date: '', description: '', category: 'Institucional', role: '' });
      setRefreshKey(k => k + 1);
    }
  }

  // expose global opener so view-level AdminAddButton (defined above) can call it
  useEffect(() => {
    (window as any).__openAddModal = (type: 'noticia' | 'evento' | 'aniversariante') => { setAddType(type); setShowAddModal(true); };
    return () => { delete (window as any).__openAddModal; };
  }, []);

  const toggleLike = (id: number) =>
    setLikedPosts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // dashboard events for right panel (Sep only)
  const dashEvents = EVENTS_FULL.filter(e => e.date.startsWith("2026-09")).slice(0, 4);
  const newsList: NewsItem[] = useApi ? data.avisos.map(avisoToNewsItem) : MOCK_NEWS;
  const featured = newsList[0];
  const birthdays: BirthdayItem[] = useApi ? data.aniversariantes.map(aniversarianteToBirthday) : MOCK_BIRTHDAYS;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "var(--font-family-sans)", backgroundColor: "#f8fafc" }}>

      {/* ── HEADER ── */}
      <header className="h-14 bg-white flex items-center px-5 gap-4 z-30 flex-shrink-0" style={{ borderBottom: "1px solid #e2e8f0" }}>
        <div className="flex flex-col w-52 flex-shrink-0 justify-center">
          <img src={decoLogo} alt="Decós Hospital" className="h-8 w-auto object-contain object-left" />
          <div className="text-[10px] font-medium" style={{ color: "#94a3b8", marginTop: 1 }}>Intranet Corporativa</div>
        </div>

        <div className={`flex-1 max-w-xl relative transition-all ${searchFocused ? "max-w-2xl" : ""}`}>
          <Icon path={ICONS.search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar comunicados, documentos, eventos..."
            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none transition-all placeholder:text-[#94a3b8]"
            style={{ backgroundColor: "#f1f5f9", border: "1px solid transparent", color: "#334155" }} />
        </div>

        <div className="flex-1" />

        <div className="relative">
          <button onClick={() => setNotifOpen(v => !v)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" style={{ color: "#94a3b8" }}>
            <Icon path={ICONS.bell} size={20} />
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: "#ef4444" }}>5</span>
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-xl z-50 overflow-hidden" style={{ boxShadow: "0 8px 32px rgba(0,0,0,.12)", border: "1px solid #e2e8f0" }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #e2e8f0" }}>
                <span className="font-semibold text-sm" style={{ color: "#334155" }}>Notificações</span>
                <button className="text-xs font-medium hover:underline" style={{ color: "#800020" }}>Marcar como lidas</button>
              </div>
              {["Dr. Carlos Mendes comentou no comunicado de acreditação", "Você recebeu um reconhecimento de Ana Beatriz Costa", "Novo evento: Confraternização Dia do Médico publicado", "Check-up anual 2026 — inscrições encerram em 7 dias", "Protocolo BLS/ACLS atualizado por CCIH."].map((t, i) => (
                <div key={i} className="px-4 py-3 text-sm flex gap-3 items-start cursor-pointer hover:bg-[#fdf8f9] transition-colors" style={{ backgroundColor: i < 3 ? "#fff5f5" : undefined }}>
                  <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: i < 3 ? "#800020" : "transparent" }} />
                  <div style={{ color: "#334155" }}>{t}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 pl-3" style={{ borderLeft: "1px solid #e2e8f0" }}>
          <div aria-hidden="true" className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold bg-[#fff5f5] text-[#800020]">
            {data.usuarioLogado?.nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("")}
          </div>
          <div className="hidden xl:block text-right">
            <div className="text-sm font-semibold leading-none" style={{ color: "#334155" }}>{data.usuarioLogado?.nome ?? "Colaborador"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "#800020" }}> {data.usuarioLogado?.cargo ?? "Colaborador"}</div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── SIDEBAR ── */}
        <aside className="w-52 bg-white flex flex-col flex-shrink-0 overflow-y-auto py-4" style={{ borderRight: "1px solid #e2e8f0" }}>
          <nav className="flex-1 px-3 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const active = activeNav === item.key;
              return (
                <button key={item.key} onClick={() => setActiveNav(item.key as NavKey)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{ backgroundColor: active ? "#800020" : "transparent", color: active ? "#ffffff" : "#94a3b8", boxShadow: active ? "0 2px 8px rgba(128,0,32,.25)" : undefined }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc"; (e.currentTarget as HTMLElement).style.color = "#334155"; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; } }}>
                  <Icon path={ICONS[item.icon as keyof typeof ICONS]} size={18} className="flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{ backgroundColor: active ? "rgba(255,255,255,.25)" : "#800020", color: "#fff" }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/** Setores expandidos quando Diretório ativo */}
          {activeNav === 'diretorio' && (
            <div className="px-3 mt-3">
              <div className="text-xs font-semibold mb-2" style={{ color: '#94a3b8' }}>Setores do Hospital</div>
              <div className="grid gap-1">
                {(useApi ? data.setores.map(s => s.nome) : MOCK_HOSPITAL_SECTORS).map(s => (
                  <button key={s} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium" style={{ color: '#64748b' }} onClick={() => setActiveNav('diretorio')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-3 pt-3 mt-auto" style={{ borderTop: "1px solid #e2e8f0" }}>
            <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all" style={{ color: "#94a3b8" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "#fff5f5"; el.style.color = "#ef4444"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.backgroundColor = "transparent"; el.style.color = "#94a3b8"; }}>
              <Icon path={ICONS.logout} size={18} />Sair
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="flex-1 overflow-y-auto">
          {activeNav === "eventos"         && <EventsView />}
          {activeNav === "noticias"        && <NewsView />}
          {activeNav === "diretorio"      && <DirectoryView />}
          {activeNav === "reconhecimentos" && <RecognitionsView />}
          {activeNav === "documentos"      && <DocumentsView />}
          {activeNav === "faq"             && <FAQView />}

          {activeNav === "home" && (
            <div className="p-5 space-y-5 max-w-[1400px]">

              {/* Alerts */}
              <div className="rounded-xl overflow-hidden">
                {ALERTS.map((alert, i) => (
                  <div key={alert.id} onClick={() => setActiveAlert(i)}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all text-sm font-medium"
                    style={{
                      backgroundColor: activeAlert === i ? (alert.type === "urgent" ? "#800020" : "#3b000e") : "#f1f5f9",
                      color: activeAlert === i ? "#ffffff" : "#64748b",
                      borderBottom: i < ALERTS.length - 1 ? "1px solid rgba(255,255,255,.1)" : undefined,
                    }}>
                    <span className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: activeAlert === i ? "rgba(255,255,255,.2)" : (alert.type === "urgent" ? "#fff5f5" : "#e0e7ff"),
                        color: activeAlert === i ? "#ffffff" : (alert.type === "urgent" ? "#ef4444" : "#4338ca"),
                      }}>
                      {alert.type === "urgent" ? "⚠ URGENTE" : "ℹ INFO"}
                    </span>
                    <span className="flex-1 truncate">{alert.text}</span>
                    <Icon path={ICONS.chevronRight} size={16} className="flex-shrink-0 opacity-60" />
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-[1fr_300px] gap-5">
                {/* LEFT */}
                <div className="space-y-5">
                  {/* Featured */}
                  {featured ? (<div className="relative rounded-xl overflow-hidden h-64 group cursor-pointer">
                    <img src={`https://images.unsplash.com/photo-${featured.image}?w=900&h=400&fit=crop&auto=format`}
                      alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: "#800020" }}>★ Destaque</span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryPill label={featured.category} />
                        <span className="text-white/60 text-xs">{featured.date} · {featured.readTime} de leitura</span>
                      </div>
                      <h2 className="text-white font-bold text-lg leading-snug">{featured.title}</h2>
                      <p className="text-white/70 text-sm mt-1 line-clamp-2">{featured.excerpt}</p>
                    </div>
                  </div>) : <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Nenhum comunicado publicado ainda.</p>}

                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-white rounded-xl p-1 w-fit" style={{ border: "1px solid #e2e8f0" }}>
                    {(["noticias", "reconhecimentos"] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                        style={activeTab === tab ? { backgroundColor: "#800020", color: "#ffffff", boxShadow: "0 1px 4px rgba(128,0,32,.2)" } : { color: "#94a3b8" }}>
                        {tab === "noticias" ? "Notícias & Comunicados" : "Reconhecimentos"}
                      </button>
                    ))}
                  </div>

                  {/* News list */}
                  {activeTab === "noticias" && (
                    <div className="space-y-3">
                      {newsList.slice(1, 5).map(news => (
                        <article key={news.id}
                          className="bg-white rounded-xl border overflow-hidden flex group cursor-pointer transition-all hover:shadow-md"
                          style={{ borderColor: "#e2e8f0" }}>
                          <div className="w-44 flex-shrink-0 overflow-hidden bg-gray-100">
                            <img src={`https://images.unsplash.com/photo-${news.image}?w=240&h=160&fit=crop&auto=format`}
                              alt={news.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-center gap-2 mb-1.5">
                              <CategoryPill label={news.category} />
                              <span className="text-[11px]" style={{ color: "#94a3b8" }}>{news.date} · {news.readTime}</span>
                            </div>
                            <h3 className="font-semibold text-sm leading-snug line-clamp-2 transition-colors group-hover:text-[#800020]" style={{ color: "#334155" }}>{news.title}</h3>
                            <p className="text-xs mt-1.5 line-clamp-2" style={{ color: "#94a3b8" }}>{news.excerpt}</p>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-xs font-medium flex-1" style={{ color: "#94a3b8" }}>{news.author}</span>
                              <button className="flex items-center gap-1 text-xs" style={{ color: "#94a3b8" }}><Icon path={ICONS.eye} size={12} />{news.views}</button>
                              <button onClick={e => { e.stopPropagation(); toggleLike(news.id); }}
                                className="flex items-center gap-1 text-xs transition-colors"
                                style={{ color: likedPosts.has(news.id) ? "#800020" : "#94a3b8" }}>
                                <Icon path={ICONS.heart} size={12} />{news.likes + (likedPosts.has(news.id) ? 1 : 0)}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                      <button onClick={() => setActiveNav("noticias")}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl border transition-colors hover:bg-[#fff5f5]"
                        style={{ borderColor: "#e2e8f0", color: "#800020" }}>
                        Ver todas as notícias →
                      </button>
                    </div>
                  )}

                  {/* Recognitions preview */}
                  {activeTab === "reconhecimentos" && (
                    <div className="space-y-3">
                      {ALL_RECOGNITIONS.slice(0, 2).map(rec => (
                        <div key={rec.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow" style={{ borderColor: "#e2e8f0" }}>
                          <div className="flex gap-3">
                            <Avatar id={rec.fromAvatar} size={40} />
                            <div className="flex-1">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold" style={{ color: "#334155" }}>{rec.fromName}</span>
                                <span className="text-xs" style={{ color: "#94a3b8" }}>reconheceu</span>
                                <span className="text-sm font-semibold" style={{ color: "#800020" }}>{rec.honoree}</span>
                              </div>
                              <p className="text-sm mt-1.5 leading-relaxed pl-3 line-clamp-2" style={{ color: "#64748b", borderLeft: "2px solid #b33951" }}>{rec.message}</p>
                              <div className="flex items-center gap-4 mt-2.5">
                                <span className="text-xs" style={{ color: "#94a3b8" }}>{rec.time}</span>
                                <button className="ml-auto flex items-center gap-1 text-xs" style={{ color: "#94a3b8" }}><Icon path={ICONS.heart} size={13} />{rec.likes}</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => setActiveNav("reconhecimentos")}
                        className="w-full py-2.5 text-sm font-semibold rounded-xl border transition-colors hover:bg-[#fff5f5]"
                        style={{ borderColor: "#e2e8f0", color: "#800020" }}>
                        Ver mural completo →
                      </button>
                    </div>
                  )}
                </div>

                {/* RIGHT PANEL */}
                <div className="space-y-4">
                  {/* Events */}
                  <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff5f5" }}>
                          <Icon path={ICONS.calendar} size={14} style={{ color: "#800020" }} />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "#334155" }}>Próximos eventos</span>
                      </div>
                      <button className="text-xs font-medium hover:underline" style={{ color: "#800020" }}
                        onClick={() => setActiveNav("eventos")}>Ver agenda</button>
                    </div>

                    <MiniCalendar />

                    <div className="space-y-2.5 mt-3">
                      {dashEvents.map(ev => {
                        const s = EVENT_TYPE_STYLE[ev.type];
                        return (
                          <div key={ev.id} className="flex gap-3 items-start cursor-pointer group" onClick={() => setActiveNav("eventos")}>
                            <div className="w-10 text-center flex-shrink-0">
                              <div className="text-lg font-black leading-none" style={{ color: "#800020" }}>
                                {new Date(ev.date + "T12:00:00").getDate()}
                              </div>
                              <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#94a3b8" }}>
                                {MONTH_NAMES[new Date(ev.date + "T12:00:00").getMonth()].slice(0, 3).toUpperCase()}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0 pb-2.5" style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <div className="text-xs font-semibold leading-snug group-hover:text-[#800020] transition-colors" style={{ color: "#334155" }}>{ev.title}</div>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border" style={{ backgroundColor: s.bg, color: s.text, borderColor: s.border }}>{s.label}</span>
                                <span className="text-[10px]" style={{ color: "#94a3b8" }}>{timeLabel(ev.startHour, ev.startMin)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button type="button" onClick={openQuickAccess}
                    aria-haspopup="dialog" aria-controls="quick-access-dialog"
                    className="w-full flex items-center gap-3 rounded-xl border border-[#ead4dc] bg-[#fff5f5] p-4 text-left text-[#800020] transition-colors hover:bg-[#fce8ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white"><Icon path={ICONS.pin} size={19} /></span>
                    <span className="flex-1"><span className="block text-sm font-semibold">Acesso Rápido</span><span className="mt-0.5 block text-xs text-[#78616a]">Portal RH, escala e outros serviços</span></span>
                    <Icon path={ICONS.chevronRight} size={17} />
                  </button>

                  {/* Birthdays */}
                  <div className="bg-white rounded-xl p-4" style={{ border: "1px solid #e2e8f0" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff5f5" }}>
                        <Icon path={ICONS.gift} size={14} style={{ color: "#800020" }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#334155" }}>Aniversários</span>
                    </div>
                    <div className="space-y-2.5">
                      {birthdays.length === 0 && (
                        <p className="text-xs" style={{ color: "#94a3b8" }}>Nenhum aniversariante este mês.</p>
                      )}
                      {birthdays.map((b, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          <div className="relative"><Avatar id={b.avatar} size={36} />{b.today && <span className="absolute -top-1 -right-1 text-sm">🎂</span>}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: "#334155" }}>{b.name}</div>
                            <div className="text-xs truncate" style={{ color: "#94a3b8" }}>{b.role}</div>
                          </div>
                          {b.today && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fff5f5", color: "#800020" }}>hoje</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <dialog ref={quickAccessDialog} id="quick-access-dialog" aria-labelledby="quick-access-title" aria-describedby="quick-access-description"
        className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-[#334155] shadow-2xl backdrop:bg-slate-950/45"
        onKeyDown={event => {
          if (event.key !== "Tab") return;
          const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}
        onClick={event => { if (event.target === event.currentTarget) quickAccessDialog.current?.close(); }}>
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="quick-access-title" className="text-lg font-bold text-[#800020]">Acesso Rápido</h2>
              <p id="quick-access-description" className="mt-1 text-sm text-slate-500">Escolha o serviço que deseja acessar.</p>
            </div>
            <button type="button" autoFocus aria-label="Fechar acesso rápido" onClick={() => quickAccessDialog.current?.close()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#800020]">
              <Icon path="M6 6l12 12 M18 6L6 18" size={20} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {DEFAULT_QUICK_LINKS.map(link => (
              <button type="button" key={link.id} onClick={() => selectQuickLink(link)}
                className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-[#f3dfe5] bg-[#fff5f5] p-4 text-center text-sm font-medium text-[#800020] transition-colors hover:border-[#b33951] hover:bg-[#fce8ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#800020]">
                <Icon path={ICONS[link.icon as keyof typeof ICONS] ?? ICONS.pin} size={24} />
                {link.label}
              </button>
            ))}
          </div>
          {quickAccessNotice && <p role="status" className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{quickAccessNotice}</p>}
        </div>
      </dialog>
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-[min(720px,96%)] p-6">
            <h3 className="text-lg font-bold mb-3">Adicionar novo {addType === 'noticia' ? 'comunicado' : addType === 'evento' ? 'evento' : 'aniversariante'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Categoria</label>
                <select value={modalForm.category} onChange={e => setModalField('category', e.target.value)} className="w-full mt-1 p-2 border rounded">
                  {Object.keys(CATEGORY_COLORS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {(addType === 'noticia' || addType === 'evento') && (
                <div>
                  <label className="text-sm font-medium">Título / Nome</label>
                  <input value={modalForm.title} onChange={e => setModalField('title', e.target.value)} className="w-full mt-1 p-2 border rounded" />
                </div>
              )}

              {addType === 'aniversariante' && (
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <input value={modalForm.name} onChange={e => setModalField('name', e.target.value)} className="w-full mt-1 p-2 border rounded" />
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Data</label>
                <input type="date" value={modalForm.date} onChange={e => setModalField('date', e.target.value)} className="w-full mt-1 p-2 border rounded" />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <textarea value={modalForm.description} onChange={e => setModalField('description', e.target.value)} className="w-full mt-1 p-2 border rounded h-28" />
              </div>

              {addType === 'aniversariante' && (
                <div>
                  <label className="text-sm font-medium">Cargo / Função</label>
                  <input value={modalForm.role} onChange={e => setModalField('role', e.target.value)} className="w-full mt-1 p-2 border rounded" />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-4">
                <button className="px-4 py-2 rounded" onClick={() => setShowAddModal(false)}>Cancelar</button>
                <button className="px-4 py-2 rounded bg-[#800020] text-white" onClick={handleCreateFromModal}>Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthenticatedApp() {
  const { user, restoring } = useAuth();
  if (restoring) return <main className="min-h-dvh flex items-center justify-center bg-white text-[#800020]" role="status">Validando seu acesso…</main>;
  if (!user) return <Login />;
  return <DataProvider><App /></DataProvider>;
}

export default function Root() {
  return <AuthProvider><AuthenticatedApp /></AuthProvider>;
}
