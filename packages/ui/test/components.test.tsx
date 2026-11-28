import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  DataTable,
  FileUploader,
  Rating,
  StatusPill,
  Stepper,
  TimeSlotGrid,
  nextSelection,
  type TimeSlot,
} from '../src';

const slots: TimeSlot[] = [
  { id: 'a', start: '18:00', end: '19:00', status: 'available', price: 30000 },
  { id: 'b', start: '19:00', end: '20:00', status: 'available', price: 35000 },
  { id: 'c', start: '20:00', end: '21:00', status: 'available', price: 35000 },
  { id: 'd', start: '21:00', end: '22:00', status: 'taken' },
];

describe('nextSelection', () => {
  it('single mode toggles one slot', () => {
    expect(nextSelection(slots, [], 'a', 'single')).toEqual(['a']);
    expect(nextSelection(slots, ['a'], 'a', 'single')).toEqual([]);
    expect(nextSelection(slots, ['a'], 'b', 'single')).toEqual(['b']);
  });
  it('range mode grows a run of back-to-back hours', () => {
    expect(nextSelection(slots, ['a'], 'b', 'range')).toEqual(['a', 'b']);
    expect(nextSelection(slots, ['b'], 'a', 'range')).toEqual(['a', 'b']);
  });
  it('range mode restarts when the slot does not touch the run', () => {
    expect(nextSelection(slots, ['a'], 'c', 'range')).toEqual(['c']);
  });
  it('tapping an end shrinks the run', () => {
    expect(nextSelection(slots, ['a', 'b', 'c'], 'c', 'range')).toEqual(['a', 'b']);
    expect(nextSelection(slots, ['a', 'b', 'c'], 'a', 'range')).toEqual(['b', 'c']);
  });
  it('ignores taken slots', () => {
    expect(nextSelection(slots, ['c'], 'd', 'range')).toEqual(['c']);
  });
});

describe('TimeSlotGrid', () => {
  it('announces state and does not select a booked time', () => {
    const onChange = vi.fn();
    render(<TimeSlotGrid slots={slots} value={['b']} onChange={onChange} />);
    expect(screen.getByRole('button', { name: /19:00 to 20:00, selected/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /21:00 to 22:00, booked/ }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /18:00 to 19:00, available/ }));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });
  it('has an empty state', () => {
    render(<TimeSlotGrid slots={[]} value={[]} onChange={() => {}} />);
    expect(screen.getByText(/No times on this day/)).toBeInTheDocument();
  });
});

describe('labels', () => {
  it('StatusPill uses the shared wording', () => {
    render(<StatusPill status="partially_refunded" />);
    expect(screen.getByText('Partly refunded')).toBeInTheDocument();
  });
  it('Rating has an accessible summary', () => {
    render(<Rating value={4.66} count={12} />);
    expect(
      screen.getByRole('img', { name: 'Rated 4.7 out of 5 from 12 reviews' }),
    ).toBeInTheDocument();
  });
  it('Rating shows New with no reviews', () => {
    render(<Rating value={0} count={0} />);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});

describe('Stepper', () => {
  it('marks the current step', () => {
    render(
      <Stepper
        steps={[
          { id: '1', label: 'Photos' },
          { id: '2', label: 'About' },
        ]}
        current={1}
      />,
    );
    expect(screen.getAllByText('About')[1]?.closest('li')).toHaveAttribute('aria-current', 'step');
  });
});

describe('DataTable', () => {
  const rows = [
    { id: '1', name: 'Court 2', amount: 300 },
    { id: '2', name: 'Court 1', amount: 500 },
  ];
  const columns = [
    { key: 'name', header: 'Court', sortValue: (r: (typeof rows)[number]) => r.name },
    { key: 'amount', header: 'Amount', sortValue: (r: (typeof rows)[number]) => r.amount },
  ];
  it('sorts by a column', () => {
    render(<DataTable caption="Bookings" columns={columns} rows={rows} rowKey={(r) => r.id} />);
    fireEvent.click(screen.getByRole('button', { name: /Court/ }));
    const cells = screen
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.textContent);
    expect(cells[0]).toContain('Court 1');
    expect(screen.getByRole('columnheader', { name: /Court/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
  });
  it('shows the empty state', () => {
    render(
      <DataTable
        caption="Bookings"
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        empty={{ title: 'No bookings yet' }}
      />,
    );
    expect(screen.getByText('No bookings yet')).toBeInTheDocument();
  });
});

describe('FileUploader', () => {
  it('rejects files over the size limit with a reason', () => {
    render(<FileUploader label="Photos" maxSizeMb={1} />);
    const input = screen.getByLabelText('Photos');
    const big = new File([new Uint8Array(2 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [big] } });
    expect(screen.getByRole('alert')).toHaveTextContent('big.jpg is over 1 MB');
  });
});
