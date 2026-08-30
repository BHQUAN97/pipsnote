-- Add Yahoo Finance (free, no API key) provider codes to all symbols.
-- Yahoo covers forex (EURUSD=X), gold/silver (GC=F, SI=F), stocks, and crypto.
-- Keeps existing provider codes, only adds the "yahoo" key.

-- forex
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'EURUSD=X') WHERE label = 'EUR/USD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'GBPUSD=X') WHERE label = 'GBP/USD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'USDJPY=X') WHERE label = 'USD/JPY';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'USDCHF=X') WHERE label = 'USD/CHF';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'AUDUSD=X') WHERE label = 'AUD/USD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'USDCAD=X') WHERE label = 'USD/CAD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'NZDUSD=X') WHERE label = 'NZD/USD';

-- commodity (gold/silver futures)
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'GC=F') WHERE label = 'XAU/USD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'SI=F') WHERE label = 'XAG/USD';

-- crypto
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'BTC-USD') WHERE label = 'BTC/USD';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'ETH-USD') WHERE label = 'ETH/USD';

-- stocks
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'AAPL') WHERE label = 'AAPL';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'TSLA') WHERE label = 'TSLA';
UPDATE market_data_symbols SET provider_codes = JSON_SET(provider_codes, '$.yahoo', 'MSFT') WHERE label = 'MSFT';

-- Register yahoo provider (free, no key). PK is provider_key (1 row per provider).
INSERT INTO market_data_provider_config (provider_key, category, is_enabled, requires_key, api_key_encrypted, api_secret_encrypted)
VALUES ('yahoo', 'forex', 1, 0, NULL, NULL)
ON DUPLICATE KEY UPDATE is_enabled = 1, requires_key = 0;