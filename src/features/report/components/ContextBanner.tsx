import React from "react";
import { Info } from "lucide-react";

interface ContextBannerProps {
  title: string;
  message: string;
}

export function ContextBanner({ title, message }: ContextBannerProps): React.ReactElement {
  return (
    <div className="flex items-start gap-3 bg-[#fdf8e1] border border-[#e7bd27]/40 rounded-xl px-4 py-3.5">
      <Info className="w-3.5 h-3.5 text-[#8a6f00] shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-[#8a6f00]">{title}</p>
        <p className="text-xs text-[#3d3d3d] mt-0.5 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
