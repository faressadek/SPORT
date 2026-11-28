'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Skeleton } from './skeleton';
import { EmptyState, ErrorState } from './states';

export interface Column<Row> {
  key: string;
  header: string;
  /** Cell content. Defaults to `row[key]`. */
  cell?: (row: Row) => ReactNode;
  /** Value used for sorting; enables the sort button. */
  sortValue?: (row: Row) => string | number;
  align?: 'start' | 'end';
  /** Hide on phones' stacked layout (keep the card short). */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: { title: string; description?: string; action?: ReactNode };
  /** Makes a row open something (booking detail, application review). */
  onRowClick?: (row: Row) => void;
  /** Actions per row, shown at the end. */
  rowActions?: (row: Row) => ReactNode;
  /** Show the caption visually. */
  showCaption?: boolean;
  className?: string;
}

type Sort = { key: string; dir: 'asc' | 'desc' } | null;

/**
 * Lists for dashboards and SPORT Admin. A real table from 640px; on phones
 * each row becomes a small card with label/value pairs.
 */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  empty = { title: 'Nothing here yet' },
  onRowClick,
  rowActions,
  showCaption,
  className,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState<Sort>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const r =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null,
    );

  const render = (c: Column<Row>, row: Row): ReactNode =>
    c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? '');

  if (error)
    return (
      <ErrorState
        title="This list didn't load"
        description={error}
        onRetry={onRetry}
        className={className}
      />
    );

  if (loading) {
    return (
      <div role="status" className={cn('flex flex-col gap-2', className)}>
        <span className="sr-only">Loading {caption}…</span>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty.title}
        description={empty.description}
        action={empty.action}
        className={className}
      />
    );
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <table className="w-full border-collapse text-sm">
        <caption
          className={cn(
            showCaption ? 'px-4 py-3 text-start font-display text-xl font-extrabold' : 'sr-only',
          )}
        >
          {caption}
        </caption>
        <thead className="hidden bg-sunken sm:table-header-group">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn(
                    'px-4 py-2 font-semibold text-ink-muted',
                    c.align === 'end' ? 'text-end' : 'text-start',
                    c.className,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-sm px-2 hover:bg-surface hover:text-ink"
                    >
                      {c.header}
                      {active ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
            {rowActions ? (
              <th scope="col" className="px-4 py-2 text-end">
                <span className="sr-only">Actions</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'flex flex-col gap-1 px-4 py-3 sm:table-row sm:p-0',
                onRowClick && 'cursor-pointer hover:bg-sunken/60',
              )}
            >
              {columns.map((c, ci) => (
                <td
                  key={c.key}
                  className={cn(
                    'flex items-baseline justify-between gap-4 text-ink sm:table-cell sm:px-4 sm:py-3',
                    c.align === 'end' ? 'sm:text-end' : 'sm:text-start',
                    c.hideOnMobile && 'hidden',
                    ci === 0 && 'font-semibold',
                    c.className,
                  )}
                >
                  {ci > 0 ? (
                    <span className="text-xs text-ink-muted sm:hidden" aria-hidden>
                      {c.header}
                    </span>
                  ) : null}
                  {ci === 0 && onRowClick ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRowClick(row);
                      }}
                      className="min-h-11 text-start font-semibold underline-offset-4 hover:underline"
                    >
                      {render(c, row)}
                    </button>
                  ) : (
                    <span>{render(c, row)}</span>
                  )}
                </td>
              ))}
              {rowActions ? (
                <td
                  className="flex justify-end gap-1 pt-1 sm:table-cell sm:px-4 sm:py-2 sm:text-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {rowActions(row)}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
