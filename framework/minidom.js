import { bindEvent } from "./event.js";
import { diffAndUpdate, getCachedTree, setCachedTree } from "./diff.js";

// Crée un élément virtuel (pas encore dans le DOM)
export function el(type, props = {}, ...children) {
  if (children.length) props.children = children.flat();
  return { type, props };
}

// Fonction pour créer un élément DOM à partir d'un élément virtuel
export function createDOMElement(virtualElement) {
  if (virtualElement === false || virtualElement === null || virtualElement === undefined) {
    return null;
  }

  if (typeof virtualElement === "string" || typeof virtualElement === "number") {
    return document.createTextNode(virtualElement);
  }

  const element = document.createElement(virtualElement.type);
  const props = virtualElement.props || {};

  let shouldFocus = false;

  for (const [key, value] of Object.entries(props)) {
    if (key === "children") {
      setChildren(element, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      const event = key.slice(2).toLowerCase();
      bindEvent(element, event, value);
    } else if (key === "class") {
      element.className = value;
    } else if (key === "checked") {
      element.checked = value;
    } else if (key === "autofocus") {
      shouldFocus = value;
    } else if (key === "value" && element instanceof HTMLInputElement) {
      element.value = value;
    } else if (key === "style" && typeof value === "object") {
      Object.entries(value).forEach(([cssProp, cssVal]) => {
        element.style[cssProp] = cssVal;
      });
    } else {
      element.setAttribute(key, value);
    }
  }

  const activeElement = document.activeElement;
  if (
    activeElement &&
    element instanceof HTMLInputElement &&
    activeElement instanceof HTMLInputElement
  ) {
    if (
      (props.id && activeElement.id === props.id) ||
      (props.class && activeElement.className === props.class)
    ) {
      shouldFocus = true;
      const cursorPos = activeElement.selectionStart;
      setTimeout(() => {
        element.focus();
        element.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    }
  }

  return element;
}

export function setChildren(parent, children = []) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }

  for (const child of children) {
    if (child === false || child === null || child === undefined) continue;
    const domElement = createDOMElement(child);
    if (domElement) {
      parent.appendChild(domElement);
    }
  }
}

// Nouvelle fonction mount avec diffing
export function mount(target, virtualNode) {
  if (Array.isArray(virtualNode)) {
    const containerElement = {
      type: "div",
      props: {
        children: virtualNode,
      },
    };
    const oldVirtualTree = getCachedTree(target);
    diffAndUpdate(target, oldVirtualTree, containerElement);
    setCachedTree(target, containerElement);
    return;
  }

  const oldVirtualTree = getCachedTree(target);
  diffAndUpdate(target, oldVirtualTree, virtualNode);
  setCachedTree(target, virtualNode);
}

export function createElement(type, props = {}) {
  return createDOMElement(el(type, props));
}
