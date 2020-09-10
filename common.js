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
