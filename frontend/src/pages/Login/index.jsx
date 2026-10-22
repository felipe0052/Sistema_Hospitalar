import React, { useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import logo from "../../imports/Decos_Hospital_Logo_Horizontal_Transparente.png";
import symbol from "../../imports/Decos_Hospital_Simbolo_Transparente_v2.png";
import "../../login.css";

const EMAIL_KEY = "decos.login.email";

function lerEmailSalvo() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function Glyph({ name }) {
  const paths = {
    mail: "M4 5h16v14H4z M4 6l8 6 8-6",
    lock: "M6 10h12v11H6z M8 10V6a4 4 0 018 0v4 M12 14v3",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6",
    hidden:
      "M3 3l18 18 M10 5.2c.6-.1 1.3-.2 2-.2 6.5 0 10 7 10 7a19 19 0 01-3 3.8 M6 6.5A20 20 0 002 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.2 M10 10a3 3 0 004 4",
    arrow: "M4 12h16 M14 6l6 6-6 6",
    shield: "M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6",
  };
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(lerEmailSalvo);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(() => Boolean(lerEmailSalvo()));
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [help, setHelp] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const errorRef = useRef(null);

  if (auth.usuario && !auth.carregando) {
    return <Navigate to="/" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    const problems = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      problems.email = "Informe seu e-mail corporativo.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      problems.email = "Informe um e-mail válido.";
    }
    if (!password) {
      problems.password = "Informe sua senha.";
    }

    setFields(problems);
    setError("");
    if (problems.email || problems.password) {
      (problems.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    setBusy(true);
    try {
      try {
        if (remember) localStorage.setItem(EMAIL_KEY, normalizedEmail);
        else localStorage.removeItem(EMAIL_KEY);
      } catch {
        /* Preferência opcional; nunca armazena a senha */
      }
      await auth.entrar(normalizedEmail, password);
      navigate("/", { replace: true });
    } catch (err) {
      let message =
        "Não foi possível conectar ao sistema. Confira sua conexão ou procure a equipe de TI.";
      if (err && typeof err.status === "number") {
        if (err.status === 401) {
          message = "E-mail ou senha inválidos";
        } else if (err.status === 403) {
          message = err.mensagem || "Usuário inativo. Procure o administrador.";
        } else if (err.status === 429) {
          message = "Muitas tentativas de acesso. Aguarde um momento e tente novamente.";
        } else if (err.status === 422) {
          message = err.mensagem || "Confira o e-mail e a senha informados.";
        } else if (err.status > 0) {
          message = err.mensagem || "O sistema está indisponível no momento. Tente novamente em instantes.";
        }
      }
      setError(message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Intranet Hospitalar Decós">
        <div className="story-top">
          <img className="story-mark" src={symbol} alt="" />
          <span>INTRANET CORPORATIVA</span>
        </div>
        <img className="story-symbol" src={symbol} alt="" />
        <div className="story-copy">
          <span className="story-eyebrow">
            <span /> CONECTADOS PELO CUIDADO
          </span>
          <h1>
            Cuidar começa
            <br />
            com <em>conexão.</em>
          </h1>
          <p>Um só lugar para quem faz a diferença todos os dias.</p>
          <div className="story-features">
            <div>
              <span>01</span>
              <p>
                <strong>Informação que aproxima</strong>
                <small>Notícias e comunicados do hospital.</small>
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Conhecimento que transforma</strong>
                <small>Documentos e protocolos ao seu alcance.</small>
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Pessoas que fazem acontecer</strong>
                <small>Encontre sua equipe e fortaleça conexões.</small>
              </p>
            </div>
          </div>
        </div>
        <div className="story-bottom">
          <span>Hospital Decós</span>
          <span>Cuidado em cada conexão.</span>
        </div>
      </section>

      <section className="login-panel" aria-label="Acesso à intranet">
        <header className="login-brand">
          <img src={logo} alt="Decós Hospital" />
          <span>Intranet Corporativa</span>
        </header>
        <div className="login-content">
          <span className="login-tag">
            <Glyph name="shield" /> PORTAL DO COLABORADOR
          </span>
          <h2>Bom ter você aqui.</h2>
          <p className="login-intro">Entre com seus dados para acessar a intranet.</p>
          {auth.aviso && !error && (
            <div className="login-notice" role="status">
              {auth.aviso}
            </div>
          )}
          {error && (
            <div className="login-error" role="alert" tabIndex={-1} ref={errorRef}>
              {error}
            </div>
          )}
          <form noValidate onSubmit={submit} aria-busy={busy}>
            <label htmlFor="login-email">E-mail corporativo</label>
            <div className={`login-input ${fields.email ? "invalid" : ""}`}>
              <Glyph name="mail" />
              <input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="seu.nome@decos.com.br"
                required
                maxLength={150}
                value={email}
                disabled={busy}
                aria-invalid={Boolean(fields.email)}
                aria-describedby={fields.email ? "email-error" : undefined}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFields((f) => ({ ...f, email: undefined }));
                  setError("");
                }}
              />
            </div>
            {fields.email && (
              <p className="field-error" id="email-error">
                {fields.email}
              </p>
            )}
            <label htmlFor="login-password">Senha</label>
            <div className={`login-input ${fields.password ? "invalid" : ""}`}>
              <Glyph name="lock" />
              <input
                ref={passwordRef}
                id="login-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Digite sua senha"
                required
                value={password}
                disabled={busy}
                aria-invalid={Boolean(fields.password)}
                aria-describedby={fields.password ? "password-error" : undefined}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFields((f) => ({ ...f, password: undefined }));
                  setError("");
                }}
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
              >
                <Glyph name={visible ? "hidden" : "eye"} />
              </button>
            </div>
            {fields.password && (
              <p className="field-error" id="password-error">
                {fields.password}
              </p>
            )}
            <div className="login-options">
              <label className="remember-email">
                <input
                  type="checkbox"
                  checked={remember}
                  disabled={busy}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (!e.target.checked) {
                      try {
                        localStorage.removeItem(EMAIL_KEY);
                      } catch {}
                    }
                  }}
                />{" "}
                Lembrar meu e-mail
              </label>
              <button
                type="button"
                className="login-link"
                aria-expanded={help}
                aria-controls="login-help"
                onClick={() => setHelp((v) => !v)}
              >
                Esqueci minha senha
              </button>
            </div>
            {help && (
              <div id="login-help" className="login-help">
                <strong>Precisa recuperar seu acesso?</strong>
                <p>
                  Procure a equipe de TI ou o administrador do hospital pelo canal interno de
                  atendimento. A recuperação de senha ainda não está disponível pelo portal.
                </p>
              </div>
            )}
            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <span className="login-spinner" /> Entrando…
                </>
              ) : (
                <>
                  Entrar na intranet <Glyph name="arrow" />
                </>
              )}
            </button>
          </form>
          <div className="login-restricted">
            <Glyph name="shield" />
            <p>
              Acesso exclusivo para colaboradores.
              <br />
              <span>Use suas credenciais pessoais e não compartilhe sua senha.</span>
            </p>
          </div>
          <div className="login-support">
            Primeiro acesso ou dificuldade para entrar?
            <button
              type="button"
              className="login-link"
              aria-expanded={help}
              aria-controls="login-help"
              onClick={() => setHelp((v) => !v)}
            >
              Veja como obter ajuda <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
        <footer className="login-footer">
          <span>© {new Date().getFullYear()} Hospital Decós</span>
          <span>Intranet Corporativa</span>
        </footer>
      </section>
    </main>
  );
}
