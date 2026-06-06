interface StatusBadgeProps {
  status: number | string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 1 || status === '1' || status === 'active';
  return (
    <span className={isActive ? 'badge-success' : 'badge-danger'}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}
