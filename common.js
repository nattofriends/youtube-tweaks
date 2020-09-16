function errorWrapper(name) {
  return (inner) => {
    return (...args) => {
      try {
        return inner.apply(this, args);
      } catch(err) {
        GM_notification({
          title: name,
          text: `Error: ${err}`,
        });
        console.error(err);
      }
    }
  }
}

function logger(name) {
    return function log(message) {
    if (typeof message === 'string') {
      console.log(`${name}: ${message}`);
    } else {
      console.log(name, message);
    }
  }
}

// XXX: Use querySelectorAll instead?
function waitForElement(selector, callback, targetDocument) {
  targetDocument ||= document;

  // Only start observing if we didn't find anything the first time.
  let el = targetDocument.querySelector(selector);
  if (el !== null) {
    callback(el)
  } else {
    const observer = new MutationObserver(() => {
      let el = targetDocument.querySelector(selector);
      if (el != null) {
        callback(el);
      }
    });
    observer.observe(targetDocument.documentElement, {attributes: false, childList: true, subtree: true})
  }
}
