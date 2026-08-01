export default function RiskDisclaimer({ siteName = 'PIPSNOTE' }: { siteName?: string }) {
  return (
    <p className="text-xs leading-relaxed text-gray-mid">
      <strong>Risk warning:</strong> Leveraged forex and CFD trading carries a high risk of
      capital loss and may not be suitable for all investors. Content on {siteName} is for
      informational purposes only and is not investment advice. {siteName} may receive
      affiliate commissions from some of the brokers listed on this site.
    </p>
  );
}
