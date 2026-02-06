import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable Modal component using a Portal for accessibility and stacking context.
 * Features: Backbone blur, smooth transitions, variant styling, keyboard support.
 * @param {import('../types/modal').ModalProps} props
 */
export const Modal = ({
  isOpen,
  title,
  description,
  variant = 'info',
  size = 'medium', // small, medium, large
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  children,
  footer
}) => {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 200); // 200ms match transition
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
    }
  }, [isOpen]); // onCancel'ı buradan çıkar

  if (!visible) return null;

  // Icons based on variant
  const getIcon = () => {
    if (variant === 'danger') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12" y2="16.01" />
        </svg>
      );
    }
    // Default info/warning icon
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    );
  };

  const backdropStyle = {
    opacity: animating ? 1 : 0,
    transition: 'opacity 200ms ease-out',
  };

  const panelStyle = {
    opacity: animating ? 1 : 0,
    transform: animating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
    transition: 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    width: size === 'large' ? '1024px' : size === 'small' ? '400px' : '600px', // Standardized sizes
    maxWidth: size === 'large' ? '90vw' : '95vw',
    maxHeight: size === 'large' ? '85vh' : '90vh', // Ensure it fits in 4:3 screens
    display: 'flex',
    flexDirection: 'column',
  };

  return createPortal(
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div
        className="dialog__backdrop"
        style={backdropStyle}
        onClick={onCancel}
      />
      <div className={`dialog__panel ${variant === 'danger' ? 'dialog__panel--elevated' : ''}`} style={panelStyle}>
        <div className="dialog__header">
          <div className={`dialog__icon dialog__icon--${variant}`}>
            {getIcon()}
          </div>
          <div className="dialog__header-text">
            <div className="dialog__title" id="modal-title">{title}</div>
          </div>
        </div>

        <div className="dialog__body">
          {children || description}
        </div>

        <div className="dialog__actions">
          {footer ? footer : (
            <>
              <button className="btn btn--ghost" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                className={`btn ${variant === 'danger' ? 'btn--danger' : ''}`}
                onClick={() => onConfirm && onConfirm()}
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
