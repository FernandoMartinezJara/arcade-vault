"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { sendContact } from "@/app/acerca/actions";
import { CONTACT_ERROR_MESSAGES, CONTACT_LIMITS, type ContactState } from "@/lib/contact";

const INITIAL: ContactState = { status: "idle" };
const EMPTY = { name: "", email: "", msg: "" };
const SHAKE_MS = 400;

// "reset" comes from ENVIAR OTRO MENSAJE and returns to the empty form without calling the server.
type Payload = FormData | "reset";

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [shake, setShake] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerShake = () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    setShake(true);
    shakeTimer.current = setTimeout(() => setShake(false), SHAKE_MS);
  };

  // Wraps the Server Action so a failed send shakes the form, like an empty submit does.
  const [state, formAction, pending] = useActionState(async (prev: ContactState, payload: Payload) => {
    if (payload === "reset") return INITIAL;
    const next = await sendContact(prev, payload);
    if (next.status === "error") triggerShake();
    return next;
  }, INITIAL);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      e.preventDefault();
      triggerShake();
    }
  };

  const sendAnother = () => {
    setForm(EMPTY);
    startTransition(() => formAction("reset"));
  };

  return (
    <form className={"contact-form" + (shake ? " shake" : "")} action={formAction} onSubmit={onSubmit}>
      {state.status !== "success" ? (
        <>
          <div className="field">
            <label htmlFor="contact-name">NOMBRE</label>
            <input
              id="contact-name"
              name="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="px_kai"
              maxLength={CONTACT_LIMITS.name}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jugador@vault.gg"
              maxLength={CONTACT_LIMITS.email}
              disabled={pending}
            />
          </div>
          <div className="field">
            <label htmlFor="contact-msg">MENSAJE</label>
            <textarea
              id="contact-msg"
              name="msg"
              rows={5}
              value={form.msg}
              onChange={(e) => setForm({ ...form, msg: e.target.value })}
              placeholder="Cuéntanos qué tienes en mente…"
              maxLength={CONTACT_LIMITS.msg}
              disabled={pending}
            ></textarea>
          </div>
          {/* Honeypot: hidden from people and assistive tech; bots that fill it get a fake success. */}
          <div className="contact-hp" aria-hidden="true">
            <label htmlFor="contact-website">WEBSITE</label>
            <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>
          {state.status === "error" && (
            <p className="contact-error" role="alert">{CONTACT_ERROR_MESSAGES[state.error]}</p>
          )}
          <button className="btn xl press" type="submit" style={{ width: "100%" }} disabled={pending}>
            {pending ? "▶  TRANSMITIENDO…" : "▶  ENVIAR MENSAJE"}
          </button>
        </>
      ) : (
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {state.name.toUpperCase()}.<span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button className="btn ghost" type="button" onClick={sendAnother}>ENVIAR OTRO MENSAJE</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
