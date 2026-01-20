import { useState, useCallback } from 'react';
import { Modal } from '../components/Modal';

/**
 * Specialized hook for handling deletion flows.
 * @returns {{
 *   requestDelete: (item: any) => void,
 *   DeleteModal: React.ReactElement
 * }}
 */
export const useDeleteConfirm = ({ onDelete, itemName = 'item' }) => {
  const [itemToDelete, setItemToDelete] = useState(null);

  const requestDelete = useCallback((item) => {
    setItemToDelete(item);
  }, []);

  const handleConfirm = useCallback(() => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setItemToDelete(null);
    }
  }, [itemToDelete, onDelete]);

  const handleCancel = useCallback(() => {
    setItemToDelete(null);
  }, []);

  const DeleteModal = (
    <Modal
      isOpen={!!itemToDelete}
      title={`Delete ${itemName}?`}
      description={itemToDelete ? `Are you sure you want to delete "${itemToDelete.name || 'this item'}"? This action cannot be undone.` : ''}
      variant="danger"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { requestDelete, DeleteModal };
};
