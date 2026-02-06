import React, { createContext, useContext, useState, useCallback } from 'react';
import './toast.css';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove after 3s
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast toast--${toast.type} slide-in`}>
                    <div className="toast__content">
                        {toast.type === 'success' && <span className="toast__icon">✓</span>}
                        {toast.type === 'error' && <span className="toast__icon">✕</span>}
                        <span className="toast__message">{toast.message}</span>
                    </div>
                    <button className="toast__close" onClick={() => removeToast(toast.id)}>
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
};
