(function () {
  'use strict';

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArrayLimit(arr, i) {
    if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) {
      return;
    }

    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance");
  }

  function h (type, attrs) {
    let props = attrs || {};
    let key = props.key || null;
    let ref = props.ref || null;
    let children = [];

    for (let i = 2; i < arguments.length; i++) {
      let vnode = arguments[i];
      if (vnode == null || vnode === true || vnode === false) ; else if (typeof vnode === 'number' || typeof vnode === 'string') {
        children.push({ type: 'text', props: { nodeValue: vnode } });
      } else {
        children.push(vnode);
      }
    }

    if (children.length) {
      props.children = children.length === 1 ? children[0] : children;
    }

    delete props.key;
    delete props.ref;
    return { type, props, key, ref }
  }

  function updateElement (dom, oldProps, newProps) {
    for (let name in { ...oldProps, ...newProps }) {
      let oldValue = oldProps[name];
      let newValue = newProps[name];

      if (oldValue == newValue || name === 'children') ; else if (name === 'style') {
        for (const k in { ...oldValue, ...newValue }) {
          if (!(oldValue && newValue && oldValue[k] === newValue[k])) {
            dom[name][k] = newValue && newValue[k] || '';
          }
        }
      } else if (name[0] === 'o' && name[1] === 'n') {
        name = name.slice(2).toLowerCase();
        if (oldValue) dom.removeEventListener(name, oldValue);
        dom.addEventListener(name, newValue);
      } else if (name in dom && !(dom instanceof SVGElement)) {
        dom[name] = newValue == null ? '' : newValue;
      } else if (newValue == null || newValue === false) {
        dom.removeAttribute(name);
      } else {
        dom.setAttribute(name, newValue);
      }
    }
  }

  function createElement (fiber) {
    const dom =
      fiber.type === 'text'
        ? document.createTextNode('')
        : fiber.tag === SVG
          ? document.createElementNS('http://www.w3.org/2000/svg', fiber.type)
          : document.createElement(fiber.type);
    updateElement(dom, {}, fiber.props);
    return dom
  }

  let cursor = 0;

  function resetCursor () {
    cursor = 0;
  }

  function useState (initState) {
    return useReducer(null, initState)
  }

  function useReducer (reducer, initState) {
    let wip = getHook();
    let key = getKey();

    function setter(value) {
      value = reducer ? reducer(wip.state[key], value) : value;
      wip.state[key] = value;
      scheduleWork(wip, true);
    }

    if (key in wip.state) {
      return [wip.state[key], setter]
    } else {
      wip.state[key] = initState;
      return [initState, setter]
    }
  }

  function useEffect (cb, deps) {
    let wip = getHook();
    let key = getKey();
    if (isChanged(wip.__deps.e[key], deps)) {
      wip.effect[key] = useCallback(cb, deps);
      wip.__deps.e[key] = deps;
    }
  }

  function useMemo (cb, deps) {
    let wip = getHook();
    let key = getKey();
    if (isChanged(wip.__deps.m[key], deps)) {
      wip.__deps.m[key] = deps;
      return (wip.memo[key] = cb())
    }
    return wip.memo[key]
  }

  function useCallback (cb, deps) {
    return useMemo(() => cb, deps)
  }

  function isChanged (a, b) {
    return !a || b.some((arg, index) => arg !== a[index])
  }

  function getKey () {
    let key = '$' + cursor;
    cursor ++;
    return key
  }

  function push (heap, node) {
    let index = heap.length;
    heap.push(node);

    while (true) {
      let parentIndex = Math.floor((index - 1) / 2);
      let parent = heap[parentIndex];

      if (parent && compare(parent, node) > 0) {
        heap[parentIndex] = node;
        heap[index] = parent;
        index = parentIndex;
      } else return
    }
  }

  function pop (heap) {
    let first = heap[0];
    if (first) {
      let last = heap.pop();
      if (first !== last) {
        heap[0] = last;
        let index = 0;
        let length = heap.length;

        while (index < length) {
          let leftIndex = (index + 1) * 2 - 1;
          let left = heap[leftIndex];
          let rightIndex = leftIndex + 1;
          let right = heap[rightIndex];

          if (left && compare(left, last) < 0) {
            if (right && compare(right, left) < 0) {
              heap[index] = right;
              heap[rightIndex] = last;
              index = rightIndex;
            } else {
              heap[index] = left;
              heap[leftIndex] = last;
              index = leftIndex;
            }
          } else if (right && compare(right, last) < 0) {
            heap[index] = right;
            heap[rightIndex] = last;
            index = rightIndex;
          } else return
        }
      }
      return first
    } else return null
  }

  function compare (a, b) {
    return a.dueTime - b.dueTime
  }

  function peek (heap) {
    return heap[0] || null
  }

  let taskQueue = [];
  let currentTask = null;
  let currentCallback = null;
  let inMC = false;
  let frameDeadline = 0;
  const frameLength = 5;

  function scheduleCallback (callback) {
    const currentTime = getTime();
    let startTime = currentTime;
    let timeout = 5000; // idle
    let dueTime = startTime + timeout;

    let newTask = {
      callback,
      startTime,
      dueTime
    };

    push(taskQueue, newTask);

    currentCallback = flushWork;

    if (!inMC) planWork() && (inMC = true);

    return newTask
  }

  function flushWork (iniTime) {
    try {
      return workLoop(iniTime)
    } finally {
      currentTask = null;
    }
  }

  function workLoop (iniTime) {
    let currentTime = iniTime;
    currentTask = peek(taskQueue);

    while (currentTask) {
      if (currentTask.dueTime > currentTime && shouldYeild()) break
      let callback = currentTask.callback;
      if (callback) {
        currentTask.callback = null;
        let next = callback();
        if (next) {
          currentTask.callback = next;
        } else {
          if (currentTask === peek(taskQueue)) {
            pop(taskQueue);
          }
        }
      } else pop(taskQueue);
      currentTask = peek(taskQueue);
    }

    return !!currentTask
  }

  function performWork () {
    if (currentCallback) {
      let currentTime = getTime();
      frameDeadline = currentTime + frameLength;
      let moreWork = currentCallback(currentTime);
      if (!moreWork) {
        inMC = false;
        currentCallback = null;
      } else {
        planWork();
      }
    } else inMC = false;
  }

  const planWork = (() => {
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      const port = channel.port2;
      channel.port1.onmessage = performWork;

      return () => port.postMessage(null)
    }

    return () => setTimeout(performWork, 0)
  })();

  function shouldYeild () {
    return getTime() > frameDeadline
  }

  const getTime = () => performance.now();
  const [ROOT, HOST, HOOK, SVG, PLACE, UPDATE, DELETE] = [0, 1, 2, 3, 4, 5, 6];

  let pendingCommit = null;
  let WIP = null;
  let currentFiber = null;

  function render (vnode, node, done) {
    let rootFiber = {
      tag: ROOT,
      node,
      props: { children: vnode },
      done
    };
    scheduleWork(rootFiber);
  }

  function scheduleWork (fiber, lock) {
    fiber.lock = lock;
    WIP = fiber;
    scheduleCallback(performWork$1);
  }

  function performWork$1 () {
    while (WIP && !shouldYeild()) {
      WIP = performWIP(WIP);
    }

    if (pendingCommit) {
      commitWork(pendingCommit);
      return null
    }

    return performWork$1.bind(null)
  }

  function performWIP (WIP) {
    WIP.patches = [];
    WIP.parentNode = getParentNode(WIP);
    WIP.tag == HOOK ? updateHOOK(WIP) : updateHost(WIP);
    if (WIP.child) return WIP.child
    while (WIP) {
      completeWork(WIP);
      if (WIP.sibling && WIP.lock == null) return WIP.sibling
      WIP = WIP.parent;
    }
  }

  function updateHOOK (WIP) {
    WIP.props = WIP.props || {};
    WIP.state = WIP.state || {};
    WIP.effect = {};
    WIP.memo = {};
    WIP.__deps = WIP.__deps || { m: {}, e: {} };
    currentFiber = WIP;
    resetCursor();
    reconcileChildren(WIP, WIP.type(WIP.props));
  }

  function updateHost (WIP) {
    if (!WIP.node) {
      if (WIP.type === 'svg') WIP.tag = SVG;
      WIP.node = createElement(WIP);
    }
    let p = WIP.parentNode || {};
    WIP.insertPoint = p.last || null;
    p.last = WIP;
    WIP.node.last = null;
    reconcileChildren(WIP, WIP.props.children);
  }
  function getParentNode (fiber) {
    while ((fiber = fiber.parent)) {
      if (fiber.tag < HOOK) return fiber.node
    }
  }

  function reconcileChildren (WIP, children) {
    const oldFibers = WIP.kids;
    const newFibers = (WIP.kids = hashfy(children, WIP.kids));
    let reused = {};

    for (const k in oldFibers) {
      let newFiber = newFibers[k];
      let oldFiber = oldFibers[k];

      if (newFiber && newFiber.type === oldFiber.type) {
        reused[k] = oldFiber;
      } else {
        oldFiber.patchTag = DELETE;
        WIP.patches.push(oldFiber);
      }
    }

    let prevFiber = null;
    let alternate = null;

    for (const k in newFibers) {
      let newFiber = newFibers[k];
      let oldFiber = reused[k];

      if (oldFiber) {
        alternate = createFiber(oldFiber, UPDATE);
        newFiber.patchTag = UPDATE;
        newFiber = { ...alternate, ...newFiber };
        newFiber.alternate = alternate;
        if (shouldPlace(newFiber)) {
          newFiber.patchTag = PLACE;
        }
      } else {
        newFiber = createFiber(newFiber, PLACE);
      }

      newFibers[k] = newFiber;
      newFiber.parent = WIP;

      if (prevFiber) {
        prevFiber.sibling = newFiber;
      } else {
        if (WIP.tag === SVG) newFiber.tag = SVG;
        WIP.child = newFiber;
      }
      prevFiber = newFiber;
    }
    if (prevFiber) prevFiber.sibling = null;
    if (WIP.lock) WIP.lock = false;
  }

  function shouldPlace (fiber) {
    let p = fiber.parent;
    if (p.tag === HOOK) return p.key && !p.lock
    return fiber.key
  }

  function completeWork (fiber) {
    if (fiber.parent) {
      fiber.parent.patches.push(...fiber.patches, fiber);
    } else {
      pendingCommit = fiber;
    }
  }

  function commitWork (WIP) {
    WIP.patches.forEach(p => commit(p));
    WIP.done && WIP.done();
    WIP = pendingCommit = null;
  }

  function applyEffect (fiber) {
    fiber.pending = fiber.pending || {};
    for (const k in fiber.effect) {
      const pend = fiber.pending[k];
      pend && pend();
      const after = fiber.effect[k]();
      after && (fiber.pending[k] = after);
    }
  }

  function commit (fiber) {
    let tag = fiber.patchTag;
    let parent = fiber.parentNode;
    let dom = fiber.node;
    let ref = fiber.ref;

    if (tag === DELETE) {
      cleanup(fiber);
      while (fiber.tag === HOOK) fiber = fiber.child;
      parent.removeChild(fiber.node);
    } else if (fiber.tag === HOOK) {
      applyEffect(fiber);
    } else if (tag === UPDATE) {
      updateElement(dom, fiber.alternate.props, fiber.props);
    } else {
      let point = fiber.insertPoint ? fiber.insertPoint.node : null;
      let after = point ? point.nextSibling : parent.firstChild;
      if (after === dom) return
      if (after === null && dom === parent.lastChild) return
      parent.insertBefore(dom, after);
    }

    if (ref) isFn(ref) ? ref(dom) : (ref.current = dom);
    fiber.patches = fiber.parent.patches = [];
  }

  function cleanup (fiber) {
    let pend = fiber.pending;
    for (const k in pend) pend[k]();
    fiber.pending = null;
  }

  function createFiber (vnode, tag) {
    vnode.tag = isFn(vnode.type) ? HOOK : HOST;
    vnode.patchTag = tag;
    return vnode
  }

  const arrayfy = arr => (!arr ? [] : arr.pop ? arr : [arr]);

  function hashfy (arr) {
    let out = {};
    let i = 0;
    let j = 0;
    arrayfy(arr).forEach(item => {
      if (item.pop) {
        item.forEach(item => {
          item.key ? (out['.' + i + '.' + item.key] = item) : (out['.' + i + '.' + j] = item) && j++;
        });
        i++;
      } else {
        item.key ? (out['.' + item.key] = item) : (out['.' + i] = item) && i++;
      }
    });
    return out
  }

  const isFn = fn => typeof fn === 'function';

  function getHook () {
    return currentFiber || {}
  }
  //# sourceMappingURL=fre-esm.js.map

  /** @jsx h */

  var Poesy = function Poesy(_ref) {
    var poesy = _ref.poesy;

    var _ref2 = poesy || {},
        _ref2$title = _ref2.title,
        title = _ref2$title === void 0 ? 'loading ...' : _ref2$title,
        artist = _ref2.artist,
        _ref2$content = _ref2.content,
        content = _ref2$content === void 0 ? '' : _ref2$content;

    var lines = content.split('|^n|');
    return h("article", null, h("h3", null, title), h("span", null, artist), h("div", null, lines.map(function (line) {
      return h("p", null, line);
    })));
  };

  var App = function App() {
    var _useState = useState([]),
        _useState2 = _slicedToArray(_useState, 2),
        poesies = _useState2[0],
        setPoesies = _useState2[1];

    var s = Date.now() / 1000;
    var x = s / 60 / 60;
    var d = x / 24;
    var index = d % poesies.length | 0;
    var poesy = poesies[index];
    useEffect(function () {
      if (poesy) {
        var title = poesy.title,
            artist = poesy.artist;
        document.title = "".concat(title, " - ").concat(artist);
      }

      scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    useEffect(function () {
      fetch('./data/poesy.json').then(function (response) {
        return response.json();
      }).then(function (response) {
        setPoesies(response);
      });
    }, []);
    return h("div", null, h(Poesy, {
      poesy: poesy
    }), h("footer", null, "\xA9 made by ", h("a", {
      href: "https://lsong.org"
    }, "lsong"), ",\xA0", h("a", {
      href: "https://github.com/song940/poesy/issues/new"
    }, "click here"), " to submit"));
  };

  render(h(App, null), document.getElementById('app'));

}());
