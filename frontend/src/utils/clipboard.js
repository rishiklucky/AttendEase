/**
 * copyToClipboard — cross-platform copy with execCommand fallback.
 * navigator.clipboard.writeText() needs HTTPS, which fails on mobile over HTTP.
 * Falls back to document.execCommand('copy') via a hidden textarea.
 */
export const copyToClipboard = async (text) => {
  // Modern API (HTTPS / desktop localhost)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to execCommand fallback
    }
  }

  // execCommand fallback (HTTP / mobile / older browsers)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Make it invisible and out of the viewport
    textArea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    // Some mobile browsers need this
    textArea.setSelectionRange(0, textArea.value.length);
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
};
