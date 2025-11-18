// 공통 스타일 상수
export const COMMON_STYLES = {
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },
  colors: {
    error: {
      background: '#fee',
      border: '#fcc',
      text: '#c33',
    },
    warning: {
      background: '#fff3cd',
      border: '#ffc107',
      text: '#856404',
    },
    info: {
      background: '#d1ecf1',
      border: '#bee5eb',
      text: '#0c5460',
    },
    success: {
      background: '#d4edda',
      border: '#c3e6cb',
      text: '#155724',
    },
    neutral: {
      background: '#f8f9fa',
      border: '#dee2e6',
      text: '#333',
    },
  },
  layout: {
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem',
    },
    card: {
      padding: '1rem',
      backgroundColor: '#fff',
      borderRadius: '6px',
      border: '1px solid #dee2e6',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    errorBox: {
      padding: '1rem',
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '6px',
      marginBottom: '2rem',
      color: '#c33',
    },
    warningBox: {
      padding: '1rem',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '6px',
      color: '#856404',
      marginBottom: '1rem',
    },
  },
  typography: {
    heading: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      margin: 0,
      color: '#1a1a1a',
    },
    subheading: {
      fontSize: '1.2rem',
      fontWeight: '600',
      color: '#333',
    },
    body: {
      fontSize: '1rem',
      color: '#333',
      lineHeight: '1.6',
    },
    small: {
      fontSize: '0.9rem',
      color: '#666',
    },
  },
} as const;

