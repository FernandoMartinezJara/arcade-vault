"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout, useUser } from "@/lib/session";

type Section = "biblioteca" | "salon" | "auth";

function activeSection(pathname: string): Section | null {
  // Detail and player pages belong to the library.
  if (pathname === "/" || pathname.startsWith("/juegos")) return "biblioteca";
  if (pathname.startsWith("/salon")) return "salon";
  if (pathname.startsWith("/login")) return "auth";
  return null;
}

export function Nav() {
  const pathname = usePathname();
  const user = useUser();
  const [open, setOpen] = useState(false);
  const active = activeSection(pathname);
  const cls = (s: Section) => (active === s ? "active" : undefined);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close} aria-label="Arcade Vault, ir a la biblioteca">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={cls("biblioteca")} aria-current={active === "biblioteca" ? "page" : undefined}>
            Biblioteca
          </Link>
          <Link href="/salon" className={cls("salon")} aria-current={active === "salon" ? "page" : undefined}>
            Salón de la Fama
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={logout} title="Cerrar sesión">
            {user.name} ▾
          </button>
        ) : (
          <Link href="/login" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
          aria-controls="av-mobile-panel"
        >
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      <aside
        id="av-mobile-panel"
        className={"av-mobile-panel" + (open ? " open" : "")}
        aria-label="Menú"
        inert={!open}
      >
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={cls("biblioteca")} onClick={close}>
          Biblioteca
        </Link>
        <Link href="/salon" className={cls("salon")} onClick={close}>
          Salón de la Fama
        </Link>
        <Link href="/login" className={cls("auth")} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
