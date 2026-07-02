import { useState } from 'react';
import Modal from './Modal';
import { Button } from './ui';
import { db } from '../db/database';
import { apiFetch } from '../api/client';
import { queryClient } from '../lib/queryClient';

interface ImportPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportPromptModal({ open, onClose }: ImportPromptModalProps) {
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const [problems, designPages, deepDives, dataModelEntities] = await Promise.all([
        db.problems.toArray(),
        db.designPages.toArray(),
        db.deepDives.toArray(),
        db.dataModelEntities.toArray(),
      ]);

      await apiFetch('/import', {
        method: 'POST',
        body: JSON.stringify({ problems, designPages, deepDives, dataModelEntities }),
      });

      queryClient.invalidateQueries();
      setDone(true);
    } catch {
      setError('Import failed. Your local data is untouched — you can try again.');
    } finally {
      setImporting(false);
    }
  }

  if (done) {
    return (
      <Modal open={open} title="Import complete" onClose={onClose}>
        <p className="text-sm text-slate-600">
          Your local problems have been imported to your account. They will now sync across all
          your devices.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} title="Import local data?" onClose={onClose}>
      <p className="text-sm text-slate-600">
        You have problems saved locally as a guest. Would you like to import them into your new
        account so you don't lose your work?
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={importing}>
          Skip
        </Button>
        <Button onClick={handleImport} disabled={importing}>
          {importing ? 'Importing…' : 'Import my problems'}
        </Button>
      </div>
    </Modal>
  );
}
