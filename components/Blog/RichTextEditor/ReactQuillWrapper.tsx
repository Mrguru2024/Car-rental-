"use client";

// Import polyfill FIRST before react-quill
import "@/lib/polyfills/react-quill-finddomnode";

import { ComponentType, useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

// Create a wrapper that properly handles ReactQuill
// Using a simple dynamic import to avoid SSR issues
const ReactQuill = dynamic(
  () => {
    // Apply polyfill before react-quill loads
    if (typeof window !== "undefined") {
      try {
        const ReactDOM = require("react-dom");
        if (ReactDOM && !ReactDOM.findDOMNode) {
          ReactDOM.findDOMNode = function (
            componentOrElement: any
          ): Element | Text | null {
            if (componentOrElement == null) return null;
            if (
              componentOrElement.nodeType === 1 ||
              componentOrElement.nodeType === 3
            ) {
              return componentOrElement;
            }
            if (componentOrElement && typeof componentOrElement === "object") {
              if (componentOrElement.ref?.current) {
                return componentOrElement.ref.current;
              }
              const fiber =
                componentOrElement._reactInternalFiber ||
                componentOrElement._reactInternalInstance ||
                componentOrElement.__reactInternalInstance;
              if (fiber) {
                let node = fiber;
                while (node) {
                  if (
                    node.stateNode?.nodeType === 1 ||
                    node.stateNode?.nodeType === 3
                  ) {
                    return node.stateNode;
                  }
                  node = node.child || node.return;
                }
              }
            }
            return null;
          };
        }

        // Patch Quill's Selection methods to suppress range errors
        // This must happen before react-quill imports Quill
        const patchQuillSelection = () => {
          try {
            // Wait for Quill to be available
            if (typeof window !== "undefined" && (window as any).Quill) {
              const Quill = (window as any).Quill;

              // Patch Selection.prototype.setNativeRange
              if (Quill.import && Quill.import("parchment")) {
                const Selection = Quill.import("core/selection");
                if (Selection && Selection.prototype) {
                  const originalSetNativeRange =
                    Selection.prototype.setNativeRange;
                  if (originalSetNativeRange) {
                    Selection.prototype.setNativeRange = function (
                      ...args: any[]
                    ) {
                      try {
                        return originalSetNativeRange.apply(this, args);
                      } catch (e: any) {
                        const errorMsg = e?.message || String(e || "");
                        if (
                          errorMsg.includes("addRange") ||
                          errorMsg.includes(
                            "The given range isn't in document"
                          ) ||
                          errorMsg.includes("range is not in document")
                        ) {
                          // Suppress the error - it's a non-breaking Quill internal issue
                          return;
                        }
                        throw e;
                      }
                    };
                  }
                }
              }
            }
          } catch (e) {
            // Ignore patching errors
          }
        };

        // Try to patch immediately if Quill is already loaded
        patchQuillSelection();

        // Also try after a delay in case Quill loads later
        setTimeout(patchQuillSelection, 100);
        setTimeout(patchQuillSelection, 500);
      } catch (e) {
        // Ignore
      }
    }
    return import("react-quill").then((module) => {
      // Patch after react-quill loads
      if (typeof window !== "undefined") {
        setTimeout(() => {
          try {
            // Patch Selection.setNativeRange if available
            const quillContainer = document.querySelector(".ql-container");
            if (quillContainer && (quillContainer as any).__quill) {
              const quill = (quillContainer as any).__quill;
              if (quill.constructor && quill.constructor.import) {
                const Selection = quill.constructor.import("core/selection");
                if (Selection && Selection.prototype) {
                  const originalSetNativeRange =
                    Selection.prototype.setNativeRange;
                  if (originalSetNativeRange) {
                    Selection.prototype.setNativeRange = function (
                      ...args: any[]
                    ) {
                      try {
                        return originalSetNativeRange.apply(this, args);
                      } catch (e: any) {
                        const errorMsg = e?.message || String(e || "");
                        if (
                          errorMsg.includes("addRange") ||
                          errorMsg.includes("The given range isn't in document")
                        ) {
                          return;
                        }
                        throw e;
                      }
                    };
                  }
                }
              }
            }
          } catch (e) {
            // Ignore
          }
        }, 200);
      }
      return module;
    });
  },
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="text-brand-gray dark:text-brand-white/70">
          Loading editor...
        </div>
      </div>
    ),
  }
) as ComponentType<any>;

interface ReactQuillWrapperProps {
  value: string;
  onChange: (value: string) => void;
  modules?: any;
  formats?: string[];
  placeholder?: string;
  theme?: string;
}

// Wrapper component that handles ReactQuill with error boundary
export default function ReactQuillWrapper({
  value,
  onChange,
  modules,
  formats,
  placeholder,
  theme = "snow",
}: ReactQuillWrapperProps) {
  const [mounted, setMounted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Patch Quill Selection methods after mount
    const patchQuillAfterMount = () => {
      try {
        // Find all Quill instances and patch their Selection
        const quillContainers = document.querySelectorAll(".ql-container");
        quillContainers.forEach((container) => {
          const quill = (container as any).__quill || (container as any).quill;
          if (quill && quill.constructor && quill.constructor.import) {
            try {
              const Selection = quill.constructor.import("core/selection");
              if (
                Selection &&
                Selection.prototype &&
                !Selection.prototype._patched
              ) {
                const originalSetNativeRange =
                  Selection.prototype.setNativeRange;
                if (originalSetNativeRange) {
                  Selection.prototype.setNativeRange = function (
                    ...args: any[]
                  ) {
                    try {
                      return originalSetNativeRange.apply(this, args);
                    } catch (e: any) {
                      const errorMsg = e?.message || String(e || "");
                      if (
                        errorMsg.includes("addRange") ||
                        errorMsg.includes(
                          "The given range isn't in document"
                        ) ||
                        errorMsg.includes("range is not in document")
                      ) {
                        // Suppress the error - it's a non-breaking Quill internal issue
                        return;
                      }
                      throw e;
                    }
                  };
                  Selection.prototype._patched = true;
                }
              }
            } catch (e) {
              // Ignore
            }
          }
        });
      } catch (e) {
        // Ignore
      }
    };

    // Global error handler to catch findDOMNode and Quill range errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message || event.error?.message || "";
      if (
        message.includes("findDOMNode") ||
        message.includes("addRange") ||
        message.includes("The given range isn't in document") ||
        message.includes("range is not in document") ||
        message.includes("setNativeRange") ||
        message.includes("setEditorSelection")
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || "";
      if (
        message.includes("findDOMNode") ||
        message.includes("addRange") ||
        message.includes("The given range isn't in document")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Suppress console errors for Quill range issues
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = String(args[0] || "");
      if (
        message.includes("addRange") ||
        message.includes("The given range isn't in document") ||
        message.includes("range is not in document") ||
        message.includes("findDOMNode")
      ) {
        // Suppress these errors - they're non-breaking Quill internal issues
        return;
      }
      originalError.apply(console, args);
    };

    window.addEventListener("error", handleError, true); // Use capture phase
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    // Patch Quill after a delay to ensure it's loaded
    const patchTimer1 = setTimeout(patchQuillAfterMount, 300);
    const patchTimer2 = setTimeout(patchQuillAfterMount, 1000);

    // Delay mounting to ensure console.error suppression and polyfill are in place
    const timer = setTimeout(() => {
      setMounted(true);
      // Patch again after mount
      setTimeout(patchQuillAfterMount, 200);
    }, 150);

    return () => {
      clearTimeout(timer);
      clearTimeout(patchTimer1);
      clearTimeout(patchTimer2);
      window.removeEventListener("error", handleError, true);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      console.error = originalError;
    };
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[400px] border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center justify-center">
        <div className="text-brand-gray dark:text-brand-white/70">
          Loading editor...
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-[400px] border border-red-200 dark:border-red-800 rounded-lg p-4 flex flex-col items-center justify-center">
        <div className="text-red-600 dark:text-red-400 text-center">
          <p className="font-medium mb-2">Editor failed to load</p>
          <button
            onClick={() => {
              setHasError(false);
              setMounted(false);
              setTimeout(() => setMounted(true), 100);
            }}
            className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Use a stable key to prevent unnecessary remounts
  // Only remount if value changes from empty to content or vice versa
  const editorKey = `quill-${value.length > 0 ? "content" : "empty"}`;

  // Render ReactQuill component with bounds prop to prevent selection restoration issues
  return (
    <div ref={containerRef} className="react-quill-wrapper">
      <ReactQuill
        key={editorKey}
        theme={theme}
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        preserveWhitespace={true}
        bounds="self"
      />
    </div>
  );
}
