/**
 * Polyfill for findDOMNode to support react-quill with React 18
 * This must be imported BEFORE react-quill in any component
 */

if (typeof window !== "undefined") {
  // Suppress findDOMNode errors in console
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = String(args[0] || "");
    if (
      message.includes("findDOMNode") ||
      message.includes("Warning: findDOMNode") ||
      message.includes("react_dom_1.default.findDOMNode") ||
      message.includes("u.default.findDOMNode") ||
      message.includes("findDOMNode is deprecated") ||
      message.includes("findDOMNode is not a function") ||
      message.includes("addRange") ||
      message.includes("The given range isn't in document") ||
      message.includes("range is not in document") ||
      message.includes("setNativeRange") ||
      message.includes("setEditorSelection") ||
      message.includes("setRange") ||
      message.includes("setSelection") ||
      message.includes("Cannot import core/selection") ||
      message.includes("Are you sure it was registered")
    ) {
      // Suppress findDOMNode and Quill range errors - they're non-breaking
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = String(args[0] || "");
    if (
      message.includes("findDOMNode") ||
      message.includes("Warning: findDOMNode") ||
      message.includes("findDOMNode is deprecated") ||
      message.includes("addRange") ||
      message.includes("The given range isn't in document") ||
      message.includes("setNativeRange") ||
      message.includes("setEditorSelection") ||
      message.includes("Cannot import core/selection") ||
      message.includes("Are you sure it was registered")
    ) {
      // Suppress findDOMNode and Quill range warnings
      return;
    }
    originalWarn.apply(console, args);
  };

  // Patch Selection.prototype.addRange to suppress errors
  // This is the method that throws "The given range isn't in document"
  if (typeof Selection !== "undefined" && Selection.prototype) {
    const originalAddRange = Selection.prototype.addRange;
    if (originalAddRange) {
      Selection.prototype.addRange = function (range: Range) {
        try {
          return originalAddRange.call(this, range);
        } catch (e: any) {
          const errorMsg = e?.message || String(e || "");
          if (
            errorMsg.includes("The given range isn't in document") ||
            errorMsg.includes("range is not in document") ||
            errorMsg.includes("addRange")
          ) {
            // Suppress the error - it's a non-breaking Quill internal issue
            // The range is invalid but Quill will handle it gracefully
            return;
          }
          throw e;
        }
      };
    }
  }

  // Patch ReactDOM.findDOMNode synchronously
  // This must happen before react-quill imports ReactDOM
  try {
    // Use require for synchronous loading
    const ReactDOM = require("react-dom");
    if (ReactDOM) {
      // Always patch, even if findDOMNode exists (to ensure it works correctly)
      const originalFindDOMNode = ReactDOM.findDOMNode;

      ReactDOM.findDOMNode = function (
        componentOrElement: any
      ): Element | Text | null {
        if (componentOrElement == null) {
          return null;
        }
        // If it's already a DOM node, return it
        if (
          componentOrElement.nodeType === 1 ||
          componentOrElement.nodeType === 3
        ) {
          return componentOrElement;
        }

        // Try original implementation first if it exists
        if (originalFindDOMNode) {
          try {
            return originalFindDOMNode.call(ReactDOM, componentOrElement);
          } catch (e) {
            // Fall through to polyfill
          }
        }

        // Polyfill implementation
        if (componentOrElement && typeof componentOrElement === "object") {
          // Check for ref
          if (componentOrElement.ref && componentOrElement.ref.current) {
            return componentOrElement.ref.current;
          }
          // Check for React internal fiber (React 18)
          const fiber =
            (componentOrElement as any)._reactInternalFiber ||
            (componentOrElement as any)._reactInternalInstance ||
            (componentOrElement as any).__reactInternalInstance;
          if (fiber) {
            let node = fiber;
            while (node) {
              if (
                node.stateNode &&
                (node.stateNode.nodeType === 1 || node.stateNode.nodeType === 3)
              ) {
                return node.stateNode;
              }
              node = node.child || node.return;
            }
          }
          // Try to find DOM node in object properties
          const keys = Object.keys(componentOrElement);
          for (const key of keys) {
            const value = componentOrElement[key];
            if (value && (value.nodeType === 1 || value.nodeType === 3)) {
              return value;
            }
          }
        }
        return null;
      };

      // Also patch the default export if it exists
      if (ReactDOM.default && !ReactDOM.default.findDOMNode) {
        ReactDOM.default.findDOMNode = ReactDOM.findDOMNode;
      }
    }
  } catch (e) {
    // Ignore polyfill errors - react-quill might still work
    console.warn("Failed to polyfill findDOMNode:", e);
  }
}
