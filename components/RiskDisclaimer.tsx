export default function RiskDisclaimer({ siteName = 'PIPSNOTE' }: { siteName?: string }) {
  return (
    <p className="text-xs leading-relaxed text-gray-mid">
      <strong>Cảnh báo rủi ro:</strong> Giao dịch forex và CFD có sử dụng đòn bẩy tiềm ẩn rủi ro
      mất vốn cao và có thể không phù hợp với mọi nhà đầu tư. Nội dung trên {siteName} chỉ mang
      tính chất tham khảo, không phải lời khuyên đầu tư. {siteName} có thể nhận hoa hồng giới
      thiệu (affiliate) từ một số sàn giao dịch được liệt kê trên trang.
    </p>
  );
}
