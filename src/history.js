import { clone } from "./board-model.js";

export function createHistory(initialState, limit = 80) {
  const past = [clone(initialState)];
  let index = 0;

  function current() {
    return clone(past[index]);
  }

  function push(nextState) {
    past.splice(index + 1);
    past.push(clone(nextState));

    if (past.length > limit) {
      past.shift();
    } else {
      index += 1;
    }

    return current();
  }

  function undo() {
    if (index === 0) return null;
    index -= 1;
    return current();
  }

  function redo() {
    if (index >= past.length - 1) return null;
    index += 1;
    return current();
  }

  function reset(state) {
    past.splice(0, past.length, clone(state));
    index = 0;
  }

  return { current, push, undo, redo, reset };
}
