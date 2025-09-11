import SlackIntegration from '@/components/SlackIntegration';
import Header from '@/components/Header';
import { KanbanProvider } from '@/context/KanbanContext';

const SlackIntegrationPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Slack Integration</h1>
              <p className="text-muted-foreground">
                Connect your Kanban board with Slack for seamless collaboration
              </p>
            </div>
            <SlackIntegration />
          </div>
        </main>
      </KanbanProvider>
    </div>
  );
};

export default SlackIntegrationPage;