import React, { useState } from 'react';
import { AlertCircle, Copy, Check, ExternalLink, X, ShieldAlert } from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';

export const FirebaseRulesBanner: React.FC = () => {
  const { syncStatus } = useAcademicData();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (syncStatus !== 'error' || dismissed) {
    return null;
  }

  const firestoreRulesSnippet = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;

  const copyRules = () => {
    navigator.clipboard.writeText(firestoreRulesSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Firebase Firestore Action Required: Database in Production Mode
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                Your Firebase project (<code className="font-mono font-bold">college-dashboard-b4780</code>) was created with default locked rules (<code className="font-mono">allow read, write: if false;</code>). 
                The app is safely running using institutional offline state. To enable live cloud sync across devices, paste the security rules into your Firebase Console.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={copyRules}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied 1-Click Rule!' : 'Copy Security Rules'}
                </button>
                <a
                  href="https://console.firebase.google.com/project/college-dashboard-b4780/firestore/rules"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-medium rounded transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Firebase Rules Console
                </a>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="text-xs text-amber-800 underline hover:text-amber-900 ml-1"
                >
                  View Full Rules
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-amber-500 hover:text-amber-700 p-1"
            title="Dismiss notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Publish Firestore Security Rules
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Paste these rules into your Firebase Console at{' '}
              <a
                href="https://console.firebase.google.com/project/college-dashboard-b4780/firestore/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline"
              >
                Firestore Database &gt; Rules
              </a>{' '}
              and click <strong>Publish</strong>.
            </p>
            <pre className="flex-1 bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-auto mb-4">
              {firestoreRulesSnippet}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={copyRules}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Rules'}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
