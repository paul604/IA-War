/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var game = __webpack_require__(1);
	var renderConsole = __webpack_require__(2);
	var renderDOM = __webpack_require__(3);

	var isBrowser = typeof window !== "undefined";

	var req = __webpack_require__(11);
	var ias = req.keys().map(function(key) {
	    return req(key);
	});

	let gameState = {
	    paused: isBrowser,
	    fps: isBrowser ? 1 : 4
	};

	if (isBrowser) {
	    document
	        .getElementById("play-button")
	        .addEventListener("click", function () {
	            gameState.paused = !gameState.paused
	            this.innerText = gameState.paused ? "▶" : "▮▮";
	        });

	    document
	        .getElementById("inc-speed")
	        .addEventListener("click", () => gameState.fps += 5);

	    document
	        .getElementById("dec-speed")
	        .addEventListener("click", () => gameState.fps -= 5);
	}

	var renderer = isBrowser ? renderDOM : renderConsole;

	(function main() {
	    let state = game.init(ias);

	    renderer.init(state.mapSize);
	    renderer.render(state);

	    function step() {
	        if (!gameState.paused) {
	            state = game.update(state);
	            renderer.render(state);
	            if (state.winner) {
	                return;
	            }
	        }
	        setTimeout(step, 1000 / gameState.fps);
	    }

	    step();
	}());


/***/ }),
/* 1 */
/***/ (function(module, exports) {

	'use strict';

	function curry(fn) {
	    var arity = fn.length;
	    return function partial() {
	        var args = Array.prototype.slice.call(arguments, 0);
	        if (args.length >= arity) {
	            return fn.apply(null, args);
	        }
	        return function incomplete() {
	            var incompleteArgs = Array.prototype.slice.call(arguments, 0);
	            return partial.apply(null, args.concat(incompleteArgs));
	        }
	    };
	}

	function initPlayer(ia) {
	    return {
	        position: {
	            x: 0,
	            y: 0
	        },
	        name: ia.getName(),
	        ia: ia,
	        errors: [],
	        tpLeft: 1
	    };
	}

	function initIa(mapSize, ia) {
	    return ia(mapSize);
	}

	function dist(a, b) {
	    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
	}

	function addError(player, error) {
	    player.errors.push(error);
	    player.currentAction = "error";
	    console.error(`[ERROR] ${player.name} -> ${error}`);
	    return player;
	}

	function getRanPos(mapSize) {
	    return Math.round(Math.random() * (mapSize - 1));
	}


	function dispatchInMap(exit, mapSize, player) {
	    var pos = {
	        x: getRanPos(mapSize),
	        y: getRanPos(mapSize)
	    }
	    while (dist(pos, exit) < mapSize / 4) {
	        pos = {
	            x: getRanPos(mapSize),
	            y: getRanPos(mapSize)
	        }
	    }
	    player.position = pos;
	    return player;
	}

	function dispatchInTeams(nbTeams, player, index) {
	    return Object.assign({}, player, {
	        team: index % nbTeams
	    });
	}

	function groupByTeam(teams, player) {
	    teams[player.team] = teams[player.team] || [];
	    teams[player.team].push(player);
	    return teams;
	}

	function protectIaMethod(subject, methodName) {
	    if (!subject.ia[methodName]) {
	        return function () {};
	    }
	    return function () {
	        let res = false;
	        try {
	            res = subject.ia[methodName].apply(subject.ia, arguments);
	        } catch (e) {
	            addError(subject, e.message);
	        }
	        return res;
	    }
	}

	var actions = {
	    move: function move(subject, moves, env) {
	        var clone = Object.assign({}, subject);
	        if (moves.dx === undefined || moves.dy === undefined) {
	            return addError(clone, "[MOVE] missing dx or dy param");
	        }
	        const newPosition = { x: clone.position.x, y: clone.position.y };

	        for (let i of ["x", "y"]) {
	            if (moves["d" + i] !== 0) {
	                let newPos = clone.position[i] + (moves["d" + i] > 0 ? 1 : -1);
	                newPosition[i] = Math.round(newPos);
	            }
	        }

	        let isOnWall = env.walls.filter(t => t.x == newPosition.x && t.y === newPosition.y).length > 0;
	        if (!isOnWall) {
	            clone.position = newPosition;
	        }

	        return clone;
	    },

	    teleport: function teleport(subject, position, env) {
	        if (subject.tpLeft <= 0) {
	            return subject;
	        }
	        if (position.x === undefined || position.y === undefined) {
	            return addError(subject, "[TELEPORT] missing x or y param");
	        }
	        var clone = Object.assign({}, subject);
	        clone.tpLeft--;

	        var distFromExit = dist(position, env.exit);
	        if (distFromExit === 0) {
	            position = {
	                x: env.mapSize - env.exit.x - 1,
	                y: env.mapSize - env.exit.y - 1
	            };
	        }
	        clone.position = {
	            x: Math.round(position.x),
	            y: Math.round(position.y)
	        };
	        return clone;
	    },

	    ask: function ask(subject, question, env) {
	        let subPos = subject.position[question];
	        let exitPos = env.exit[question];

	        let status = 0;
	        if (subPos === exitPos) {
	            status = 0;
	        } else {
	            status = subPos > exitPos ? -1 : 1;
	        }

	        protectIaMethod(subject, "onResponse" + question.toUpperCase())(status);
	        return subject;
	    }
	};

	function execute({ action, params, subject, env }) {
	    if (!action) { return subject; }
	    var fn = actions[action];
	    if (!fn) {
	        addError(subject, `[ACTION] no action ${action}`);
	        return subject;
	    }
	    subject.currentAction = action;
	    return fn(subject, params, env);
	}

	function checkState(mapSize, player) {
	    let newPosition = Object.assign({}, player.position);
	    let maxIndex = mapSize - 1;

	    newPosition.x = Math.max(Math.min(newPosition.x, maxIndex), 0);
	    newPosition.y = Math.max(Math.min(newPosition.y, maxIndex), 0);

	    if (newPosition.x !== player.position.x || newPosition.y !== player.position.y) {
	        addError(player, "[MOVE] out of bounds");
	    }
	    player.position = newPosition;

	    return player;
	}

	function dispatchWalls(mapSize, players, exit) {
	    const walls = Array.from(new Array(mapSize))
	        .map(function (t) {
	        let pos;
	        do {
	            pos = {
	                x: getRanPos(mapSize),
	                y: getRanPos(mapSize)
	            };
	        } while (dist(pos, exit) < mapSize / 4);
	        return pos;
	    });

	    return walls;
	}

	var game = {
	    init: function (ias) {
	        var nbTeams = [2, 3, 4].reduce((acc, val) => {
	            if (ias.length % val === 0 || ias.length % val === 1) {
	                return val;
	            }
	            return acc;
	        }, 1);

	        var mapSize = Math.max(ias.length * 2, 20);

	        var exit = {
	            x: Math.floor(Math.random() * (mapSize - 1)),
	            y: Math.floor(Math.random() * (mapSize - 1))
	        }

	        var players = ias
	            .sort(function () { return 0.5 - Math.random() })
	            .map(curry(initIa)(mapSize))
	            .map(initPlayer)
	            .map(curry(dispatchInMap)(exit, mapSize))
	            .map(curry(dispatchInTeams)(nbTeams));

	        var teams = players.reduce(groupByTeam, {});

	        return {
	            players: players,
	            teams: teams,
	            exit: exit,
	            walls: dispatchWalls(mapSize, players, exit),
	            mapSize: mapSize,
	            winners: [],
	            winnersByTeam: {},
	            nbTeams: nbTeams,
	            round: 0
	        };
	    },

	    update: function (state) {
	        function not(fn) {
	            return function () {
	               return !fn.apply(null, arguments);
	            }
	        }
	        function isWinner(exit) {
	            return (player) => player.position.x === exit.x && player.position.y === exit.y;
	        }
	        var updatedPlayers = state
	            .players
	            .map(bot => {
	                let friendsPosition = state.players
	                    .filter(p => p.team === bot.team)
	                    .map(p => ({ x: p.position.x, y: p.position.y }));

	                let action = protectIaMethod(bot, "action")
	                    ({ x: bot.position.x, y: bot.position.y }, state.round, state.walls, friendsPosition);

	                action = action || {
	                    action: "error",
	                    params: {}
	                };

	                return {
	                   action: action.action,
	                   params: action.params,
	                   subject: bot,
	                   env: state
	               };
	            })
	            .map(execute)
	            .map(curry(checkState)(state.mapSize));

	        var roundWinners = updatedPlayers
	            .filter(isWinner(state.exit))

	        roundWinners.forEach((winner) => {
	            state.teams[winner.team].forEach((player) => {
	                protectIaMethod(player, "onFriendWins")({ x: state.exit.x, y: state.exit.y });
	            });
	        });

	        var winners = state.winners.concat(roundWinners);

	        var winnersByTeam = winners.reduce(groupByTeam, {});

	        var winningTeam = Object.keys(winnersByTeam).reduce(function (winningTeam, team) {
	            var won = winnersByTeam[team].length === state.teams[team].length;
	            return winningTeam || (won ? team : false);
	        }, false);

	        return Object.assign({}, state, {
	            players: updatedPlayers.filter(not(isWinner(state.exit))),
	            winners: winners,
	            winnersByTeam: winnersByTeam,
	            winner: winningTeam,
	            round: state.round + 1
	        });
	    }
	};

	module.exports = game;


/***/ }),
/* 2 */
/***/ (function(module, exports) {

	'use strict';

	let colors = [
	    31,
	    32,
	    34,
	    33,
	    36
	]
	function render(state) {
	    var map = [];
	    for (let x = 0; x < state.mapSize; x++) {
	        for (let y = 0; y < state.mapSize; y++) {
	            map[x] = map[x] || [];
	            map[x][y] = "█";
	        }
	    }

	    map[state.exit.x][state.exit.y] = " ";
	    state.players.forEach(bot => map[bot.position.x][bot.position.y] = "\u001b[" + colors[bot.team] + "m•\u001b[0m");

	    console.log("\x1B[2J");
	    console.log(map.map(line => line.join(" ")).join("\n"));
	    if (state.winners.length) {
	        console.log(state.winners.map(w => w.name));
	    }
	    if (state.winner) {
	        console.log(state.winner + " team wins");
	    }
	    console.log(state.players.map(player => player.name + " " + player.errors.length + " errors"));
	}

	module.exports = {
	    init: function () {},
	    render: render,
	};


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/* global require, module */
	var snabbdom = __webpack_require__(4);
	var h = __webpack_require__(8);
	var classes = __webpack_require__(9);
	var style = __webpack_require__(10);

	var context;
	var playersInfoPanel;
	var pixelSize = 20;

	var previousDOM;

	var patch = snabbdom.init([
	    classes,
	    style
	]);

	var colors = [
	    "rgb(203, 30, 30)",
	    "rgb(30, 99, 203)",
	    "rgb(47, 180, 38)",
	    "rgb(191, 156, 5)"
	];

	function init(mapSize) {
	    var container = document.getElementById("main");
	    context = container.getContext("2d");
	    playersInfoPanel = document.getElementById("players-info")

	    container.width = pixelSize * mapSize;
	    container.height = pixelSize * mapSize;
	    container.style.width = pixelSize * mapSize;
	    container.style.height = pixelSize * mapSize;
	}

	function render(state) {
	    context.fillStyle = "#fff";
	    context.fillRect(0, 0, context.canvas.height, context.canvas.width);

	    context.fillStyle = "#000";
	    context.fillRect(state.exit.x * pixelSize, state.exit.y * pixelSize, pixelSize, pixelSize);

	    context.fillStyle = "#999";
	    state.walls.forEach(t => context.fillRect(t.x * pixelSize, t.y * pixelSize, pixelSize, pixelSize));

	    state
	        .players
	        .forEach(function (bot) {
	            context.fillStyle = colors[bot.team];
	            context.font = "15px sans-serif";
	            context.textAlign = "center";

	            context.beginPath();
	            context.arc(
	                (0.5 + bot.position.x) * pixelSize,
	                (0.5 + bot.position.y) * pixelSize,
	                pixelSize / 2,
	                0,
	                2 * Math.PI,
	                false
	            );
	            context.fill();
	            context.fillText(bot.name, (bot.position.x + 0.5) * pixelSize, (bot.position.y + 1.7) * pixelSize);
	            if (bot.currentAction) {
	                context.fillStyle = "black";
	                var icons = {
	                    move: "\uf047",
	                    ask: "\uf128",
	                    teleport: "\uf0e7",
	                    error: "\uf00d"
	                };
	                context.font = "20px FontAwesome";
	                context.fillText(icons[bot.currentAction], (bot.position.x + 1) * pixelSize, bot.position.y * pixelSize);
	            }

	            //context.fillRect(bot.position.x * pixelSize, bot.position.y * pixelSize, pixelSize, pixelSize)
	        });

	    function playerRenderer(winner) {
	        var icons = {
	            move: "\uf047",
	            ask: "\uf128",
	            teleport: "\uf0e7",
	            error: "\uf00d"
	        };
	        return function (player) {
	            return h("tr.player", { class: { winner: winner }}, [
	                h("td", [player.name + " "]),
	                h("td", { style: { fontFamily: "FontAwesome", width: "1em" }}, [icons[player.currentAction] || ""]),
	                h("td", [h("span.team", { style: { "background-color": colors[player.team] }})]),
	                h("td.errors", [player.errors.length + " errors"])
	            ]);
	        };
	    }

	    var playersInfo = h(
	        "table",
	        [h("tbody", []
	            .concat(state.winners.map(playerRenderer(true)))
	            .concat(state.players.map(playerRenderer(false)))
	        )]
	    );

	    var dom = previousDOM ? previousDOM : playersInfoPanel;

	    previousDOM = patch(dom, playersInfo);

	    if (state.winner) {
	        var congrats = document.createElement("div");
	        congrats.id = "congrats";
	        congrats.innerHTML = "<div class=\"middle\"><span class=\"team\" style=\"background-color:" + colors[state.winner] + "\"></span> Win! </div>";

	        document.getElementById("canvas").appendChild(congrats);
	    }
	}

	module.exports = {
	    init,
	    render
	};


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	// jshint newcap: false
	/* global require, module, document, Node */
	'use strict';

	var VNode = __webpack_require__(5);
	var is = __webpack_require__(6);
	var domApi = __webpack_require__(7);

	function isUndef(s) { return s === undefined; }
	function isDef(s) { return s !== undefined; }

	var emptyNode = VNode('', {}, [], undefined, undefined);

	function sameVnode(vnode1, vnode2) {
	  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
	}

	function createKeyToOldIdx(children, beginIdx, endIdx) {
	  var i, map = {}, key;
	  for (i = beginIdx; i <= endIdx; ++i) {
	    key = children[i].key;
	    if (isDef(key)) map[key] = i;
	  }
	  return map;
	}

	var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];

	function init(modules, api) {
	  var i, j, cbs = {};

	  if (isUndef(api)) api = domApi;

	  for (i = 0; i < hooks.length; ++i) {
	    cbs[hooks[i]] = [];
	    for (j = 0; j < modules.length; ++j) {
	      if (modules[j][hooks[i]] !== undefined) cbs[hooks[i]].push(modules[j][hooks[i]]);
	    }
	  }

	  function emptyNodeAt(elm) {
	    var id = elm.id ? '#' + elm.id : '';
	    var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
	    return VNode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
	  }

	  function createRmCb(childElm, listeners) {
	    return function() {
	      if (--listeners === 0) {
	        var parent = api.parentNode(childElm);
	        api.removeChild(parent, childElm);
	      }
	    };
	  }

	  function createElm(vnode, insertedVnodeQueue) {
	    var i, data = vnode.data;
	    if (isDef(data)) {
	      if (isDef(i = data.hook) && isDef(i = i.init)) {
	        i(vnode);
	        data = vnode.data;
	      }
	    }
	    var elm, children = vnode.children, sel = vnode.sel;
	    if (isDef(sel)) {
	      // Parse selector
	      var hashIdx = sel.indexOf('#');
	      var dotIdx = sel.indexOf('.', hashIdx);
	      var hash = hashIdx > 0 ? hashIdx : sel.length;
	      var dot = dotIdx > 0 ? dotIdx : sel.length;
	      var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
	      elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
	                                                          : api.createElement(tag);
	      if (hash < dot) elm.id = sel.slice(hash + 1, dot);
	      if (dotIdx > 0) elm.className = sel.slice(dot + 1).replace(/\./g, ' ');
	      if (is.array(children)) {
	        for (i = 0; i < children.length; ++i) {
	          api.appendChild(elm, createElm(children[i], insertedVnodeQueue));
	        }
	      } else if (is.primitive(vnode.text)) {
	        api.appendChild(elm, api.createTextNode(vnode.text));
	      }
	      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode);
	      i = vnode.data.hook; // Reuse variable
	      if (isDef(i)) {
	        if (i.create) i.create(emptyNode, vnode);
	        if (i.insert) insertedVnodeQueue.push(vnode);
	      }
	    } else {
	      elm = vnode.elm = api.createTextNode(vnode.text);
	    }
	    return vnode.elm;
	  }

	  function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
	    for (; startIdx <= endIdx; ++startIdx) {
	      api.insertBefore(parentElm, createElm(vnodes[startIdx], insertedVnodeQueue), before);
	    }
	  }

	  function invokeDestroyHook(vnode) {
	    var i, j, data = vnode.data;
	    if (isDef(data)) {
	      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode);
	      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode);
	      if (isDef(i = vnode.children)) {
	        for (j = 0; j < vnode.children.length; ++j) {
	          invokeDestroyHook(vnode.children[j]);
	        }
	      }
	    }
	  }

	  function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
	    for (; startIdx <= endIdx; ++startIdx) {
	      var i, listeners, rm, ch = vnodes[startIdx];
	      if (isDef(ch)) {
	        if (isDef(ch.sel)) {
	          invokeDestroyHook(ch);
	          listeners = cbs.remove.length + 1;
	          rm = createRmCb(ch.elm, listeners);
	          for (i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm);
	          if (isDef(i = ch.data) && isDef(i = i.hook) && isDef(i = i.remove)) {
	            i(ch, rm);
	          } else {
	            rm();
	          }
	        } else { // Text node
	          api.removeChild(parentElm, ch.elm);
	        }
	      }
	    }
	  }

	  function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
	    var oldStartIdx = 0, newStartIdx = 0;
	    var oldEndIdx = oldCh.length - 1;
	    var oldStartVnode = oldCh[0];
	    var oldEndVnode = oldCh[oldEndIdx];
	    var newEndIdx = newCh.length - 1;
	    var newStartVnode = newCh[0];
	    var newEndVnode = newCh[newEndIdx];
	    var oldKeyToIdx, idxInOld, elmToMove, before;

	    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
	      if (isUndef(oldStartVnode)) {
	        oldStartVnode = oldCh[++oldStartIdx]; // Vnode has been moved left
	      } else if (isUndef(oldEndVnode)) {
	        oldEndVnode = oldCh[--oldEndIdx];
	      } else if (sameVnode(oldStartVnode, newStartVnode)) {
	        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
	        oldStartVnode = oldCh[++oldStartIdx];
	        newStartVnode = newCh[++newStartIdx];
	      } else if (sameVnode(oldEndVnode, newEndVnode)) {
	        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
	        oldEndVnode = oldCh[--oldEndIdx];
	        newEndVnode = newCh[--newEndIdx];
	      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
	        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
	        api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
	        oldStartVnode = oldCh[++oldStartIdx];
	        newEndVnode = newCh[--newEndIdx];
	      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
	        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
	        api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
	        oldEndVnode = oldCh[--oldEndIdx];
	        newStartVnode = newCh[++newStartIdx];
	      } else {
	        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
	        idxInOld = oldKeyToIdx[newStartVnode.key];
	        if (isUndef(idxInOld)) { // New element
	          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
	          newStartVnode = newCh[++newStartIdx];
	        } else {
	          elmToMove = oldCh[idxInOld];
	          patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
	          oldCh[idxInOld] = undefined;
	          api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
	          newStartVnode = newCh[++newStartIdx];
	        }
	      }
	    }
	    if (oldStartIdx > oldEndIdx) {
	      before = isUndef(newCh[newEndIdx+1]) ? null : newCh[newEndIdx+1].elm;
	      addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
	    } else if (newStartIdx > newEndIdx) {
	      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
	    }
	  }

	  function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
	    var i, hook;
	    if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
	      i(oldVnode, vnode);
	    }
	    var elm = vnode.elm = oldVnode.elm, oldCh = oldVnode.children, ch = vnode.children;
	    if (oldVnode === vnode) return;
	    if (!sameVnode(oldVnode, vnode)) {
	      var parentElm = api.parentNode(oldVnode.elm);
	      elm = createElm(vnode, insertedVnodeQueue);
	      api.insertBefore(parentElm, elm, oldVnode.elm);
	      removeVnodes(parentElm, [oldVnode], 0, 0);
	      return;
	    }
	    if (isDef(vnode.data)) {
	      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode);
	      i = vnode.data.hook;
	      if (isDef(i) && isDef(i = i.update)) i(oldVnode, vnode);
	    }
	    if (isUndef(vnode.text)) {
	      if (isDef(oldCh) && isDef(ch)) {
	        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue);
	      } else if (isDef(ch)) {
	        if (isDef(oldVnode.text)) api.setTextContent(elm, '');
	        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
	      } else if (isDef(oldCh)) {
	        removeVnodes(elm, oldCh, 0, oldCh.length - 1);
	      } else if (isDef(oldVnode.text)) {
	        api.setTextContent(elm, '');
	      }
	    } else if (oldVnode.text !== vnode.text) {
	      api.setTextContent(elm, vnode.text);
	    }
	    if (isDef(hook) && isDef(i = hook.postpatch)) {
	      i(oldVnode, vnode);
	    }
	  }

	  return function(oldVnode, vnode) {
	    var i, elm, parent;
	    var insertedVnodeQueue = [];
	    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]();

	    if (isUndef(oldVnode.sel)) {
	      oldVnode = emptyNodeAt(oldVnode);
	    }

	    if (sameVnode(oldVnode, vnode)) {
	      patchVnode(oldVnode, vnode, insertedVnodeQueue);
	    } else {
	      elm = oldVnode.elm;
	      parent = api.parentNode(elm);

	      createElm(vnode, insertedVnodeQueue);

	      if (parent !== null) {
	        api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
	        removeVnodes(parent, [oldVnode], 0, 0);
	      }
	    }

	    for (i = 0; i < insertedVnodeQueue.length; ++i) {
	      insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
	    }
	    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]();
	    return vnode;
	  };
	}

	module.exports = {init: init};


/***/ }),
/* 5 */
/***/ (function(module, exports) {

	'use strict';

	module.exports = function(sel, data, children, text, elm) {
	  var key = data === undefined ? undefined : data.key;
	  return {sel: sel, data: data, children: children,
	          text: text, elm: elm, key: key};
	};


/***/ }),
/* 6 */
/***/ (function(module, exports) {

	'use strict';

	module.exports = {
	  array: Array.isArray,
	  primitive: function(s) { return typeof s === 'string' || typeof s === 'number'; },
	};


/***/ }),
/* 7 */
/***/ (function(module, exports) {

	'use strict';

	function createElement(tagName){
	  return document.createElement(tagName);
	}

	function createElementNS(namespaceURI, qualifiedName){
	  return document.createElementNS(namespaceURI, qualifiedName);
	}

	function createTextNode(text){
	  return document.createTextNode(text);
	}


	function insertBefore(parentNode, newNode, referenceNode){
	  parentNode.insertBefore(newNode, referenceNode);
	}


	function removeChild(node, child){
	  node.removeChild(child);
	}

	function appendChild(node, child){
	  node.appendChild(child);
	}

	function parentNode(node){
	  return node.parentElement;
	}

	function nextSibling(node){
	  return node.nextSibling;
	}

	function tagName(node){
	  return node.tagName;
	}

	function setTextContent(node, text){
	  node.textContent = text;
	}

	module.exports = {
	  createElement: createElement,
	  createElementNS: createElementNS,
	  createTextNode: createTextNode,
	  appendChild: appendChild,
	  removeChild: removeChild,
	  insertBefore: insertBefore,
	  parentNode: parentNode,
	  nextSibling: nextSibling,
	  tagName: tagName,
	  setTextContent: setTextContent
	};


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var VNode = __webpack_require__(5);
	var is = __webpack_require__(6);

	function addNS(data, children, sel) {
	  data.ns = 'http://www.w3.org/2000/svg';

	  if (sel !== 'foreignObject' && children !== undefined) {
	    for (var i = 0; i < children.length; ++i) {
	      addNS(children[i].data, children[i].children, children[i].sel);
	    }
	  }
	}

	module.exports = function h(sel, b, c) {
	  var data = {}, children, text, i;
	  if (c !== undefined) {
	    data = b;
	    if (is.array(c)) { children = c; }
	    else if (is.primitive(c)) { text = c; }
	  } else if (b !== undefined) {
	    if (is.array(b)) { children = b; }
	    else if (is.primitive(b)) { text = b; }
	    else { data = b; }
	  }
	  if (is.array(children)) {
	    for (i = 0; i < children.length; ++i) {
	      if (is.primitive(children[i])) children[i] = VNode(undefined, undefined, undefined, children[i]);
	    }
	  }
	  if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g') {
	    addNS(data, children, sel);
	  }
	  return VNode(sel, data, children, text, undefined);
	};


/***/ }),
/* 9 */
/***/ (function(module, exports) {

	'use strict';

	function updateClass(oldVnode, vnode) {
	  var cur, name, elm = vnode.elm,
	      oldClass = oldVnode.data.class,
	      klass = vnode.data.class;

	  if (!oldClass && !klass) return;
	  oldClass = oldClass || {};
	  klass = klass || {};

	  for (name in oldClass) {
	    if (!klass[name]) {
	      elm.classList.remove(name);
	    }
	  }
	  for (name in klass) {
	    cur = klass[name];
	    if (cur !== oldClass[name]) {
	      elm.classList[cur ? 'add' : 'remove'](name);
	    }
	  }
	}

	module.exports = {create: updateClass, update: updateClass};


/***/ }),
/* 10 */
/***/ (function(module, exports) {

	'use strict';

	var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) || setTimeout;
	var nextFrame = function(fn) { raf(function() { raf(fn); }); };

	function setNextFrame(obj, prop, val) {
	  nextFrame(function() { obj[prop] = val; });
	}

	function updateStyle(oldVnode, vnode) {
	  var cur, name, elm = vnode.elm,
	      oldStyle = oldVnode.data.style,
	      style = vnode.data.style;

	  if (!oldStyle && !style) return;
	  oldStyle = oldStyle || {};
	  style = style || {};
	  var oldHasDel = 'delayed' in oldStyle;

	  for (name in oldStyle) {
	    if (!style[name]) {
	      elm.style[name] = '';
	    }
	  }
	  for (name in style) {
	    cur = style[name];
	    if (name === 'delayed') {
	      for (name in style.delayed) {
	        cur = style.delayed[name];
	        if (!oldHasDel || cur !== oldStyle.delayed[name]) {
	          setNextFrame(elm.style, name, cur);
	        }
	      }
	    } else if (name !== 'remove' && cur !== oldStyle[name]) {
	      elm.style[name] = cur;
	    }
	  }
	}

	function applyDestroyStyle(vnode) {
	  var style, name, elm = vnode.elm, s = vnode.data.style;
	  if (!s || !(style = s.destroy)) return;
	  for (name in style) {
	    elm.style[name] = style[name];
	  }
	}

	function applyRemoveStyle(vnode, rm) {
	  var s = vnode.data.style;
	  if (!s || !s.remove) {
	    rm();
	    return;
	  }
	  var name, elm = vnode.elm, idx, i = 0, maxDur = 0,
	      compStyle, style = s.remove, amount = 0, applied = [];
	  for (name in style) {
	    applied.push(name);
	    elm.style[name] = style[name];
	  }
	  compStyle = getComputedStyle(elm);
	  var props = compStyle['transition-property'].split(', ');
	  for (; i < props.length; ++i) {
	    if(applied.indexOf(props[i]) !== -1) amount++;
	  }
	  elm.addEventListener('transitionend', function(ev) {
	    if (ev.target === elm) --amount;
	    if (amount === 0) rm();
	  });
	}

	module.exports = {create: updateStyle, update: updateStyle, destroy: applyDestroyStyle, remove: applyRemoveStyle};


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	var map = {
		"./felix.ia.js": 12,
		"./paul.js": 13,
		"./paul_diago.js": 14,
		"./paul_ligne.js": 15,
		"./teleport.js": 16
	};
	function webpackContext(req) {
		return __webpack_require__(webpackContextResolve(req));
	};
	function webpackContextResolve(req) {
		return map[req] || (function() { throw new Error("Cannot find module '" + req + "'.") }());
	};
	webpackContext.keys = function webpackContextKeys() {
		return Object.keys(map);
	};
	webpackContext.resolve = webpackContextResolve;
	module.exports = webpackContext;
	webpackContext.id = 11;


/***/ }),
/* 12 */
/***/ (function(module, exports) {

	'use strict';

	function iaGenerator(mapSize) {
	    return {
	        /**
	        * getName - Retourne ici ton nom de guerrier
	        *
	        * @return {string}
	        */
	        getName: function getName() {
	            return "Felix";
	        },

	        /**
	         * onFriendWins - fonction qui est appelée quand un ami gagne
	         *
	         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
	         * @return {void}
	         */
	        onFriendWins: function onFriendWins(exit) {
	            console.log(exit);
	        },

	        /**
	         * onResponseX - fonction appelée quand le jeux nous donne
	         * la position horizontale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseX: function onResponseX(hPosition) {
	            //1 je suis trop à gauche
	            //-1 je suis trop à droite
	            //0 je suis en face de la sortie
	            console.log(hPosition);
	        },

	        /**
	         * onResponseY - fonction appelée quand le jeux nous donne
	         * la position verticale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseY: function (vPosition) {
	            //1 je suis trop bas
	            //-1 je suis trop haut
	            //0 je suis en face de la sortie
	            console.log(vPosition);
	        },

	        /**
	        * action - fonction appelée par le moteur de jeu à chaque tour
	        * ici, il faut retourner un object qui décrit
	        * l'action que doit faire le bot pour ce tour.
	        *
	        * @param {object} position - la position actuelle de votre bot
	        * @param {number} round - le numéro de tour en cours
	        * @return {object} action - l'action à effectuer
	        */
	        action: function action(position, round) {
	            //à vous de gérer la logique de décision
	            var action = {};
	            // pour retourner l'objet qui correspond à l'action
	            // que votre bot devrait faire (voir README)
	            return action;
	        }
	    };
	}

	module.exports = iaGenerator;


/***/ }),
/* 13 */
/***/ (function(module, exports) {

	'use strict';

	function iaGenerator(mapSize) {
	        var teleport = false;
	        var out = false;
	        var outx;
	        var outy;
	        var decalx=42;
	        var decaly=42;
	        var map;
	    return {


	        /**
	        * getName - Retourne ici ton nom de guerrier
	        *
	        * @return {string}
	        */
	        getName: function getName() {
	            return "Paul";
	        },

	        /**
	         * onFriendWins - fonction qui est appelée quand un ami gagne
	         *
	         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
	         * @return {void}
	         */
	        onFriendWins: function onFriendWins(exit) {
	            out=true;
	            outx=exit.x;
	            outy=exit.y;
	            console.log(exit);
	        },

	        /**
	         * onResponseX - fonction appelée quand le jeux nous donne
	         * la position horizontale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseX: function onResponseX(hPosition) {
	            //1 je suis trop à gauche
	            //-1 je suis trop à droite
	            //0 je suis en face de la sortie
	            decalx=hPosition;
	            console.log("paul x: "+hPosition);
	        },

	        /**
	         * onResponseY - fonction appelée quand le jeux nous donne
	         * la position verticale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} vPosition
	         * @return {void}
	         */
	        onResponseY: function (vPosition) {
	            //1 je suis trop bas
	            //-1 je suis trop haut
	            //0 je suis en face de la sortie
	            decaly=vPosition;
	            console.log("paul y: "+vPosition);
	        },

	        /**
	        * action - fonction appelée par le moteur de jeu à chaque tour
	        * ici, il faut retourner un object qui décrit
	        * l'action que doit faire le bot pour ce tour.
	        *
	        * @param {object} position - la position actuelle de votre bot
	        * @param {number} round - le numéro de tour en cours
	        * @return {object} action - l'action à effectuer
	        */
	        action: function action(position, round, walls) {
	          console.log("action");
	          if (round === 0) {
	            map = saveWall(walls, mapSize);
	          }
	          var x=0;
	          var y=0;
	          var choix = "";
	          var ask;

	          if(out && !teleport){
	            choix = "teleport";
	          }else if(out && teleport){
	            choix = "move";
	          }else if(decalx===42){
	            choix = "ask";
	            ask="x";
	          }else if(decaly === 42){
	            choix = "ask";
	            ask="y";
	          }else {
	            choix = "move";
	            x=decalx;
	            y=decaly;
	          }



	          var action ={};
	          switch (choix){
	            case "move":
	              console.log(move);
	              if(out && teleport){
	                x=outx-position.x;
	                y=outy-position.y;
	              }else{
	                var resultMove = move(mapSize, position, map, x, y);
	                if(resultMove.x !== 0 && resultMove.y !== 0){
	                  decalx=42;
	                  decaly=42;
	                }
	                x=resultMove.x;
	                y=resultMove.y;
	              }
	              console.log(x+"  "+y);
	              action = {
	                action: "move",
	                params: {
	                  dx: x, //1 mouvement positif, -1 mouvement négatif, 0 aucun mouvement sur cet axe
	                  dy: y
	              }};
	              break;
	            case "ask":
	              action = {
	                action: "ask",
	                params: ask
	              };
	              break;
	            case "teleport":
	              teleport=true;
	              var positionOut ={
	                x: outx,
	                y: outy
	              };
	              var resultMove = move(mapSize, positionOut, map, 1, 0);
	              x=positionOut.x+resultMove.x;
	              y=positionOut.y+resultMove.y;
	              action = {
	                action: "teleport",
	                params: {
	                    x: x,
	                    y: y
	              }};
	              break;
	          }
	            return action;
	        }
	    };
	}

	//---------------------------------------------------------------------------

	function saveWall(walls, mapSize) {
	  var map = new Array(mapSize);

	  for (var i in walls) {
	    var wall = walls[i];
	    var mapx = map[wall.x];
	    if(! (mapx instanceof Array)){
	      mapx=new Array(mapSize);
	    }
	    mapx[wall.y]=1;
	    map[wall.x]=mapx;
	  }
	  return map;
	}

	function move(mapSize, position, map, moveX, moveY) {
	  var testok=false;
	  for (var i = 0; i < 8 && !testok; i++) {
	    testok=testMove(mapSize, position, map, moveX, moveY);
	    if(!testok){
	      var tabMove = choixMouve(moveX, moveY);
	      moveX=tabMove.x;
	      moveY=tabMove.y;
	    }
	  }
	  return {x:moveX, y:moveY};
	}

	function testMove(mapSize, position, map, moveX, moveY) {
	  var testx=position.x+moveX;
	  var testy=position.y+moveY;
	  if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize ) {
	    return false;
	  }
	  if(map[testx] instanceof Array){
	    if(map[testx][testy] === 1){
	      return false;
	    }
	  }
	  return true;
	}

	function choixMouve(x, y){
	  if(x === 0 && y ===-1){//haut
	    return  {x:1 ,y:y};
	  }else if(x === 1 && y === -1){//hd
	    return  {x:x ,y:0};
	  }else if(x === 1 && y === 0){//d
	    return  {x:x ,y:1};
	  }else if(x === 1 && y === 1){//bd
	    return  {x:0 ,y:y};
	  }else if(x === 0 && y === 1){//b
	    return  {x:-1 ,y:y};
	  }else if(y === 1){//bg
	    return  {x:x ,y:0};
	  }else if(y === 0){//g
	    return  {x:x ,y:-1};
	  }else if(y === -1){//hg
	    return  {x:0 ,y:-1};
	  }else {
	    return {x:0 ,y:0};
	  }
	}

	module.exports = iaGenerator;


/***/ }),
/* 14 */
/***/ (function(module, exports) {

	'use strict';

	function iaGenerator(mapSize) {
	        var teleport = false;
	        var out = false;
	        var outx;
	        var outy;
	        var decalx=42;
	        var decaly=42;
	        var map;
	    return {


	        /**
	        * getName - Retourne ici ton nom de guerrier
	        *
	        * @return {string}
	        */
	        getName: function getName() {
	            return "Paul diago";
	        },

	        /**
	         * onFriendWins - fonction qui est appelée quand un ami gagne
	         *
	         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
	         * @return {void}
	         */
	        onFriendWins: function onFriendWins(exit) {
	            out=true;
	            outx=exit.x;
	            outy=exit.y;
	            console.log(exit);
	        },

	        /**
	         * onResponseX - fonction appelée quand le jeux nous donne
	         * la position horizontale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseX: function onResponseX(hPosition) {
	            //1 je suis trop à gauche
	            //-1 je suis trop à droite
	            //0 je suis en face de la sortie
	            decalx=hPosition;
	        },

	        /**
	         * onResponseY - fonction appelée quand le jeux nous donne
	         * la position verticale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} vPosition
	         * @return {void}
	         */
	        onResponseY: function (vPosition) {
	            //1 je suis trop bas
	            //-1 je suis trop haut
	            //0 je suis en face de la sortie
	            decaly=vPosition;
	        },

	        /**
	        * action - fonction appelée par le moteur de jeu à chaque tour
	        * ici, il faut retourner un object qui décrit
	        * l'action que doit faire le bot pour ce tour.
	        *
	        * @param {object} position - la position actuelle de votre bot
	        * @param {number} round - le numéro de tour en cours
	        * @return {object} action - l'action à effectuer
	        */
	        action: function action(position, round, walls) {
	          if (round === 0) {
	            map = saveWall(walls, mapSize);
	          }
	          var x=0;
	          var y=0;
	          var choix = "";
	          var ask;

	          if(out && !teleport){
	            choix = "teleport";
	            x=outx-1;
	            y=outy;
	          }else if(out && teleport){
	            choix = "move";
	            x=1;
	          }else if(decalx===42){
	            choix = "ask";
	            ask="x";
	          }else if(decaly === 42){
	            choix = "ask";
	            ask="y";
	          }else {
	            choix = "move";
	            x=decalx;
	            y=decaly;
	          }



	          var action ={};
	          switch (choix){
	            case "move":
	              if(out && teleport){
	                x=outx-position.x;
	                y=outy-position.y;
	              }else{
	                var resultMove = move(mapSize, position, map, x, y);
	                if(resultMove.x !== 0 && resultMove.y !== 0){
	                  decalx=42;
	                  decaly=42;
	                }
	                x=resultMove.x;
	                y=resultMove.y;
	              }
	              action = {
	                action: "move",
	                params: {
	                  dx: x, //1 mouvement positif, -1 mouvement négatif, 0 aucun mouvement sur cet axe
	                  dy: y
	              }};
	              break;
	            case "ask":
	              action = {
	                action: "ask",
	                params: ask
	              };
	              break;
	            case "teleport":
	              teleport=true;
	              var positionOut ={
	                x: outx,
	                y: outy
	              };
	              var resultMove = move(mapSize, positionOut, map, 1, 0);
	              x=positionOut.x+resultMove.x;
	              y=positionOut.y+resultMove.y;
	              action = {
	                action: "teleport",
	                params: {
	                    x: x,
	                    y: y
	              }};
	              break;
	          }
	            return action;
	        }
	    };
	}

	//---------------------------------------------------------------------------

	function saveWall(walls, mapSize) {
	  var map = new Array(mapSize);

	  for (var i in walls) {
	    var wall = walls[i];
	    var mapx = map[wall.x];
	    if(! (mapx instanceof Array)){
	      mapx=new Array(mapSize);
	    }
	    mapx[wall.y]=1;
	    map[wall.x]=mapx;
	  }
	  return map;
	}

	function move(mapSize, position, map, moveX, moveY) {
	  var testok=false;
	  for (var i = 0; i < 8 && !testok; i++) {
	    testok=testMove(mapSize, position, map, moveX, moveY);
	    if(!testok){
	      var tabMove = choixMouve(moveX, moveY);
	      moveX=tabMove.x;
	      moveY=tabMove.y;
	    }
	  }
	  return {x:moveX, y:moveY};
	}

	function testMove(mapSize, position, map, moveX, moveY) {
	  var testx=position.x+moveX;
	  var testy=position.y+moveY;
	  if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize ) {
	    return false;
	  }
	  if(map[testx] instanceof Array){
	    if(map[testx][testy] === 1){
	      return false;
	    }
	  }
	  return true;
	}

	function choixMouve(x, y){
	  if(x === 0 && y ===-1){//haut
	    return  {x:1 ,y:y};
	  }else if(x === 1 && y === -1){//hd
	    return  {x:x ,y:0};
	  }else if(x === 1 && y === 0){//d
	    return  {x:x ,y:1};
	  }else if(x === 1 && y === 1){//bd
	    return  {x:0 ,y:y};
	  }else if(x === 0 && y === 1){//b
	    return  {x:-1 ,y:y};
	  }else if(y === 1){//bg
	    return  {x:x ,y:0};
	  }else if(y === 0){//g
	    return  {x:x ,y:-1};
	  }else if(y === -1){//hg
	    return  {x:0 ,y:-1};
	  }else {
	    return {x:0 ,y:0};
	  }
	}

	module.exports = iaGenerator;


/***/ }),
/* 15 */
/***/ (function(module, exports) {

	'use strict';

	function iaGenerator(mapSize) {
	        var teleport = false;
	        var out = false;
	        var outx;
	        var outy;
	        var decalx=42;
	        var decaly=42;
	        var map;
	    return {


	        /**
	        * getName - Retourne ici ton nom de guerrier
	        *
	        * @return {string}
	        */
	        getName: function getName() {
	            return "Paul ligne";
	        },

	        /**
	         * onFriendWins - fonction qui est appelée quand un ami gagne
	         *
	         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
	         * @return {void}
	         */
	        onFriendWins: function onFriendWins(exit) {
	            out=true;
	            outx=exit.x;
	            outy=exit.y;
	            console.log(exit);
	        },

	        /**
	         * onResponseX - fonction appelée quand le jeux nous donne
	         * la position horizontale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseX: function onResponseX(hPosition) {
	            //1 je suis trop à gauche
	            //-1 je suis trop à droite
	            //0 je suis en face de la sortie
	            decalx=hPosition;
	        },

	        /**
	         * onResponseY - fonction appelée quand le jeux nous donne
	         * la position verticale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} vPosition
	         * @return {void}
	         */
	        onResponseY: function (vPosition) {
	            //1 je suis trop bas
	            //-1 je suis trop haut
	            //0 je suis en face de la sortie
	            decaly=vPosition;
	        },

	        /**
	        * action - fonction appelée par le moteur de jeu à chaque tour
	        * ici, il faut retourner un object qui décrit
	        * l'action que doit faire le bot pour ce tour.
	        *
	        * @param {object} position - la position actuelle de votre bot
	        * @param {number} round - le numéro de tour en cours
	        * @return {object} action - l'action à effectuer
	        */
	        action: function action(position, round, walls) {
	          if (round === 0) {
	            map = saveWall(walls, mapSize);
	          }
	          var x=0;
	          var y=0;
	          var choix = "";
	          var ask;

	          if(out && !teleport){
	            choix = "teleport";
	          }else if(out && teleport){
	            choix = "move";
	          }else if(decalx===42){
	            choix = "ask";
	            ask="x";
	            decaly=0;
	          }else if(decalx === 0 && decaly === 42){
	            choix = "ask";
	            ask="y";
	          }else {
	            choix = "move";
	            x=decalx;
	            y=decaly;
	          }



	          var action ={};
	          switch (choix){
	            case "move":
	              if(out && teleport){
	                x=outx-position.x;
	                y=outy-position.y;
	              }else{
	                var resultMove = move(mapSize, position, map, x, y);
	                if(resultMove.x !== 0 ){
	                  decalx=42;
	                  // decaly=42; && resultMove.y !== 0
	                }
	                if(resultMove.x === 0){
	                  decaly=42;
	                }
	                x=resultMove.x;
	                y=resultMove.y;
	              }
	              action = {
	                action: "move",
	                params: {
	                  dx: x, //1 mouvement positif, -1 mouvement négatif, 0 aucun mouvement sur cet axe
	                  dy: y
	              }};
	              break;
	            case "ask":
	              action = {
	                action: "ask",
	                params: ask
	              };
	              break;
	            case "teleport":
	              teleport=true;
	              var positionOut ={
	                x: outx,
	                y: outy
	              };
	              var resultMove = move(mapSize, positionOut, map, 1, 0);
	              x=positionOut.x+resultMove.x;
	              y=positionOut.y+resultMove.y;
	              action = {
	                action: "teleport",
	                params: {
	                    x: x,
	                    y: y
	              }};
	              break;
	          }
	            return action;
	        }
	    };
	}

	//---------------------------------------------------------------------------

	function saveWall(walls, mapSize) {
	  var map = new Array(mapSize);

	  for (var i in walls) {
	    var wall = walls[i];
	    var mapx = map[wall.x];
	    if(! (mapx instanceof Array)){
	      mapx=new Array(mapSize);
	    }
	    mapx[wall.y]=1;
	    map[wall.x]=mapx;
	  }
	  return map;
	}

	function move(mapSize, position, map, moveX, moveY) {
	  var testok=false;
	  for (var i = 0; i < 8 && !testok; i++) {
	    testok=testMove(mapSize, position, map, moveX, moveY);
	    if(!testok){
	      var tabMove = choixMouve(moveX, moveY);
	      moveX=tabMove.x;
	      moveY=tabMove.y;
	    }
	  }
	  return {x:moveX, y:moveY};
	}

	function testMove(mapSize, position, map, moveX, moveY) {
	  var testx=position.x+moveX;
	  var testy=position.y+moveY;
	  if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize ) {
	    return false;
	  }
	  if(map[testx] instanceof Array){
	    if(map[testx][testy] === 1){
	      return false;
	    }
	  }
	  return true;
	}

	function choixMouve(x, y){
	  if(x === 0 && y ===-1){//haut
	    return  {x:1 ,y:y};
	  }else if(x === 1 && y === -1){//hd
	    return  {x:x ,y:0};
	  }else if(x === 1 && y === 0){//d
	    return  {x:x ,y:1};
	  }else if(x === 1 && y === 1){//bd
	    return  {x:0 ,y:y};
	  }else if(x === 0 && y === 1){//b
	    return  {x:-1 ,y:y};
	  }else if(y === 1){//bg
	    return  {x:x ,y:0};
	  }else if(y === 0){//g
	    return  {x:x ,y:-1};
	  }else if(y === -1){//hg
	    return  {x:0 ,y:-1};
	  }else {
	    return {x:0 ,y:0};
	  }
	}

	module.exports = iaGenerator;


/***/ }),
/* 16 */
/***/ (function(module, exports) {

	'use strict';

	function iaGenerator(mapSize) {
	        var teleport = false;
	        var out = false;
	        var outx;
	        var outy;
	        var map;
	    return {


	        /**
	        * getName - Retourne ici ton nom de guerrier
	        *
	        * @return {string}
	        */
	        getName: function getName() {
	            return "Teleport";
	        },

	        /**
	         * onFriendWins - fonction qui est appelée quand un ami gagne
	         *
	         * @param {Object} exit - la positions de la sortie { x: ... , y: ... }
	         * @return {void}
	         */
	        onFriendWins: function onFriendWins(exit) {
	            out=true;
	            outx=exit.x;
	            outy=exit.y;
	        },

	        /**
	         * onResponseX - fonction appelée quand le jeux nous donne
	         * la position horizontale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseX: function onResponseX(hPosition) {
	            //1 je suis trop à gauche
	            //-1 je suis trop à droite
	            //0 je suis en face de la sortie
	        },

	        /**
	         * onResponseY - fonction appelée quand le jeux nous donne
	         * la position verticale relative de notre joueur par rapport à la sortie
	         *
	         * @param {number} hPosition
	         * @return {void}
	         */
	        onResponseY: function (vPosition) {
	            //1 je suis trop bas
	            //-1 je suis trop haut
	            //0 je suis en face de la sortie
	        },

	        /**
	        * action - fonction appelée par le moteur de jeu à chaque tour
	        * ici, il faut retourner un object qui décrit
	        * l'action que doit faire le bot pour ce tour.
	        *
	        * @param {object} position - la position actuelle de votre bot
	        * @param {number} round - le numéro de tour en cours
	        * @return {object} action - l'action à effectuer
	        */
	        action: function action(position, round, walls) {
	          if (round === 0) {
	            map = saveWall(walls, mapSize);
	          }
	          var x=0;
	          var y=0;
	          var choix = "";

	          if(out && !teleport){
	            choix = "teleport";
	          }else if(out && teleport){
	            choix = "move";
	          }



	          var action ={};
	          switch (choix){
	            case "move":
	              if(out && teleport){
	                x=outx-position.x;
	                y=outy-position.y;
	              }
	              action = {
	                action: "move",
	                params: {
	                  dx: x, //1 mouvement positif, -1 mouvement négatif, 0 aucun mouvement sur cet axe
	                  dy: y
	              }};
	              break;
	            case "ask":
	              action = {
	                action: "ask",
	                params: "x"
	              };
	              break;
	            case "teleport":
	              teleport=true;
	              var positionOut ={
	                x: outx,
	                y: outy
	              };
	              var resultMove = move(mapSize, positionOut, map, 1, 0);
	              x=positionOut.x+resultMove.x;
	              y=positionOut.y+resultMove.y;
	              action = {
	                action: "teleport",
	                params: {
	                    x: x,
	                    y: y
	              }};
	              break;
	          }
	            return action;
	        }
	    };
	}

	//---------------------------------------------------------------------------

	function saveWall(walls, mapSize) {
	  var map = new Array(mapSize);

	  for (var i in walls) {
	    var wall = walls[i];
	    var mapx = map[wall.x];
	    if(! (mapx instanceof Array)){
	      mapx=new Array(mapSize);
	    }
	    mapx[wall.y]=1;
	    map[wall.x]=mapx;
	  }
	  return map;
	}

	function move(mapSize, position, map, moveX, moveY) {
	  var testok=false;
	  for (var i = 0; i < 8 && !testok; i++) {
	    testok=testMove(mapSize, position, map, moveX, moveY);
	    if(!testok){
	      var tabMove = choixMouve(moveX, moveY);
	      moveX=tabMove.x;
	      moveY=tabMove.y;
	    }
	  }
	  return {x:moveX, y:moveY};
	}

	function testMove(mapSize, position, map, moveX, moveY) {
	  var testx=position.x+moveX;
	  var testy=position.y+moveY;
	  if (testx<0 || testx>=mapSize || testy<0 || testy>=mapSize ) {
	    return false;
	  }
	  if(map[testx] instanceof Array){
	    if(map[testx][testy] === 1){
	      return false;
	    }
	  }
	  return true;
	}

	function choixMouve(x, y){
	  if(x === 0 && y ===-1){//haut
	    return  {x:1 ,y:y};
	  }else if(x === 1 && y === -1){//hd
	    return  {x:x ,y:0};
	  }else if(x === 1 && y === 0){//d
	    return  {x:x ,y:1};
	  }else if(x === 1 && y === 1){//bd
	    return  {x:0 ,y:y};
	  }else if(x === 0 && y === 1){//b
	    return  {x:-1 ,y:y};
	  }else if(y === 1){//bg
	    return  {x:x ,y:0};
	  }else if(y === 0){//g
	    return  {x:x ,y:-1};
	  }else if(y === -1){//hg
	    return  {x:0 ,y:-1};
	  }else {
	    return {x:0 ,y:0};
	  }
	}

	module.exports = iaGenerator;


/***/ })
/******/ ]);