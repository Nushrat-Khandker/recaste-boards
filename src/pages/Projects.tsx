import { useKanban, KanbanProvider } from "@/context/KanbanContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import { ArrowLeft, X, Pencil, Check, XCircle } from "lucide-react";
import { useState } from "react";

const ProjectsContent = () => {
  const { columns, allProjects, setSelectedProject, selectedProject, renameProject } = useKanban();
  const [viewingProject, setViewingProject] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

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
    setViewingProject(projectName);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setViewingProject(null);
  };

  const handleStartEdit = (projectName: string) => {
    setEditingProject(projectName);
    setNewProjectName(projectName);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setNewProjectName("");
  };

  const handleSaveEdit = async () => {
    if (editingProject && newProjectName.trim() && newProjectName !== editingProject) {
      await renameProject(editingProject, newProjectName.trim());
      if (viewingProject === editingProject) {
        setViewingProject(newProjectName.trim());
      }
    }
    setEditingProject(null);
    setNewProjectName("");
  };

  // If viewing a specific project, show the kanban board
  if (viewingProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              onClick={handleBackToProjects}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToProjects}
            >
              <X className="h-3 w-3 mr-1" />
              Clear filter
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {editingProject === viewingProject ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl">📂</span>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="text-3xl font-bold bg-transparent border-b-2 border-primary focus:outline-none"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Cancel</Button>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold">📂 {viewingProject}</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-60 hover:opacity-100"
                  onClick={() => handleStartEdit(viewingProject)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        <KanbanBoard />
      </div>
    );
  }

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
              className="group hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleProjectClick(project.name)}
            >
              <CardHeader>
                {editingProject === project.name ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleSaveEdit}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelEdit}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <CardTitle>{project.name}</CardTitle>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(project.name);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
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
