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
import { z } from 'zod';

const slackChannelSchema = z.string()
  .trim()
  .min(1, "Channel is required")
  .max(80, "Channel name too long")
  .regex(/^[#@]?[\w-]+$/, "Invalid channel format");

const cardInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  column_id: z.string().min(1, "Please select a column"),
});

const SlackIntegration = () => {
  const [slackChannel, setSlackChannel] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [selectedColumn, setSelectedColumn] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSlackChannel, setInviteSlackChannel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { columns } = useKanban();

  const handleCreateCard = async () => {
    setIsLoading(true);
    try {
      // Validate input
      const validated = cardInputSchema.parse({
        title: cardTitle,
        description: cardDescription,
        column_id: selectedColumn
      });

      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'create_card',
          title: validated.title,
          description: validated.description,
          column_id: validated.column_id
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
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create card",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendBoardSummary = async () => {
    setIsLoading(true);
    try {
      // Validate input
      const validatedChannel = slackChannelSchema.parse(slackChannel);

      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'send_board_summary',
          channel: validatedChannel
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });
    } catch (error) {
      console.error('Error sending board summary:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send board summary to Slack",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInviteLink = async () => {
    if (!inviteEmail.endsWith("@recaste.com")) {
      toast({
        title: "Invalid email",
        description: "Only @recaste.com emails can be invited",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const validatedChannel = slackChannelSchema.parse(inviteSlackChannel);

      const { data, error } = await supabase.functions.invoke('slack-integration', {
        body: {
          action: 'send_invite_link',
          email: inviteEmail,
          channel: validatedChannel
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      setInviteEmail('');
      setInviteSlackChannel('');
    } catch (error) {
      console.error('Error sending invite link:', error);
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send invite link to Slack",
          variant: "destructive",
        });
      }
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
              <p><code className="bg-background px-2 py-1 rounded">/kanban [title]</code> - Create card with title only</p>
              <p><code className="bg-background px-2 py-1 rounded">/kanban [title], [description]</code> - Create card with title and description</p>
              <p><code className="bg-background px-2 py-1 rounded">/kanban [title], [description], [YYYY-MM-DD]</code> - Create complete card</p>
              <p><code className="bg-background px-2 py-1 rounded">/kanban summary</code> - Get board summary</p>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Examples:</strong>
            </p>
            <div className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300 font-mono">
              <p>• <code>/kanban Fix login bug</code></p>
              <p>• <code>/kanban Fix login bug, Critical authentication issue</code></p>
              <p>• <code>/kanban Fix login bug, Critical auth issue, 2025-01-20</code></p>
            </div>
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
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Invite Link to Slack
          </CardTitle>
          <CardDescription>
            Generate and send an invite link to a Slack channel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="Email (e.g., name@recaste.com)"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Input
            placeholder="Slack channel (e.g., #general or @username)"
            value={inviteSlackChannel}
            onChange={(e) => setInviteSlackChannel(e.target.value)}
          />
          <Button 
            onClick={handleSendInviteLink} 
            disabled={isLoading}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Invite Link
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