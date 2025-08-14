import React from 'react';
import {
    FaTimes,
    FaCheckCircle,
    FaTimesCircle,
    FaInfoCircle,
    FaExclamationCircle,
} from 'react-icons/fa';

interface NotificationProps {
    message: string;
    type?: 'error' | 'success' | 'info' | 'warning';
    onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({
    message,
    type = 'info',
    onClose,
}) => {
    const typeStyles = {
        success: {
            container: 'border-s-green-500 border-s-8',
            icon: <FaCheckCircle className="text-green-500" size={30} />,
            title: 'Success',
        },
        error: {
            container: 'border-s-red-500 border-s-8',
            icon: <FaTimesCircle className="text-red-500" size={30} />,
            title: 'Error',
        },
        info: {
            container: 'border-s-blue-500 border-s-8',
            icon: <FaInfoCircle className="text-blue-500" size={30} />,
            title: 'Info',
        },
        warning: {
            container: 'border-s-yellow-500 border-s-8',
            icon: <FaExclamationCircle className="text-yellow-500" size={30} />,
            title: 'Warning',
        },
    };

    const styles = React.useMemo(() => typeStyles[type], []);

    return (
        <div
            className={`px-3 pt-2 pb-4 rounded border border-gray-300 shadow-md w-80 ${styles.container}`}
        >
            <div className="flex justify-end text-xs">
                <FaTimes role="button" onClick={onClose} />
            </div>
            <div className="flex items-center gap-2" role="alert">
                {styles.icon}
                <div className="flex-1">
                    <p className="font-semibold text-md">{styles.title}</p>
                    <p className="text-xs font-light">{message}</p>
                </div>
            </div>
        </div>
    );
};

export default Notification;