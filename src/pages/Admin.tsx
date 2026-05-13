import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import InviteUser from "@/components/InviteUser";
import { KanbanProvider } from "@/context/KanbanContext";

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (loading) return;
      if (!user) {
        navigate("/auth");
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    };
    run();
  }, [user, loading, navigate]);

  if (loading || checking) {
    return <div>Loading...</div>;
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <InviteUser />
          </div>
        </main>
      </KanbanProvider>
    </div>
  );
};

export default Admin;
