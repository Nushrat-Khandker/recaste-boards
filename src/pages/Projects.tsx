import { useKanban, KanbanProvider } from "@/context/KanbanContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";

const ProjectsContent = () => {
  const { columns, allProjects, setSelectedProject } = useKanban();
  const navigate = useNavigate();

  // Get cards grouped by project
  const projectData = allProjects.map(projectName => {
    const projectCards = columns.flatMap(column => 
      column.cards.filter(card => card.projectName === projectName)
    );
    
    const todoCount = columns.find(c => c.id === 'todo')?.cards.filter(card => card.projectName === projectName).length || 0;
    const inProgressCount = columns.find(c => c.id === 'in-progress')?.cards.filter(card => card.projectName === projectName).length || 0;
    const doneCount = columns.find(c => c.id === 'done')?.cards.filter(card => card.projectName === projectName).length || 0;
    
    return {
      name: projectName,
      totalCards: projectCards.length,
      todoCount,
      inProgressCount,
      doneCount,
    };
  });

  const handleProjectClick = (projectName: string) => {
    setSelectedProject(projectName);
    navigate('/');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📂 Projects Overview</h1>
      
      {projectData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No projects yet. Create a card with a project name to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projectData.map((project) => (
            <Card 
              key={project.name} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProjectClick(project.name)}
            >
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>{project.totalCards} total tasks • Click to view</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">To Do</span>
                    <Badge variant="outline">{project.todoCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <Badge variant="outline">{project.inProgressCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Done</span>
                    <Badge variant="outline">{project.doneCount}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Projects = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <KanbanProvider>
        <Header />
        <main>
          <ProjectsContent />
        </main>
      </KanbanProvider>
    </div>
  );
};

export default Projects;
