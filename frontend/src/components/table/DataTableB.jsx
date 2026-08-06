import { DataTable, DataTableIdentity } from './DataTable';
import { useMemo } from 'react';
import { useTable } from 'react-table';
import CreateButton from '../buttons/CreateButton';

export const DataTableB = ({ columns, data, identity }) => {
  const memoizedColumns = useMemo(() => columns, [columns]);
  const memoizedData = useMemo(() => data, [data]);
}
