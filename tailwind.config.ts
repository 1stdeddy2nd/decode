import type { Config } from 'tailwindcss';

const config: Config = {
    content: [
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            keyframes: {
                float1: {
                    '0%, 100%': { transform: 'translate(-50px, -80px)' },
                    '50%': { transform: 'translate(80px, 100px)' },
                },
                float2: {
                    '0%, 100%': { transform: 'translate(60px, 100px)' },
                    '50%': { transform: 'translate(-40px, -80px)' },
                },
                float3: {
                    '0%, 100%': { transform: 'translate(40px, 60px)' },
                    '50%': { transform: 'translate(-30px, -60px)' },
                },
                float4: {
                    '0%, 100%': { transform: 'translate(-20px, 40px)' },
                    '50%': { transform: 'translate(20px, -40px)' },
                },
            },
            animation: {
                'floating-1': 'float1 3s ease-in-out infinite',
                'floating-2': 'float2 4s ease-in-out infinite',
                'floating-3': 'float3 5s ease-in-out infinite',
                'floating-4': 'float4 6s ease-in-out infinite',
            },
        },
    },
    plugins: [],
};

export default config;
