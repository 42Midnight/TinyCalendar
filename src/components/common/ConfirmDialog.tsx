import Modal from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} width="360px">
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
        {message}
      </p>
      <div
        className="flex justify-end gap-2 mt-5"
        style={{ paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}
      >
        <button className="btn btn-secondary" onClick={onClose}>
          {cancelText}
        </button>
        <button
          className={danger ? 'btn btn-danger' : 'btn btn-primary'}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
