import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { IoMdClose } from 'react-icons/io';

interface ModalProps {
    title?: string;
    children: ReactNode;
    isOpen: boolean;
    onClose: () => void;
    size?: 'sm' | 'lg' | 'xl';
}

const sizeClasses = {
    sm: 'max-w-sm',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
};

const Modal: React.FC<ModalProps> = ({ title, children, isOpen, onClose, size = 'lg' }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                modalRef.current &&
                !modalRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeydown);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeydown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeydown);
        };
    }, [isOpen, onClose]);

    if (!isVisible && !isOpen) return null;

    return (
        <>
            <div
                className={`fixed inset-0 bg-gray-800/50 dark:bg-gray-950/60 transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                aria-hidden={!isOpen}
            />

            <div
                className={`fixed inset-0 flex items-center justify-center z-50 transition-all duration-300 ease-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                aria-modal={isOpen}
                role="dialog"
            >
                <div
                    ref={modalRef}
                    tabIndex={-1}
                    className={`bg-gray-100 dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full ${sizeClasses[size]} transform transition-transform duration-300 ease-out`}
                >
                    <div className="flex justify-between items-center mb-4">
                        {title && <h2 className="text-xl font-semibold">{title}</h2>}
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition"
                        >
                            <IoMdClose size={24} />
                        </button>
                    </div>
                    <div className="mb-4">{children}</div>
                </div>
            </div>
        </>
    );
};

export default Modal;
