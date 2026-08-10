interface MetricCardProps {
  label: string;
  value: string;
  trend: string;
}

export function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <article className="metric-card card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{trend}</small>
    </article>
  );
}
