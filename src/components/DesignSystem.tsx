/**
 * FreshPrep Design System Components
 * 
 * Premium, anti-slop component library for research dashboards.
 * Based on merged Impeccable + Taste-Skill + Emil expertise.
 * 
 * Usage:
 * - Import components from this file
 * - All components respect DESIGN.md specifications
 * - Compose for complex UIs
 * - Animations are performant (transform/opacity only)
 */

import React, { ReactNode, CSSProperties } from 'react';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

export const designTokens = {
  typography: {
    fontSans:   "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSerif:  "'DM Serif Text', Georgia, serif",
    fontMono:   "'DM Mono', 'Courier New', monospace",
    scale: {
      '4xl': { size: '32px', weight: 600, lineHeight: 1.2 },
      '3xl': { size: '24px', weight: 600, lineHeight: 1.3 },
      '2xl': { size: '20px', weight: 500, lineHeight: 1.4 },
      'xl':  { size: '16px', weight: 500, lineHeight: 1.5 },
      'lg':  { size: '14px', weight: 400, lineHeight: 1.6 },
      'sm':  { size: '12px', weight: 400, lineHeight: 1.5 },
      'xs':  { size: '11px', weight: 400, lineHeight: 1.4 },
    },
  },

  colors: {
    brand:        '#2b5346',
    brandDark:    '#0d3a2f',
    brandSurface: '#eef4f1',
    gold:         '#e7bd27',
    orange:       '#e78a58',
    surface:      '#f8f7f5',
    white:        '#ffffff',
    error:        '#850b0b',
    errorSurface: '#ffd0d0',
    text:         '#1a1a1a',
    textMuted:    '#3d3d3d',
    textDisabled: '#a1a1a1',
    border:       '#e5e5e5',
    borderStrong: '#a6a7a5',
    // Backward compat — components referencing blue/neutral still work
    blue: {
      50:  '#eef4f1',
      100: '#eef4f1',
      200: '#eef4f1',
      300: '#2b5346',
      400: '#2b5346',
      500: '#0d3a2f',
    },
    neutral: {
      50:  '#f8f7f5',
      100: '#f8f7f5',
      200: '#e5e5e5',
      300: '#a6a7a5',
      500: '#a1a1a1',
      700: '#3d3d3d',
      900: '#1a1a1a',
    },
  },

  spacing: {
    0.5: '4px',
    1:   '8px',
    1.5: '12px',
    2:   '16px',
    3:   '24px',
    4:   '32px',
    5:   '40px',
    6:   '48px',
  },

  easing: {
    out:    'cubic-bezier(0.23, 1, 0.32, 1)',
    inOut:  'cubic-bezier(0.77, 0, 0.175, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// ============================================================================
// BASE COMPONENT STYLES
// ============================================================================

const baseStyles = {
  button: (variant: 'primary' | 'secondary' | 'ghost' = 'primary'): CSSProperties => {
    const variants = {
      primary: {
        backgroundColor: designTokens.colors.brand,
        color: 'white',
        border: 'none',
      },
      secondary: {
        backgroundColor: designTokens.colors.surface,
        color: designTokens.colors.text,
        border: 'none',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: designTokens.colors.brand,
        border: `1px solid ${designTokens.colors.brand}`,
      },
    };
    
    return {
      ...variants[variant],
      fontFamily: designTokens.typography.fontSans,
      fontSize: designTokens.typography.scale.lg.size,
      fontWeight: 500,
      padding: `${designTokens.spacing[1]} ${designTokens.spacing[1.5]}`,
      borderRadius: '4px',
      cursor: 'pointer',
      transition: `all 150ms ${designTokens.easing.out}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: designTokens.spacing[0.5],
      minHeight: '40px',
      minWidth: '44px',
      outline: 'none',
      '&:hover': {
        backgroundColor: variant === 'primary' ? designTokens.colors.brandDark : undefined,
      },
      '&:disabled': {
        opacity: 0.5,
        cursor: 'not-allowed',
      },
      '&:focus': {
        outline: `2px solid ${designTokens.colors.brand}`,
        outlineOffset: '2px',
      },
    } as CSSProperties;
  },

  card: (): CSSProperties => ({
    backgroundColor: 'white',
    border: `1px solid ${designTokens.colors.neutral[300]}`,
    borderRadius: '8px',
    padding: designTokens.spacing[2],
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: `box-shadow 200ms ${designTokens.easing.out}`,
  }),

  input: (): CSSProperties => ({
    fontFamily: designTokens.typography.fontSans,
    fontSize: designTokens.typography.scale.lg.size,
    padding: `${designTokens.spacing[0.5]} ${designTokens.spacing[1.5]}`,
    border: `1px solid ${designTokens.colors.neutral[300]}`,
    borderRadius: '4px',
    transition: `border-color 150ms ${designTokens.easing.out}`,
    outline: 'none',
    minHeight: '40px',
    '&:focus': {
      borderColor: designTokens.colors.brand,
      boxShadow: `0 0 0 3px ${designTokens.colors.brandSurface}`,
    },
    '&:disabled': {
      backgroundColor: designTokens.colors.neutral[50],
      color: designTokens.colors.neutral[500],
      cursor: 'not-allowed',
    },
  }),
};

// ============================================================================
// COMPONENTS
// ============================================================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}) => {
  const sizeMap = {
    sm: { padding: `4px 8px`, fontSize: '12px' },
    md: { padding: `8px 12px`, fontSize: '14px' },
    lg: { padding: `12px 16px`, fontSize: '16px' },
  };

  return (
    <button
      disabled={disabled || loading}
      style={{
        ...baseStyles.button(variant),
        ...sizeMap[size],
      }}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </button>
  );
};

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style,
  hoverable = false,
}) => (
  <div
    style={{
      ...baseStyles.card(),
      ...(hoverable && {
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
      }),
      ...style,
    }}
  >
    {children}
  </div>
);

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral' }) => {
  const variantMap = {
    success: {
      bg: 'oklch(93% 0.08 142)',
      text: 'oklch(26% 0.15 142)',
    },
    warning: {
      bg: 'oklch(94% 0.08 75)',
      text: 'oklch(36% 0.15 75)',
    },
    error: {
      bg: 'oklch(95% 0.08 28)',
      text: 'oklch(36% 0.15 28)',
    },
    neutral: {
      bg: designTokens.colors.neutral[200],
      text: designTokens.colors.neutral[700],
    },
  };

  const { bg, text } = variantMap[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${designTokens.spacing[0.5]} ${designTokens.spacing[1]}`,
        backgroundColor: bg,
        color: text,
        borderRadius: '4px',
        fontSize: designTokens.typography.scale.xs.size,
        fontWeight: 500,
        fontFamily: designTokens.typography.fontSans,
        gap: designTokens.spacing[0.5],
      }}
    >
      {children}
    </span>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: designTokens.spacing[0.5] }}>
    {label && (
      <label
        style={{
          fontFamily: designTokens.typography.fontSans,
          fontSize: designTokens.typography.scale.sm.size,
          fontWeight: 500,
          color: designTokens.colors.neutral[900],
        }}
      >
        {label}
      </label>
    )}
    <input
      style={{
        ...baseStyles.input(),
        borderColor: error ? designTokens.colors.error : designTokens.colors.neutral[300],
      }}
      {...props}
    />
    {error && (
      <span
        style={{
          fontSize: designTokens.typography.scale.xs.size,
          color: designTokens.colors.error,
          fontFamily: designTokens.typography.fontSans,
        }}
      >
        {error}
      </span>
    )}
  </div>
);

interface TableProps {
  columns: Array<{ id: string; label: string; width?: string }>;
  data: Array<Record<string, ReactNode>>;
  striped?: boolean;
}

export const Table: React.FC<TableProps> = ({ columns, data, striped = true }) => (
  <table
    style={{
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: designTokens.typography.fontSans,
      fontSize: designTokens.typography.scale.sm.size,
    }}
  >
    <thead>
      <tr
        style={{
          backgroundColor: designTokens.colors.neutral[50],
          borderBottom: `1px solid ${designTokens.colors.neutral[300]}`,
        }}
      >
        {columns.map((col) => (
          <th
            key={col.id}
            style={{
              padding: `${designTokens.spacing[1.5]} ${designTokens.spacing[2]}`,
              textAlign: 'left',
              fontWeight: 500,
              color: designTokens.colors.neutral[700],
              width: col.width,
            }}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row, i) => (
        <tr
          key={i}
          style={{
            borderBottom: `1px solid ${designTokens.colors.neutral[200]}`,
            backgroundColor: striped && i % 2 === 1 ? designTokens.colors.neutral[50] : 'white',
            transition: `background-color 150ms ${designTokens.easing.out}`,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLTableRowElement).style.backgroundColor = designTokens.colors.neutral[100];
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
              striped && i % 2 === 1 ? designTokens.colors.neutral[50] : 'white';
          }}
        >
          {columns.map((col) => (
            <td
              key={col.id}
              style={{
                padding: `${designTokens.spacing[1.5]} ${designTokens.spacing[2]}`,
                color: designTokens.colors.neutral[900],
              }}
            >
              {row[col.id]}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return (
    <div
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        border: `2px solid ${designTokens.colors.neutral[200]}`,
        borderTopColor: designTokens.colors.brand,
        borderRadius: '50%',
        animation: `spin 600ms linear infinite`,
      } as CSSProperties & { animation: string }}
    />
  );
};

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ variant = 'info', title, children }) => {
  const variantMap = {
    info: {
      bg: designTokens.colors.brandSurface,
      border: designTokens.colors.brand,
      text: designTokens.colors.brand,
    },
    success: {
      bg: 'oklch(93% 0.08 142)',
      border: 'oklch(86% 0.12 142)',
      text: 'oklch(26% 0.15 142)',
    },
    warning: {
      bg: 'oklch(94% 0.08 75)',
      border: 'oklch(86% 0.12 75)',
      text: 'oklch(36% 0.15 75)',
    },
    error: {
      bg: 'oklch(95% 0.08 28)',
      border: 'oklch(86% 0.12 28)',
      text: 'oklch(36% 0.15 28)',
    },
  };

  const style = variantMap[variant];

  return (
    <div
      style={{
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: '6px',
        padding: designTokens.spacing[2],
        color: style.text,
        fontFamily: designTokens.typography.fontSans,
        fontSize: designTokens.typography.scale.sm.size,
      }}
    >
      {title && (
        <div
          style={{
            fontWeight: 600,
            marginBottom: designTokens.spacing[0.5],
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
};

// ============================================================================
// ANIMATIONS (CSS-in-JS)
// ============================================================================

// Add this to your global styles or CSS:
const animationStyles = `
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
`;

export { animationStyles };

// ============================================================================
// UTILITY: RevealOnLoad (Emil's animation principle)
// ============================================================================

interface RevealOnLoadProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const RevealOnLoad: React.FC<RevealOnLoadProps> = ({
  children,
  delay = 0,
  duration = 200,
}) => {
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'scale(1)' : 'scale(0.98)',
        transition: `all ${duration}ms ${designTokens.easing.out}`,
      }}
    >
      {children}
    </div>
  );
};
