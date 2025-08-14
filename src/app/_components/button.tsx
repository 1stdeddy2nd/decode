'use client';

import React from 'react';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?:
    | 'primary-outlined'
    | 'primary-filled'
    | 'secondary-outlined'
    | 'secondary-filled';
    size?: 'small' | 'medium' | 'large';
    isLoading?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = (props) => {
    const {
        variant = 'primary-filled',
        size = 'medium',
        isLoading = false,
        children,
        className = '',
        ...rest
    } = props;

    const sizeStyles = {
        small: 'py-1 px-2 text-xs',
        medium: 'py-2 px-4 text-sm',
        large: 'py-3 px-6 text-base',
    };

    const baseStyles =
        'font-semibold rounded transition-colors duration-300 border-2 focus:outline-none flex items-center justify-center gap-2 leading-tight';

    const styles = React.useMemo(() => {
        switch (variant) {
            case 'primary-filled':
                return 'bg-green-600 text-white hover:bg-green-500 border-green-600';
            case 'primary-outlined':
                return 'text-green-600 border-green-600 hover:bg-green-100';
            case 'secondary-filled':
                return 'bg-gray-900 border-gray-900 hover:bg-gray-800 text-gray-100';
            case 'secondary-outlined':
                return 'border-gray-900 hover:bg-gray-200 text-gray-900';
            default:
                return 'bg-green-600 text-white hover:bg-green-500  border-green-600';
        }
    }, [variant]);

    return (
        <button
            {...rest}
            className={`${baseStyles} ${styles} ${sizeStyles[size]} ${className}`}
            disabled={isLoading || rest.disabled}
        >
            {isLoading ? (
                <span className="flex items-center">
                    <svg
                        className="animate-spin h-5 w-5 text-white mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        ></path>
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
};

export default Button;