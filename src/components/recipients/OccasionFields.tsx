import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

export type OccasionType = 'birthday' | 'anniversary';
export type OccasionValue = { birthday: string; anniversary: string };

const LABELS: Record<OccasionType, string> = { birthday: 'Birthday', anniversary: 'Anniversary' };
const TYPES: OccasionType[] = ['birthday', 'anniversary'];

type Row = { id: number; type: OccasionType; date: string };

const rowsFrom = (value: OccasionValue): Row[] => {
  const rows = TYPES.filter((t) => value[t]).map((type, id) => ({ id, type, date: value[type] }));
  return rows.length ? rows : [{ id: 0, type: 'birthday', date: '' }];
};

const valueFrom = (rows: Row[]): OccasionValue => ({
  birthday: rows.find((r) => r.type === 'birthday')?.date || '',
  anniversary: rows.find((r) => r.type === 'anniversary')?.date || '',
});

const fieldClass =
  'h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/**
 * One occasion type and one date per event. The saved value is derived only from the visible
 * rows, so switching a row's type never leaves a hidden date behind.
 */
const OccasionFields: React.FC<{ value: OccasionValue; onChange: (value: OccasionValue) => void; idPrefix: string }> = ({
  value,
  onChange,
  idPrefix,
}) => {
  // Seeded once; forms remount this (via `key`) when a different recipient loads.
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(value));

  const update = (next: Row[]) => {
    setRows(next);
    onChange(valueFrom(next));
  };

  const unusedType = TYPES.find((t) => !rows.some((r) => r.type === t));

  return (
    <fieldset className="space-y-2.5">
      <legend className="mb-1 text-sm font-medium">Occasions</legend>
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] items-end gap-2">
          <div className="min-w-0">
            <Label htmlFor={`${idPrefix}-type-${row.id}`} className="sr-only">Occasion type</Label>
            <select
              id={`${idPrefix}-type-${row.id}`}
              value={row.type}
              onChange={(e) => update(rows.map((r) => (r.id === row.id ? { ...r, type: e.target.value as OccasionType } : r)))}
              className={`${fieldClass} w-full`}
            >
              {TYPES.map((type) => (
                <option key={type} value={type} disabled={type !== row.type && rows.some((r) => r.type === type)}>
                  {LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <Label htmlFor={`${idPrefix}-date-${row.id}`} className="sr-only">{LABELS[row.type]} date</Label>
            <input
              id={`${idPrefix}-date-${row.id}`}
              type="date"
              value={row.date}
              onChange={(e) => update(rows.map((r) => (r.id === row.id ? { ...r, date: e.target.value } : r)))}
              className={`${fieldClass} w-full`}
            />
          </div>
          <button
            type="button"
            aria-label={`Remove ${LABELS[row.type].toLowerCase()}`}
            onClick={() => update(rows.length > 1 ? rows.filter((r) => r.id !== row.id) : [{ ...row, date: '' }])}
            className="u-press flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      {unusedType && (
        <button
          type="button"
          onClick={() => update([...rows, { id: Math.max(...rows.map((r) => r.id)) + 1, type: unusedType, date: '' }])}
          className="u-press inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-[#9A7848]"
        >
          <Plus className="h-4 w-4" /> Add another occasion
        </button>
      )}
    </fieldset>
  );
};

export default OccasionFields;
