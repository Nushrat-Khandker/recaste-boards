#!/bin/bash
# Redeploys all edge functions from GitHub to the self-hosted Mac mini instance.
# Run this after any Lovable/GitHub change to supabase/functions/.

FUNCTIONS_DIR="/Users/duthchasbd/services/kanban-chat-db-supabase/docker/volumes/functions"
REPO_RAW="https://raw.githubusercontent.com/Nushrat-Khandker/recaste-boards/main/supabase/functions"

for fn in push-notifications slack-integration generate-invite-link setup-team-profiles simple-auth; do
  echo "Deploying $fn..."
  curl -sf -o "$FUNCTIONS_DIR/$fn/index.ts" "$REPO_RAW/$fn/index.ts" && echo "  OK" || echo "  FAILED"
done

echo "Restarting edge functions container..."
docker restart supabase-edge-functions
echo "Done."
