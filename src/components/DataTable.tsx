import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Hash, Type, ToggleLeft, Key, ArrowUpDown } from 'lucide-react';
import { ColumnInfo } from '../types/dataset';
import { isMissing } from '../utils/dataProcessing';

interface DataTableProps {
  rows: Record<string, any>[];
  columns?: ColumnInfo[];
  title?: string;
  subtitle?: string;
  defaultPageSize?: number;
  highlightColumns?: string[];
  droppedColumns?: string[];
  maxHeight?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  columns,
  title = 'Dataset Preview',
  subtitle,
  defaultPageSize = 10,
  highlightColumns = [],
  droppedColumns = [],
  maxHeight = 'max-h-[480px]'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const columnNames = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns.map((c) => c.name);
    }
    if (rows && rows.length > 0) {
      return Object.keys(rows[0]);
    }
    return [];
  }, [columns, rows]);

  const columnTypeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (columns) {
      columns.forEach((c) => map.set(c.name, c.type));
    }
    return map;
  }, [columns]);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();

    return rows.filter((row) =>
      Object.values(row).some((val) => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [rows, searchTerm]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortCol) return filteredRows;

    return [...filteredRows].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortAsc ? numA - numB : numB - numA;
      }

      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredRows, sortCol, sortAsc]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(colName);
      setSortAsc(true);
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'numeric':
        return <Hash className="w-3 h-3 text-blue-500" />;
      case 'categorical':
        return <Type className="w-3 h-3 text-purple-500" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3 text-emerald-500" />;
      case 'id':
        return <Key className="w-3 h-3 text-slate-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-200 text-slate-700 rounded-md">
              {rows.length} total rows
            </span>
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44"
            />
          </div>

          {/* Rows per page selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className={`overflow-x-auto overflow-y-auto ${maxHeight}`}>
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
            <tr>
              <th className="py-2.5 px-3 font-semibold text-slate-500 text-[11px] w-12 text-center bg-slate-50">
                #
              </th>
              {columnNames.map((col) => {
                const type = columnTypeMap.get(col);
                const isHighlighted = highlightColumns.includes(col);
                const isDropped = droppedColumns.includes(col);

                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`py-2.5 px-3.5 font-semibold text-slate-700 text-[11px] cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap ${
                      isHighlighted ? 'bg-indigo-50/70 text-indigo-900' : ''
                    } ${isDropped ? 'line-through text-slate-400' : ''}`}
                  >
                    <div className="flex items-center space-x-1.5">
                      {getTypeIcon(type)}
                      <span className="font-mono">{col}</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columnNames.length + 1} className="py-8 text-center text-slate-400 font-sans">
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const rowNum = (currentPage - 1) * pageSize + idx + 1;
                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-sans text-[11px] bg-slate-50/30">
                      {rowNum}
                    </td>
                    {columnNames.map((col) => {
                      const val = row[col];
                      const missing = isMissing(val);
                      const isNegativeNum = typeof val === 'number' && val < 0;

                      return (
                        <td
                          key={col}
                          className={`py-2 px-3.5 whitespace-nowrap text-slate-700 ${
                            highlightColumns.includes(col) ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          {missing ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              null
                            </span>
                          ) : isNegativeNum ? (
                            <span className="text-rose-600 font-semibold bg-rose-50 px-1 rounded">
                              {val}
                            </span>
                          ) : typeof val === 'number' ? (
                            // Format float numbers nicely
                            Number.isInteger(val) ? val : Number(val.toFixed(4))
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-white">
        <div>
          Showing <span className="font-semibold text-slate-700">{paginatedRows.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * pageSize, sortedRows.length)}
          </span>{' '}
          of <span className="font-semibold text-slate-700">{sortedRows.length}</span> rows
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 text-xs font-medium text-slate-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
