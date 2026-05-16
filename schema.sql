-- Atualiza tabela eventos com novos campos
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS prioridade text DEFAULT '';
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS tags text DEFAULT '[]';
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS color text DEFAULT '';

-- Garante permissões
ALTER TABLE eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE contatos DISABLE ROW LEVEL SECURITY;
GRANT ALL ON eventos TO anon;
GRANT ALL ON contatos TO anon;
