import { ChatView } from "@/components/chat";
import Header from "@/components/Header";
import { KanbanProvider } from "@/context/KanbanContext";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const ChatContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">💬 General Chat</h1>
          <p className="text-muted-foreground mt-2">Team-wide conversations and announcements</p>
        </div>
        <ChatView contextType="general" />
      </main>
    </div>
  );
};

const Chat = () => {
  return (
    <KanbanProvider>
      <ChatContent />
    </KanbanProvider>
  );
};

export default Chat;
