export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">✿</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">Festival da Primavera</div>
          <div className="text-sm text-zinc-500">Painel administrativo</div>
        </div>
        <div className="adm-card p-6">{children}</div>
      </div>
    </div>
  );
}
