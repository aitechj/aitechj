CREATE INDEX CONCURRENTLY IF NOT EXISTS ai_conversations_user_created_idx 
ON ai_conversations (user_id, created_at DESC);
