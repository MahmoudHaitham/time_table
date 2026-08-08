-- Generation Logs table for admin viewing schedule generation history
CREATE TABLE IF NOT EXISTS generation_logs (
  id SERIAL PRIMARY KEY,
  user_name VARCHAR(200) NOT NULL,
  flow_type VARCHAR(20) NOT NULL,
  term_display VARCHAR(200) NOT NULL,
  electives_selected TEXT,
  core_selected TEXT,
  result_summary VARCHAR(500) NOT NULL,
  result_json JSONB,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_generated_at ON generation_logs (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_logs_flow_type ON generation_logs (flow_type);
