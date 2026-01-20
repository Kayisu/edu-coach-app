export interface ModalProps {
    isOpen: boolean;
    title: string;
    description?: string;
    variant: 'danger' | 'info' | 'warning';
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}
