"use server";

import { Resend } from "resend";
import { parseContact, type ContactState } from "@/lib/contact";
import { buildContactEmail } from "@/lib/contact-email";

// Sends the contact form to the team inbox. Anyone can POST here, so every input is revalidated.
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: bots fill the hidden field. Pretend it worked so they get no signal.
  const trap = formData.get("website");
  if (typeof trap === "string" && trap.trim() !== "") {
    const name = formData.get("name");
    return { status: "success", name: typeof name === "string" ? name.trim() : "" };
  }

  const input = parseContact(formData);
  if (!input) return { status: "error", error: "invalid" };

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error("[contact] Missing RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL.");
    return { status: "error", error: "send" };
  }

  const { subject, html, text } = buildContactEmail(input);
  try {
    const { error } = await new Resend(RESEND_API_KEY).emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: input.email,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[contact] Resend rejected the email:", error.name, error.message);
      return { status: "error", error: "send" };
    }
  } catch (err) {
    console.error("[contact] Resend request failed:", err);
    return { status: "error", error: "send" };
  }

  return { status: "success", name: input.name };
}
