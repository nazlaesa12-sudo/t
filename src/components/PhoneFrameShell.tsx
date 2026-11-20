import React from 'react';

interface PhoneFrameShellProps {
  children: React.ReactNode;
  fullViewport?: boolean;
}

export const PhoneFrameShell: React.FC<PhoneFrameShellProps> = ({
  children,
  fullViewport = false,
}) => {
  const outerHeightClass = fullViewport
    ? 'min-h-screen'
    : 'min-h-[calc(100vh-56px)]';

  const frameHeightClass = fullViewport
    ? 'min-h-screen sm:min-h-0 sm:h-[min(832px,calc(100vh-40px))]'
    : 'min-h-[calc(100vh-56px)] sm:min-h-0 sm:h-[min(812px,calc(100vh-88px))]';

  return (
    <div
      className={`flex w-full ${outerHeightClass} items-stretch justify-center bg-slate-100 sm:items-center sm:px-4 sm:py-4`}
    >
      <div
        className={`flex w-full ${frameHeightClass} flex-col overflow-hidden bg-slate-50 sm:max-w-[408px] sm:rounded-[40px] sm:border-[8px] sm:border-[#0B1120] sm:shadow-2xl`}
      >
        {/* Minimal smartphone top bezel speaker/camera island on desktop */}
        <div className="hidden shrink-0 items-center justify-center bg-[#0B1120] py-2 sm:flex">
          <div className="h-3.5 w-24 rounded-full bg-slate-800/95 ring-1 ring-slate-700/60" />
        </div>

        {/* Inner scrollable app viewport */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          {children}
        </div>

        {/* Minimal bottom home-indicator strip on desktop */}
        <div className="hidden shrink-0 items-center justify-center border-t border-slate-100 bg-white py-1.5 sm:flex">
          <div className="h-1 w-28 rounded-full bg-slate-300" />
        </div>
      </div>
    </div>
  );
};
