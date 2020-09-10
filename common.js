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
