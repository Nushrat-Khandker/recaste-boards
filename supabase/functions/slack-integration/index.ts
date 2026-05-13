import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const slackBotToken = Deno.env.get('SLACK_BOT_TOKEN');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendSlackMessage(channel: string, text: string, blocks?: any[]) {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${slackBotToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      text,
      blocks
    }),
  });

  return await response.json();
}

async function createCardFromSlack(title: string, description: string, column_id: string, due_date?: string) {
  const cardData: any = {
    title,
    description,
    column_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  // Add due date if provided
  if (due_date) {
    cardData.due_date = due_date;
  }

  const { data, error } = await supabase
    .from('kanban_cards')
    .insert(cardData)
    .select()
    .single();

  if (error) {
    console.error('Error creating card:', error);
    throw error;
  }

  return data;
}

async function getBoardSummary() {
  const { data: columns, error: columnsError } = await supabase
    .from('kanban_columns')
    .select('*')
    .order('position');

  if (columnsError) throw columnsError;

  const { data: cards, error: cardsError } = await supabase
    .from('kanban_cards')
    .select('*');

  if (cardsError) throw cardsError;

  return { columns, cards };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let requestData;
    
    // Handle Slack webhook (form-encoded) vs API calls (JSON)
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Slack slash command sends form data
      const formData = await req.formData();
      requestData = {
        text: formData.get('text'),
        channel_id: formData.get('channel_id'),
        user_name: formData.get('user_name'),
        command: formData.get('command'),
        isSlackWebhook: true
      };
    } else {
      // Regular API call
      // Require an authenticated admin caller for JSON API actions.
      const authHeader = req.headers.get('Authorization') || '';
      const jwt = authHeader.replace(/^Bearer\s+/i, '');
      if (!jwt) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: 'Admin role required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      requestData = await req.json();
    }
    
    const { action, isSlackWebhook, ...params } = requestData;

    // Handle Slack webhook directly
    if (isSlackWebhook) {
      const { text, channel_id, user_name } = params;
      
      if (text === 'summary') {
        const { columns, cards } = await getBoardSummary();
        
        const summary = columns.map(column => {
          const columnCards = cards.filter(card => card.column_id === column.id);
          return `*${column.title}* (${columnCards.length} cards)\n${
            columnCards.map(card => `• ${card.title}`).join('\n')
          }`;
        }).join('\n\n');

        return new Response(JSON.stringify({ 
          response_type: "in_channel",
          text: `📋 *Kanban Board Summary*\n\n${summary || "No cards found on the board."}\n\nTotal Cards: ${cards.length} | Columns: ${columns.length}`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (text && text.trim() !== '') {
        // Parse enhanced command format: title, description, due_date
        // Examples: 
        // "Fix login bug" (title only)
        // "Fix login bug, Critical authentication issue" (title + description)  
        // "Fix login bug, Critical authentication issue, 2025-01-20" (title + description + due date)
        
        const parts = text.split(',').map((part: string) => part.trim());
        const cardTitle = parts[0];
        const cardDescription = parts[1] || `Created by ${user_name} from Slack`;
        let dueDate: string | undefined;
        
        // Parse due date if provided (support various formats)
        if (parts[2]) {
          const dateStr = parts[2];
          try {
            // Try parsing the date
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
              dueDate = parsedDate.toISOString();
            }
          } catch (e) {
            // If date parsing fails, we'll just ignore it and create the card without due date
            console.warn('Failed to parse due date:', dateStr);
          }
        }
        
        // Default to first column for simplicity
        const { data: firstColumn } = await supabase
          .from('kanban_columns')
          .select('id')
          .order('position')
          .limit(1)
          .single();
          
        if (firstColumn) {
          await createCardFromSlack(cardTitle, cardDescription, firstColumn.id, dueDate);
          
          let responseText = `✅ Card "${cardTitle}" created successfully!`;
          if (dueDate) {
            const dueDateFormatted = new Date(dueDate).toLocaleDateString();
            responseText += `\n📅 Due date: ${dueDateFormatted}`;
          }
          
          return new Response(JSON.stringify({ 
            response_type: "in_channel",
            text: responseText
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      return new Response(JSON.stringify({ 
        response_type: "ephemeral",
        text: `📋 *Kanban Slack Commands*\n\n• \`/kanban [title]\` - Create card with title only\n• \`/kanban [title], [description]\` - Create card with title and description\n• \`/kanban [title], [description], [YYYY-MM-DD]\` - Create card with title, description, and due date\n• \`/kanban summary\` - Get board overview\n\n*Examples:*\n• \`/kanban Fix login bug\`\n• \`/kanban Fix login bug, Critical authentication issue\`\n• \`/kanban Fix login bug, Critical authentication issue, 2025-01-20\``
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'create_card': {
        const { title, description, column_id } = params;
        const card = await createCardFromSlack(title, description, column_id);
        
        return new Response(JSON.stringify({ 
          success: true, 
          card,
          message: `Card "${title}" created successfully!`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_board_summary': {
        const { channel } = params;
        const { columns, cards } = await getBoardSummary();
        
        const summary = columns.map(column => {
          const columnCards = cards.filter(card => card.column_id === column.id);
          return `*${column.title}* (${columnCards.length} cards)\n${
            columnCards.map(card => `• ${card.title}`).join('\n')
          }`;
        }).join('\n\n');

        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📋 Kanban Board Summary"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: summary || "No cards found on the board."
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Total Cards: ${cards.length} | Columns: ${columns.length}`
              }
            ]
          }
        ];

        await sendSlackMessage(channel, "Kanban Board Summary", blocks);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: "Board summary sent to Slack!"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'send_invite_link': {
        const { email, channel } = params;

        // Validate @recaste.com email
        if (!email || !email.endsWith("@recaste.com")) {
          return new Response(
            JSON.stringify({ error: "Only @recaste.com emails are allowed" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate invite link using admin client
        const { data, error } = await supabase.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${supabaseUrl.replace('https://usdhemikpmbcuwearsob.supabase.co', 'https://usdhemikpmbcuwearsob.lovable.app')}/`,
          }
        });

        if (error) {
          console.error("Error generating invite:", error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const inviteLink = data.properties.action_link;

        // Send invite link to Slack
        const blocks = [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎟️ Team Invite Link"
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `An invite link has been generated for *${email}*`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🔗 *Invite Link:*\n${inviteLink}`
            }
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Share this link with the new team member to get started."
              }
            ]
          }
        ];

        await sendSlackMessage(channel, `Invite link for ${email}`, blocks);
        
        return new Response(JSON.stringify({ 
          success: true,
          message: `Invite link sent to ${channel}!`,
          inviteLink
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'webhook_handler': {
        // Handle Slack slash commands or interactive components
        const { text, channel_id, user_name } = params;
        
        if (text.startsWith('create ')) {
          const cardTitle = text.replace('create ', '').trim();
          // Default to first column for simplicity
          const { data: firstColumn } = await supabase
            .from('kanban_columns')
            .select('id')
            .order('position')
            .limit(1)
            .single();
            
          if (firstColumn) {
            await createCardFromSlack(cardTitle, `Created by ${user_name} from Slack`, firstColumn.id);
            await sendSlackMessage(channel_id, `✅ Card "${cardTitle}" created successfully!`);
          }
        } else if (text === 'summary') {
          // Trigger board summary
          await req.json(); // Re-parse for summary action
          const summaryReq = new Request(req.url, {
            method: 'POST',
            body: JSON.stringify({ action: 'send_board_summary', channel: channel_id })
          });
          // Recursive call for summary
        }
        
        return new Response(JSON.stringify({ 
          response_type: "in_channel",
          text: "Command processed!"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in slack-integration function:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});