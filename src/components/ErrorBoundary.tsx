import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("FreshPrep report error:", error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-10">
          <div className="bg-white border border-[#e5e5e5] rounded-xl p-8 max-w-md w-full shadow-sm text-center">
            <p className="text-sm font-semibold text-[#1a1a1a] mb-1">
              Something went wrong loading this report.
            </p>
            <p className="text-xs text-[#3d3d3d] mb-5">Try re-uploading your file.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onReset();
              }}
              className="px-4 py-2 bg-[#2b5346] text-white text-xs font-medium rounded-lg hover:bg-[#0d3a2f] cursor-pointer"
              style={{ transition: "background-color 150ms var(--ease-out)" }}
            >
              Start over
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
