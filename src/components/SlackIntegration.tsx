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
            <MessageSquare className="h-5 w-5" />
            Slack Commands
          </CardTitle>
          <CardDescription>
            Use these commands in your Slack workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="font-medium">Available Commands:</p>
            <div className="space-y-1 text-sm">
              <p><code className="bg-background px-2 py-1 rounded">/kanban [title]</code> - Create a new card</p>
              <p><code className="bg-background px-2 py-1 rounded">/kanban summary</code> - Get board summary</p>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Example:</strong> Type <code>/kanban Fix login bug</code> in Slack to create a new card
            </p>
          </div>
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
          <p>4. Set up slash command with URL: <code>https://usdhemikpmbcuwearsob.supabase.co/functions/v1/slack-integration</code></p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlackIntegration;