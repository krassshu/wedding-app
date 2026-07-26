import { isAdminConfigured, isAuthed } from "@/lib/adminAuth";
import AdminLogin from "@/app/admin/AdminLogin";
import AdminPanel from "@/app/admin/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Panel administratora",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="py-16 text-center text-sm text-muted">
        Panel administratora nie jest jeszcze skonfigurowany.
      </div>
    );
  }

  const authed = await isAuthed();
  return authed ? <AdminPanel /> : <AdminLogin />;
}
