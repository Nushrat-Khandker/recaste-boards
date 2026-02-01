import { ChatView } from "@/components/chat";
import Header from "@/components/Header";
import { KanbanProvider } from "@/context/KanbanContext";

const ChatContent = () => {
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
