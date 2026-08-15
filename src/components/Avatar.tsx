import { Link } from "react-router-dom";

interface AvatarProps {
  label: string;
  small?: boolean;
  to?: string;
}

export function Avatar({ label, small, to }: AvatarProps) {
  const className = `avatar${small ? " avatar-sm" : ""}`;
  if (to) {
    return (
      <Link to={to} className={className} aria-label="Compte">
        {label}
      </Link>
    );
  }
  return (
    <div className={className} aria-hidden="true">
      {label}
    </div>
  );
}
