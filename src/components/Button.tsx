import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "warning";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white font-bold",
  secondary: "bg-page border border-line text-ink font-semibold",
  ghost: "bg-transparent text-ink-2 font-semibold",
  danger: "bg-danger text-white font-bold",
  success: "bg-success text-ink font-bold",
  warning: "bg-warn text-ink font-bold",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-xs py-2 px-3",
  md: "text-sm py-3 px-4",
  lg: "text-base py-3.5 px-5",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`rounded-xl min-w-[44px] min-h-[44px] inline-flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? "w-full" : ""} ${isDisabled ? "opacity-50 cursor-not-allowed active:scale-100" : ""} ${className}`.trim()}
        {...rest}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
