import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * ImportCsvModal — Upload a CSV file to bulk-create records via an admin API endpoint.
 *
 * Props:
 *   open             — boolean, show/hide the modal
 *   onClose          — () => void
 *   endpoint         — API endpoint for POST (e.g. "/api/import/appointments")
 *   templateEndpoint — API endpoint for downloading a sample CSV (e.g. "/api/import/appointments/template")
 *   title            — Modal header text
 *   description      — Explanatory text shown below the header
 *   onImported       — () => void, called after a successful import
 */
export default function ImportCsvModal({ open, onClose, endpoint, templateEndpoint, title, description, onImported }) {
  const { fetchWithAuth } = useAuth();
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) { setFile(null); setResult(null); setError(''); }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) setFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetchWithAuth(endpoint, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setResult(data.results);
        toast.success(data.message);
        onImported?.();
      } else {
        setError(data.error || 'Import failed');
        toast.error(data.error || 'Import failed');
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
    setImporting(false);
  }

  async function downloadTemplate() {
    try {
      const res = await fetchWithAuth(templateEndpoint);
      if (!res.ok) { toast.error('Failed to download template'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="import-csv-modal">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} data-testid="modal-backdrop" />
      <div className="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-lg animate-scale-in">
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-warm">
          <h2 className="text-lg font-serif font-bold text-text">{title || 'Import CSV'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl text-text-muted hover:text-text hover:bg-surface-alt transition-all flex items-center justify-center" data-testid="modal-close-btn">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {description && <p className="text-sm text-text-secondary" data-testid="modal-description">{description}</p>}

          {!result ? (
            <>
              {/* File upload area */}
              <label className="block" data-testid="file-upload-label">
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary-bg/30 transition-all" data-testid="file-upload-area">
                  {file ? (
                    <div className="flex flex-col items-center gap-2" data-testid="file-selected">
                      <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="12" y2="12" /><line x1="15" y1="15" x2="12" y2="12" /></svg>
                      <p className="text-sm font-medium text-text" data-testid="file-name">{file.name}</p>
                      <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB — Click to change</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2" data-testid="file-empty">
                      <svg className="w-10 h-10 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                      <p className="text-sm font-medium text-text">Upload a CSV file</p>
                      <p className="text-xs text-text-muted">Click to browse or drag & drop</p>
                    </div>
                  )}
                  <input type="file" accept=".csv,.tsv" onChange={handleFileChange} className="hidden" data-testid="file-input" />
                </div>
              </label>

              {/* Template download */}
              {templateEndpoint && (
                <button onClick={downloadTemplate} data-testid="download-template-btn"
                  className="w-full text-center text-xs text-primary hover:text-primary-dark font-medium underline underline-offset-2 transition-colors">
                  Download sample CSV template
                </button>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-error-bg border border-red-200 rounded-xl text-sm text-error flex items-start gap-2.5" data-testid="import-error">
                  <span className="mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-surface-alt transition-all" data-testid="cancel-btn">
                  Cancel
                </button>
                <button onClick={handleImport} disabled={!file || importing}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2" data-testid="import-btn">
                  {importing ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" data-testid="import-spinner" /> Importing...</>
                  ) : 'Import CSV'}
                </button>
              </div>
            </>
          ) : (
            /* Results view */
            <div className="space-y-4" data-testid="import-results">
              <div className="flex items-center gap-3 p-4 bg-success-bg border border-green-200 rounded-xl">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-medium text-success text-sm" data-testid="result-success-count">{result.success} created successfully</p>
                  {result.failed > 0 && <p className="text-xs text-text-muted" data-testid="result-failed-count">{result.failed} failed</p>}
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  <p className="text-xs font-semibold text-error uppercase tracking-wider">Errors ({result.errors.length})</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-text-secondary bg-error-bg/50 p-2 rounded-lg" data-testid={`result-error-${i}`}>{err}</p>
                  ))}
                </div>
              )}

              <button onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all shadow-sm" data-testid="done-btn">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
