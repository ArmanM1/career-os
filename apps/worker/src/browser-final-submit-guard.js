(() => {
  const blockedText = /^(submit|submit application|apply|send application|finish|complete application|register|confirm registration)$/i;
  const isFinalControl = (target) => {
    const element = target instanceof Element ? target.closest("button,input,[role='button'],a") : null;
    if (!element) return false;
    if (element.matches("button[type='submit'],input[type='submit'],input[type='image']")) return true;
    const label = (element.getAttribute("aria-label") || element.textContent || element.getAttribute("value") || "").trim();
    return blockedText.test(label);
  };
  window.addEventListener("submit", (event) => { event.preventDefault(); event.stopImmediatePropagation(); }, true);
  window.addEventListener("click", (event) => { if (isFinalControl(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); } }, true);
  const blocked = () => { throw new Error("Career OS blocked final form submission. Review and submit manually."); };
  Object.defineProperty(HTMLFormElement.prototype, "submit", { configurable: false, writable: false, value: blocked });
  Object.defineProperty(HTMLFormElement.prototype, "requestSubmit", { configurable: false, writable: false, value: blocked });
})();
