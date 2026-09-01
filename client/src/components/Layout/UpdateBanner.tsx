import React, { useState } from 'react';
import { Sparkles, Download, X } from 'lucide-react';
import { AppUpdateInfo } from '../../types';

interface UpdateBannerProps {
  updateInfo: AppUpdateInfo | null;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ updateInfo }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!updateInfo || !updateInfo.updateAvailable || dismissed) {
    return null;
  }

  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank');
    }
  };

  return (
    <div className="relative z-50 bg-zinc-900 border-b border-zinc-700/80 px-4 py-2 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-white border border-zinc-700">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
              v{updateInfo.latestVersion} Available
            </span>
            <span className="text-zinc-300 truncate max-w-md hidden sm:inline">
              {updateInfo.releaseNotes || 'A new update is ready with improvements & fixes.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {updateInfo.downloadUrl && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow transition-all hover:scale-105 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Update</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-zinc-400 hover:text-white rounded-md hover:bg-zinc-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
