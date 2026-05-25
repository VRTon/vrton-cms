import React, { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type ButtonVariant = 'primary' | 'secondary' | 'accent'

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  href?: string
  external?: boolean
  onClick?: () => void
  className?: string
}

function Button({
  children,
  variant = 'primary',
  href,
  external = true,
  onClick,
  className = '',
  ...props
}: ButtonProps) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'btn btn-primary',
    secondary: 'btn btn-secondary',
    accent: 'btn btn-accent',
  };

  const classes = `${variantClasses[variant]} ${className}`.trim();

  if (href) {
    const isExternalHref = /^https?:\/\//.test(href);

    if (!external) {
      return (
        <Link to={href} className={classes} {...props as unknown as Record<string, unknown>}>{children}</Link>
      );
    }

    if (!isExternalHref) {
      return (
        <a href={href} className={classes} {...props as unknown as Record<string, unknown>}>{children}</a>
      );
    }

    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props as unknown as Record<string, unknown>}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={classes} {...props as unknown as Record<string, unknown>}>
      {children}
    </button>
  );
}

export default Button;