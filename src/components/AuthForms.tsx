"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function translate(msg: string) {
  if (/invalid login/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(msg)) return "Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.";
  if (/password should be/i.test(msg)) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/rate limit/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  return msg;
}

function Msg({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error) return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;
  if (ok) return <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{ok}</p>;
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(params.get("erro"));
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
    setLoading(false);
    if (error) return setError(translate(error.message));
    router.replace(params.get("next") || "/");
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Entrar</h1>
      <label className="adm-label">E-mail<input name="email" type="email" required className="adm-input" autoComplete="email" /></label>
      <label className="adm-label">Senha<input name="password" type="password" required className="adm-input" autoComplete="current-password" /></label>
      <Msg error={error} />
      <button className="adm-btn-primary" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
      <div className="flex justify-between text-sm">
        <a href="/primeiro-acesso" className="text-brand-600 hover:underline">Primeiro acesso</a>
        <a href="/esqueci-senha" className="text-zinc-500 hover:underline">Esqueci minha senha</a>
      </div>
    </form>
  );
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password !== String(fd.get("password2"))) return setError("As senhas não conferem.");
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    setLoading(true);
    setError(null);
    const { data, error } = await createClient().auth.signUp({
      email: String(fd.get("email")).trim().toLowerCase(),
      password,
      options: { data: { full_name: String(fd.get("name")).trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
    setLoading(false);
    if (error) return setError(translate(error.message));
    if (data.user && data.user.identities?.length === 0) return setError(translate("already registered"));
    setOk("Pronto! Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar o acesso.");
  }
  if (ok) return <Msg ok={ok} />;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Primeiro acesso</h1>
        <p className="mt-1 text-sm text-zinc-500">Use o e-mail em que você foi convidado pela administração.</p>
      </div>
      <label className="adm-label">Nome<input name="name" required className="adm-input" autoComplete="name" /></label>
      <label className="adm-label">E-mail<input name="email" type="email" required className="adm-input" autoComplete="email" /></label>
      <label className="adm-label">Senha<input name="password" type="password" required minLength={8} className="adm-input" autoComplete="new-password" /></label>
      <label className="adm-label">Repita a senha<input name="password2" type="password" required minLength={8} className="adm-input" autoComplete="new-password" /></label>
      <Msg error={error} />
      <button className="adm-btn-primary" disabled={loading}>{loading ? "Criando…" : "Criar acesso"}</button>
      <a href="/login" className="text-center text-sm text-zinc-500 hover:underline">Já tenho acesso</a>
    </form>
  );
}

export function ForgotForm() {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(String(fd.get("email")).trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
    });
    setLoading(false);
    if (error) return setError(translate(error.message));
    setOk("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
  }
  if (ok) return <Msg ok={ok} />;
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Recuperar senha</h1>
      <label className="adm-label">E-mail<input name="email" type="email" required className="adm-input" /></label>
      <Msg error={error} />
      <button className="adm-btn-primary" disabled={loading}>{loading ? "Enviando…" : "Enviar link"}</button>
      <a href="/login" className="text-center text-sm text-zinc-500 hover:underline">Voltar</a>
    </form>
  );
}

export function NewPasswordForm({ redirectTo = "/" }: { redirectTo?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password !== String(fd.get("password2"))) return setError("As senhas não conferem.");
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(translate(error.message));
    setOk("Senha alterada.");
    (e.target as HTMLFormElement).reset();
    if (redirectTo) setTimeout(() => router.replace(redirectTo), 800);
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="adm-label">Nova senha<input name="password" type="password" required minLength={8} className="adm-input" autoComplete="new-password" /></label>
      <label className="adm-label">Repita a nova senha<input name="password2" type="password" required minLength={8} className="adm-input" autoComplete="new-password" /></label>
      <Msg error={error} ok={ok} />
      <button className="adm-btn-primary" disabled={loading}>{loading ? "Salvando…" : "Salvar senha"}</button>
    </form>
  );
}
