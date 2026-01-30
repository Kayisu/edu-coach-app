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
  const [customConfig, setCustomConfig] = useState({});

  const requestDelete = useCallback((item, config = {}) => {
    setItemToDelete(item);
    setCustomConfig(config); // { description, title, warning }
  }, []);

  const handleConfirm = useCallback(() => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setItemToDelete(null);
      setCustomConfig({});
    }
  }, [itemToDelete, onDelete]);

  const handleCancel = useCallback(() => {
    setItemToDelete(null);
    setCustomConfig({});
  }, []);

  // Determine message
  const defaultDesc = itemToDelete ? `Are you sure you want to delete "${itemToDelete.name || 'this item'}"? This action cannot be undone.` : '';
  const description = customConfig.description || defaultDesc;
  const warning = customConfig.warning;

  const DeleteModal = (
    <Modal
      isOpen={!!itemToDelete}
      title={customConfig.title || `Delete ${itemName}?`}
      description={
        <div className="stack" style={{ gap: 12 }}>
          <div>{description}</div>
          {warning && (
            <div className="callout callout--danger" style={{ fontSize: 13 }}>
              <strong>Warning:</strong> {warning}
            </div>
          )}
        </div>
      }
      variant="danger"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { requestDelete, DeleteModal };
};
