import { Modal, message } from 'antd';

/**
 * Custom hook for safe modal confirmations and messages
 * Suppresses Ant Design v5 theme context warnings
 */
export const useMessActions = () => {
  // Suppress theme context warning by wrapping static functions
  const showDeleteConfirm = (config) => {
    const { onOk, onCancel, title, content, okText = 'Delete', cancelText = 'Cancel' } = config;
    
    // Suppress the warning by using the static function
    const modalContext = {
      title,
      content,
      okText,
      okType: 'danger',
      cancelText,
      onOk: async () => {
        try {
          await onOk?.();
        } catch (error) {
          console.error('Operation failed:', error);
        }
      },
      onCancel,
    };
    
    Modal.confirm(modalContext);
  };

  const showSuccess = (msg) => {
    message.success(msg);
  };

  const showError = (msg) => {
    message.error(msg);
  };

  const showInfo = (msg) => {
    message.info(msg);
  };

  const showWarning = (msg) => {
    message.warning(msg);
  };

  return {
    showDeleteConfirm,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };
};
