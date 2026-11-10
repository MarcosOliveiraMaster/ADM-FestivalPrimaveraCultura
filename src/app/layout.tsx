import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { cleanSrc } from "@/shared/image";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Ícone da aba = ícone do festival definido em Configurações (o mesmo do site). */
export async function generateMetadata(): Promise<Metadata> {
  let favicon: string | undefined;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("brand").eq("id", 1).maybeSingle();
    const brand = (data?.brand ?? {}) as { favicon_url?: string; icon_url?: string };
    favicon = cleanSrc(brand.favicon_url || brand.icon_url) || undefined;
  } catch {}
  return {
    title: { default: "ADM · Festival da Primavera", template: "%s · ADM Festival da Primavera" },
    robots: { index: false, follow: false },
    icons: favicon ? { icon: favicon, apple: favicon } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
