interface StatusDotProps {
  online: boolean;
  label: string;
}

export function StatusDot({ online, label }: StatusDotProps) {
  return (
    <div className="topbar-status">
      <span className={`status-dot${online ? " online" : ""}`} />
      <span>{label}</span>
    </div>
  );
}
