export function createStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = [];

  /** Merge the partial update into the current state */
  function setState(partial) {
    // Allow a functional update as well: setState(prev => …)
    state =
      typeof partial === "function"
        ? { ...state, ...partial(state) }
        : { ...state, ...partial };

    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.push(fn);
    fn(state); // run once immediately
  }

  return {
    get state() {
      return state;
    },
    setState,
    subscribe,
  };
}
