import React, { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { exportToCSV, exportToExcel, type ExportRow } from '../lib/exportUtils';

interface ExportDropdownProps {
  data: ExportRow[];
  filename?: string;
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  data,
  filename = 'export',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (type: 'excel' | 'csv' | 'pdf') => {
    setIsOpen(false);
    if (type === 'excel') {
      exportToExcel(data, filename);
    } else if (type === 'csv') {
      exportToCSV(data, `${filename}.csv`);
    } else if (type === 'pdf') {
      window.print();
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
        style={{
          background: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)';
          e.currentTarget.style.color = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.color = 'var(--text-main)';
        }}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-44 rounded-xl shadow-xl border py-1.5 z-50 animate-fadeIn"
          style={{
            background: 'var(--card-bg)',
            borderColor: 'var(--border-color)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
          }}
        >
          <button
            onClick={() => handleExport('excel')}
            className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition"
            style={{ color: 'var(--text-main)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export as Excel (.xls)</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition"
            style={{ color: 'var(--text-main)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Export as CSV</span>
          </button>

          <div className="my-1 border-t" style={{ borderColor: 'var(--border-color)' }} />

          <button
            onClick={() => handleExport('pdf')}
            className="w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition"
            style={{ color: 'var(--text-main)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Printer className="w-4 h-4 text-neutral-500" />
            <span>Export as PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};
