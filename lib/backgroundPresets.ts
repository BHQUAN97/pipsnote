export interface BackgroundPreset {
  id: string;
  url: string;
  label: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'finance-book',
    url: '/images/backgrounds/finance-book-worldmap.jpg',
    label: 'Sách & bản đồ tài chính',
  },
  {
    id: 'bull-market',
    url: '/images/backgrounds/bull-market-gold-oil.jpg',
    label: 'Bull thị trường',
  },
  {
    id: 'candlestick-blue',
    url: '/images/backgrounds/candlestick-uptrend-blue.jpg',
    label: 'Nến xanh tăng trưởng',
  },
  {
    id: 'gold-oil-cash',
    url: '/images/backgrounds/gold-oil-cash-coins.jpg',
    label: 'Vàng - dầu - tiền mặt',
  },
];
