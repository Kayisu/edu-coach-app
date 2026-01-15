import React, { useEffect, useRef } from 'react';

// Reusable, styled confirm dialog with danger accent and escape-to-close.
export const ConfirmDialog = ({
  open,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmTone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="dialog" role="alertdialog" aria-modal="true">
      <div className="dialog__backdrop" onClick={onCancel} />
      <div className="dialog__panel dialog__panel--elevated">
        <div className="dialog__header">
          <div className={`dialog__icon dialog__icon--${confirmTone}`} aria-hidden>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="8" cy="11.2" r="0.8" fill="currentColor"/>
            </svg>
          </div>
          <div className="dialog__header-text">
            <div className="dialog__eyebrow">Heads up</div>
            <div className="dialog__title">{title}</div>
          </div>
        </div>
        <div className="dialog__body">{message}</div>
        {detail ? <div className="dialog__detail">{detail}</div> : null}
        <div className="dialog__actions">
          <button className="btn btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button
            ref={confirmRef}
            className={`btn ${confirmTone === 'danger' ? 'btn--danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
