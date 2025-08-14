'use client';

import React, { createContext, useState, useCallback } from 'react';
import Notification from '~/lib/components/notification';
import { AnimatePresence, motion } from 'framer-motion';

interface NotificationContextProps {
    addNotification: (
        message: string,
        type?: 'error' | 'success' | 'info' | 'warning'
    ) => void;
}

export const NotificationContext = createContext<
    NotificationContextProps | undefined
>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [notifications, setNotifications] = useState<
        {
            id: number;
            message: string;
            type: 'error' | 'success' | 'info' | 'warning';
        }[]
    >([]);

    const addNotification = useCallback(
        (
            message: string,
            type: 'error' | 'success' | 'info' | 'warning' = 'info'
        ) => {
            const id = Date.now();
            setNotifications((prev) => [...prev, { id, message, type }]);

            // setTimeout(() => {
            //   setNotifications((prev) =>
            //     prev.filter((notification) => notification.id !== id)
            //   );
            // }, 30000); // Remove notification after 30 seconds
        },
        []
    );

    const removeNotification = useCallback((id: number) => {
        setNotifications((prev) =>
            prev.filter((notification) => notification.id !== id)
        );
    }, []);

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <div className="fixed bottom-4 right-4 space-y-2 z-20" aria-live="polite">
                <AnimatePresence>
                    {notifications.map((notification) => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 100 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        >
                            <Notification
                                message={notification.message}
                                type={notification.type}
                                onClose={() => removeNotification(notification.id)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};