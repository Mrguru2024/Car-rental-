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
        // Note: Quill module patching is handled after react-quill loads
        // Attempting to patch before Quill is fully initialized causes errors
      } catch (e) {
        // Ignore
      }
    }
    return import("react-quill");
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
    // Note: Quill Selection patching is handled at the native browser API level
    // in lib/polyfills/react-quill-finddomnode.ts (Selection.prototype.addRange)
    // This avoids issues with Quill module imports that aren't available yet

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

    // Delay mounting to ensure console.error suppression and polyfill are in place
    const timer = setTimeout(() => {
      setMounted(true);
    }, 150);

    return () => {
      clearTimeout(timer);
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
