interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'inactive' | 'processing';
  label: string;
  size?: 'sm' | 'md';
}

export default function StatusIndicator({ status, label, size = 'sm' }: StatusIndicatorProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          icon: 'fas fa-circle text-success',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: 'fas fa-circle text-warning',
        };
      case 'error':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: 'fas fa-circle text-error',
        };
      case 'processing':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          icon: 'fas fa-spinner fa-spin text-primary',
        };
      case 'inactive':
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: 'fas fa-circle text-gray-400',
        };
    }
  };

  const styles = getStatusStyles();
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-0.5 text-sm';

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium ${styles.bg} ${styles.text}`}>
      <i className={`${styles.icon} mr-1`} style={{ fontSize: '6px' }}></i>
      {label}
    </span>
  );
}
