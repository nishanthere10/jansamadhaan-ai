export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center justify-center py-12">
      <span className={`cr-spinner ${size === 'lg' ? 'cr-spinner-lg' : ''}`} />
    </div>
  );
}
