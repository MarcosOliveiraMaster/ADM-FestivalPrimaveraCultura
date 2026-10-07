import { requireStaff } from "@/lib/auth";

export default async function EditorLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return children;
}
