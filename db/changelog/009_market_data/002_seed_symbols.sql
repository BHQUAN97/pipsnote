-- Seed danh sach symbol co dinh cho ticker (business requirement, can moi moi truong)
-- sort_order cach nhau 10 de admin reorder khong can migration moi
INSERT INTO `market_data_symbols` (`label`, `category`, `provider_codes`, `decimals`, `sort_order`) VALUES
('EUR/USD', 'forex', JSON_OBJECT('twelvedata', 'EUR/USD', 'fcs', 'EURUSD'), 4, 140),
('GBP/USD', 'forex', JSON_OBJECT('twelvedata', 'GBP/USD', 'fcs', 'GBPUSD'), 4, 130),
('USD/JPY', 'forex', JSON_OBJECT('twelvedata', 'USD/JPY', 'fcs', 'USDJPY'), 2, 120),
('USD/CHF', 'forex', JSON_OBJECT('twelvedata', 'USD/CHF', 'fcs', 'USDCHF'), 4, 100),
('AUD/USD', 'forex', JSON_OBJECT('twelvedata', 'AUD/USD', 'fcs', 'AUDUSD'), 4, 90),
('USD/CAD', 'forex', JSON_OBJECT('twelvedata', 'USD/CAD', 'fcs', 'USDCAD'), 4, 80),
('NZD/USD', 'forex', JSON_OBJECT('twelvedata', 'NZD/USD', 'fcs', 'NZDUSD'), 4, 70),
('XAU/USD', 'commodity', JSON_OBJECT('goldapi', 'XAU'), 2, 110),
('XAG/USD', 'commodity', JSON_OBJECT('goldapi', 'XAG'), 2, 60),
('BTC/USD', 'crypto', JSON_OBJECT('coingecko', 'bitcoin'), 0, 150),
('ETH/USD', 'crypto', JSON_OBJECT('coingecko', 'ethereum'), 2, 50),
('AAPL', 'stock', JSON_OBJECT('alpaca', 'AAPL'), 2, 40),
('TSLA', 'stock', JSON_OBJECT('alpaca', 'TSLA'), 2, 30),
('MSFT', 'stock', JSON_OBJECT('alpaca', 'MSFT'), 2, 20)
ON DUPLICATE KEY UPDATE
  `category` = VALUES(`category`),
  `provider_codes` = VALUES(`provider_codes`),
  `decimals` = VALUES(`decimals`);
