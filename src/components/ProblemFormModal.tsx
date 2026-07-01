import { useEffect, useState } from 'react';
import Modal from './Modal';
import { Button, Field, inputClass } from './ui';
import type { Difficulty, Problem } from '../db/types';
import { createProblem, updateProblem } from '../db/repository';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided, the form edits this problem instead of creating one. */
  problem?: Problem;
  onCreated?: (id: string) => void;
}

const difficulties: Difficulty[] = ['', 'Junior', 'Mid-Level', 'Senior'];

export default function ProblemFormModal({ open, onClose, problem, onCreated }: Props) {
  const isEdit = Boolean(problem);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('');
  const [constraints, setConstraints] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(problem?.title ?? '');
    setDescription(problem?.description ?? '');
    setDifficulty(problem?.difficulty ?? '');
    setConstraints(problem?.constraints ?? '');
    setNotes(problem?.notes ?? '');
  }, [open, problem]);

  async function handleSave() {
    if (isEdit && problem) {
      await updateProblem(problem.id, { title, description, difficulty, constraints, notes });
    } else {
      const created = await createProblem({ title, description, difficulty, constraints, notes });
      onCreated?.(created.id);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit problem' : 'New problem'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{isEdit ? 'Save changes' : 'Create problem'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title">
          <input
            autoFocus
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Design a URL Shortener"
          />
        </Field>
        <Field label="Description">
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="One or two sentences describing the problem."
          />
        </Field>
        <Field label="Difficulty">
          <select
            className={inputClass}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
          >
            {difficulties.map((d) => (
              <option key={d || 'none'} value={d}>
                {d || 'No level'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Constraints">
          <textarea
            className={inputClass}
            rows={2}
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="Scale, traffic assumptions, limits…"
          />
        </Field>
        <Field label="Notes / extra context">
          <textarea
            className={inputClass}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth remembering."
          />
        </Field>
      </div>
    </Modal>
  );
}
