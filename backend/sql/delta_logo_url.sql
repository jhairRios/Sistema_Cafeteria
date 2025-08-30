-- Delta para asegurar columna logo_url en restaurante_config
ALTER TABLE restaurante_config ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255) NULL;
