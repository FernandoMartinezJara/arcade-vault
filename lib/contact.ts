// Contact form contract shared by the Server Action and the client form.
export const CONTACT_LIMITS = { name: 60, email: 254, msg: 2000 } as const;

export interface ContactInput {
  name: string; // tras trim
  email: string; // tras trim
  msg: string; // tras trim
}

export type ContactError = "invalid" | "send";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string } // nombre saneado para la terminal
  | { status: "error"; error: ContactError };

export const CONTACT_ERROR_MESSAGES: Record<ContactError, string> = {
  invalid: "[ERR] DATOS INVÁLIDOS. REVISA NOMBRE, CORREO Y MENSAJE.",
  send: "[ERR] NO SE PUDO TRANSMITIR. INTÉNTALO DE NUEVO.",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, key: keyof ContactInput): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Devuelve el input saneado o null si no cumple requeridos, formato o límites.
export function parseContact(formData: FormData): ContactInput | null {
  const input: ContactInput = {
    name: field(formData, "name"),
    email: field(formData, "email"),
    msg: field(formData, "msg"),
  };
  if (!input.name || !input.email || !input.msg) return null;
  if (
    input.name.length > CONTACT_LIMITS.name ||
    input.email.length > CONTACT_LIMITS.email ||
    input.msg.length > CONTACT_LIMITS.msg
  ) {
    return null;
  }
  if (!EMAIL_RE.test(input.email)) return null;
  return input;
}
