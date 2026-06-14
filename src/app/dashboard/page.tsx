import { createClient } from "@/utils/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-8 shadow-sm text-center">
        <h1 className="mb-2 text-2xl font-semibold text-gray-900">
          Dashboard - Coming in next step
        </h1>
        {user?.email && (
          <p className="mb-6 text-sm text-gray-500">Signed in as {user.email}</p>
        )}
        <LogoutButton />
      </div>
    </div>
  );
}
