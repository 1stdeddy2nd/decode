'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Button from './button';

interface Props {
    name?: string | null;
}

export default function Header({ name }: Props) {
    const pathname = usePathname();
    const router = useRouter();
    const [isScrolled, setIsScrolled] = useState(false);

    // Detect scroll position and update header state
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50); // Show background after scrolling 50px
        };

        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const handleRedirect = React.useCallback(
        (url: string) => {
            if (!name) router.push('/api/auth/signin')
            else router.push(url);
        },
        [router, name]
    );

    return (
        <header
            className={`
                fixed top-0 left-0 z-10 w-full py-3 px-6 flex items-center justify-between transition-all duration-300 ${isScrolled || pathname !== '/'
                    ? 'bg-white backdrop-blur-lg shadow-sm'
                    : 'bg-transparent'
                }`}
        >
            {/* Logo / Icon on the left */}
            <div className="flex items-center gap-6 text-sm">
                <Link href="/">
                    <img
                        src="/logo-black.webp"
                        alt="Logo"
                        className="w-14 h-auto"
                    />
                </Link>
            </div>

            {/* Navigation on the right */}
            <div className="flex items-center gap-4">
                <span className="text-gray-800 text-sm">Hi, {name ?? 'Guest'}!</span>
                <Button
                    size="small"
                    variant="primary-outlined"
                    className="text-gray-900"
                    onClick={() => handleRedirect(name ? '/api/auth/signout' : '/api/auth/signin')}
                >
                    {!name ? 'Login' : 'Logout'}
                </Button>
            </div>
        </header>
    );
}