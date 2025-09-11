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

async function createCardFromSlack(title: string, description: string, column_id: string) {
  const { data, error } = await supabase
    .from('kanban_cards')
    .insert({
      title,
      description,
      column_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
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
      requestData = await req.json();
    }
    
    const { action, isSlackWebhook, ...params } = requestData;

    // Handle Slack webhook directly
    if (isSlackWebhook) {
      const { text, channel_id, user_name } = params;
      
      if (text?.startsWith('create ')) {
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
          return new Response(JSON.stringify({ 
            response_type: "in_channel",
            text: `✅ Card "${cardTitle}" created successfully!`
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else if (text === 'summary') {
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
      }
      
      return new Response(JSON.stringify({ 
        response_type: "ephemeral",
        text: "Usage: `/kanban create [title]` or `/kanban summary`"
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});