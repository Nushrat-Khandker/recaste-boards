import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useKanban } from '@/context/KanbanContext';
import { MessageSquare, Send, Plus } from 'lucide-react';

const SlackIntegration = () => {
  const [slackChannel, setSlackChannel] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { columns } = useKanban();

  const handleCreateCard = async () => {
    if (!cardTitle.trim() || !selectedColumn) {
      toast({
        title: "Error",
        description: "Please fill in the card title and select a column",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'create_card',
          title: cardTitle,
          description: cardDescription,
          column_id: selectedColumn
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      setCardTitle('');
      setCardDescription('');
      setSelectedColumn('');
    } catch (error) {
      console.error('Error creating card:', error);
      toast({
        title: "Error",
        description: "Failed to create card",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendBoardSummary = async () => {
    if (!slackChannel.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Slack channel",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'send_board_summary',
          channel: slackChannel
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error) {
      console.error('Error sending board summary:', error);
      toast({
        title: "Error",
        description: "Failed to send board summary to Slack",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Card from Slack
          </CardTitle>
          <CardDescription>
            Create a new Kanban card directly from this interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Card title"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
          />
          <Textarea
            placeholder="Card description (optional)"
            value={cardDescription}
            onChange={(e) => setCardDescription(e.target.value)}
            rows={3}
          />
          <Select value={selectedColumn} onValueChange={setSelectedColumn}>
            <SelectTrigger>
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={handleCreateCard} 
            disabled={isLoading}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Card
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Send Board Summary to Slack
          </CardTitle>
          <CardDescription>
            Send a summary of your Kanban board to a Slack channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Slack channel (e.g., #general or @username)"
            value={slackChannel}
            onChange={(e) => setSlackChannel(e.target.value)}
          />
          <Button 
            onClick={handleSendBoardSummary} 
            disabled={isLoading}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Summary
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slack Setup Instructions</CardTitle>
          <CardDescription>
            Configure your Slack workspace to use these features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Create a Slack App in your workspace</p>
          <p>2. Add the Bot Token to your Supabase secrets</p>
          <p>3. Invite the bot to channels where you want to send summaries</p>
          <p>4. Use slash commands like <code>/kanban create Task Name</code> or <code>/kanban summary</code></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlackIntegration;