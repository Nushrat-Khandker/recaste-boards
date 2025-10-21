import { useKanban, KanbanProvider } from "@/context/KanbanContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import KanbanBoard from "@/components/KanbanBoard";
import { ChatView } from "@/components/board/ChatView";
import { FilesView } from "@/components/board/FilesView";
import { CheckSquare, MessageSquare, Files, Pencil, Check, XCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

type BoardView = 'tasks' | 'chat' | 'files';

const ProjectsContent = () => {
  const { columns, allProjects, setSelectedProject, selectedProject, renameProject } = useKanban();
  const [viewingProject, setViewingProject] = useState<string | null>(null);
  const [boardView, setBoardView] = useState<BoardView>('tasks');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");

  // Get cards grouped by project (handle Unassigned)
  const projectData = allProjects.map(projectName => {
    const isUnassigned = projectName === 'Unassigned';
    const projectCards = columns.flatMap(column => 
      column.cards.filter(card => isUnassigned ? !card.projectName : card.projectName === projectName)
    );
    
    const todoCount = columns.find(c => c.id === 'todo')?.cards.filter(card => isUnassigned ? !card.projectName : card.projectName === projectName).length || 0;
    const inProgressCount = columns.find(c => c.id === 'in-progress')?.cards.filter(card => isUnassigned ? !card.projectName : card.projectName === projectName).length || 0;
    const doneCount = columns.find(c => c.id === 'done')?.cards.filter(card => isUnassigned ? !card.projectName : card.projectName === projectName).length || 0;
    
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

  // If viewing a specific project, show clean board page without Header
  if (viewingProject) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        {/* Custom minimal navigation bar */}
        <header className="sticky top-0 z-50 bg-background border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              {/* Logo */}
              <Link to="/" className="text-xl font-bold hover:opacity-80 transition-opacity">
                re<span className="text-[#FE446F]">*</span>caste
              </Link>
              
              {/* Board Title with Edit */}
              <div className="flex items-center gap-2">
                {editingProject === viewingProject ? (
                  <>
                    <span className="text-2xl">📂</span>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="text-2xl font-bold bg-transparent border-b-2 border-primary focus:outline-none"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleSaveEdit}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}><XCircle className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-2xl font-bold">📂 {viewingProject}</h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartEdit(viewingProject)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Board View Tabs (Icon Only) */}
              <Tabs value={boardView} onValueChange={(v) => setBoardView(v as BoardView)}>
                <TabsList>
                  <TabsTrigger value="tasks" title="Tasks">
                    <CheckSquare className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="chat" title="Chat">
                    <MessageSquare className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="files" title="Files">
                    <Files className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Main Navigation */}
            <Tabs value="projects" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="projects" asChild>
                  <Link to="/projects">📂 Boards</Link>
                </TabsTrigger>
                <TabsTrigger value="tasks" asChild>
                  <Link to="/">✅ Tasks</Link>
                </TabsTrigger>
                <TabsTrigger value="calendar" asChild>
                  <Link to="/#calendar">📅 Calendar</Link>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Board Content */}
        <main className="flex-1 container mx-auto px-4 py-6">
          {boardView === 'tasks' && <KanbanBoard />}
          {boardView === 'chat' && <ChatView boardName={viewingProject} />}
          {boardView === 'files' && <FilesView boardName={viewingProject} />}
        </main>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">📂 Boards Overview</h1>
      
      {projectData.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No boards yet. Create a card with a project name to get started!</p>
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
