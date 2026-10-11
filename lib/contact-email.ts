import type { ContactInput } from "@/lib/contact";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Builds the team notification. Every user value is escaped before it touches the HTML.
export function buildContactEmail(input: ContactInput): { subject: string; html: string; text: string } {
  // Collapse whitespace so a crafted name cannot break the subject line.
  const subject = `[Arcade Vault] Mensaje de ${input.name.replace(/\s+/g, " ")}`;

  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const msg = escapeHtml(input.msg).replace(/\r?\n/g, "<br>");

  const label = "padding:8px 12px;font:bold 12px monospace;color:#555;vertical-align:top;white-space:nowrap;";
  const value = "padding:8px 12px;font:14px/1.6 sans-serif;color:#111;";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f7;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #ddd;">
      <tr><td colspan="2" style="padding:16px 12px;font:bold 16px monospace;color:#0a0a0f;border-bottom:2px solid #00f5ff;">Nuevo mensaje desde Arcade Vault</td></tr>
      <tr><td style="${label}">NOMBRE</td><td style="${value}">${name}</td></tr>
      <tr><td style="${label}">CORREO</td><td style="${value}">${email}</td></tr>
      <tr><td style="${label}">MENSAJE</td><td style="${value}">${msg}</td></tr>
    </table>
  </body>
</html>`;

  const text = [
    "Nuevo mensaje desde Arcade Vault",
    "",
    `Nombre: ${input.name}`,
    `Correo: ${input.email}`,
    "",
    "Mensaje:",
    input.msg,
  ].join("\n");

  return { subject, html, text };
}
