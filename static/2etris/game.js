var DEBUG = false;

var GRID_H = 34;
var GRID_W = 11;
var BLOCK_SIZE = 20;
var FREEZE_DELAY = 1;
var TURBO_MULTIPLIER = 4;

var BLOCK_SCORE = 10;
var LINE_MULTIPLE = 1.1;
var RUNNING = true;

var SPEED = .5;
var LINE_BOOST = .05;

var CONTROLS = {white: {rotate: 83, left: 81, right: 69, turbo: 87},
                black: {rotate: 38, left: 37, right: 39, turbo: 40}};

var SHAPES = [
    [[-1,0],[0,0],[1,0],[0,1]],
    [[-1,1],[-1,0],[0,0],[1,0]],
    [[-1,0],[0,0],[1,0],[1,1]],
    [[-1,0],[0,0],[1,0],[2,0]],
    [[-1,0],[0,0],[-1,1],[0,1]],
    [[-1,1],[0,1],[0,0],[1,0]],
    [[1,1],[0,1],[0,0],[-1,0]],
];

var HIGHLIGHT_COLORS = [
    "255,0,0",
    "255,255,0",
    "0,255,0",
    "0,255,255",
    "0,0,255",
    "255,0,255"
];

var BLOCKED = false;

var SERVER = false;
if (((new URL(document.location)).searchParams).get('server') == "true") {
    SERVER = true
}

var FB_MOVES_LIST = firebase.database().ref('moves_list');
var FB_GRID = firebase.database().ref('grid');
var FB_TETROMINOS = firebase.database().ref('tetromoinos_list');
if (SERVER) {
    FB_MOVES_LIST.remove();
    FB_GRID.remove();
    FB_TETROMINOS.remove();
}

function addPts(p,q) {
    return({x: p.x + q.x, y: p.y + q.y});
}

function scalePt(p,s) {
    return({x: p.x * s, y: p.y * s});
}

function mul(M,v) {
    return([(M[0][0] * v[0]) + (M[0][1] * v[1]),
            (M[1][0] * v[0]) + (M[1][1] * v[1])]);
}

function game() {
    
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext("2d");
    var lastFrame = new Date().getTime();
    
    var entities = [];
    var layers = {
        bgBlocks: {z: 1, drawings: []},
        blocks: {z: 3, drawings: []},
        effects: {z: 5, drawings: []}
    };
    
    
    DEBUG = {}
    DEBUG.entities = entities;
    
    
    tetromino.generate = function(color) {
	if (!SERVER) {
	    return
	}
        var shape = eval(JSON.stringify(SHAPES[Math.floor(SHAPES.length * Math.random())]));
        if (color == "black") {
            var y = -1 * BLOCK_SIZE;
            var v = {x: 0, y: BLOCK_SIZE};
        }
        if (color == "white") {
            var y = GRID_H * BLOCK_SIZE;
            var v = {x: 0, y: (-1 * BLOCK_SIZE)};
        }
        entities.push(new tetromino({
	    shape: shape,
	    width: 5*BLOCK_SIZE,
	    x: Math.floor(GRID_W/2) * BLOCK_SIZE,
	    y: y,
	    velocity: v,
	    color: color
	}));
    }
    
    highlight.row = function(row) {
        var rgb = HIGHLIGHT_COLORS[Math.floor(HIGHLIGHT_COLORS.length * Math.random())];
        entities.push(new highlight(0, row * BLOCK_SIZE, BLOCK_SIZE, GRID_W * BLOCK_SIZE, rgb, .5));
    };
    
    function setup() {
        var board = new scoreboard(0);
        var g = new grid(board);
        tetromino.prototype.grid = function() { return g; };
        entities.push(g);
	FB_TETROMINOS.remove();
        tetromino.generate("black");
        tetromino.generate("white");
    }

    function init() {
	var board = new scoreboard(0);
	var g = new grid(board);
	tetromino.prototype.grid = function() { return g; };
	entities.push(g);
	FB_TETROMINOS.on('child_added', function(fb_tet) {
	    entities.push(new tetromino(fb_tet.val(), fb_tet.ref));
	});
    }
    
    SERVER ? setup() : init();
	
    
    function update(delta) {
        
        for(var i=0; i<entities.length; i++) {
            entities[i].update(delta);
        }
        
        for(var i = entities.length - 1; i >= 0; i--) {
            if (entities[i].destroyed) {
                entities.splice(i,1);
            }
        }
                
    }

    function draw() {
        for(var i = 0; i < entities.length; i++) {
            entities[i].drawOn(layers);
        }
    }
    
    function render() {
        for (var layerName in layers) {
            for (var i=0; i < layers[layerName].drawings.length; i++) {
                layers[layerName].drawings[i](ctx);
            }
            layers[layerName].drawings = [];
        }
    }

    function loop(){
        if (!RUNNING) { return true }
        if (BLOCKED) { return false }
        BLOCKED = true
        var now = new Date().getTime();
        var delta = (now - lastFrame) / 1000;
        update(delta);
        draw();
        render();
        lastFrame = now;
        BLOCKED = false
    }
    
    function reset(){
        entities.forEach(function(e,a,i) {e.destroy()});
        update(0);
        setup();
        var lastFrame = new Date().getTime();
    }
    document.getElementById('reset_button').addEventListener("click", reset);
    
    var loopId = setInterval(loop, 16);
    
}


/****************************
*                           *
*   Grid class              *
*                           *
****************************/

function grid(scoreboard) {
    this.rows = 34
    this.cols = 11
    this.scoreboard = scoreboard;
    this.state = [[1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [1,1,1,1,1,1,1,1,1,1,1],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0],
                  [0,0,0,0,0,0,0,0,0,0,0]];
    if (SERVER) {FB_GRID.child('state').set(this.state);}
    that = this;
    FB_GRID.child('state').on("value",function(s) {
        that.state = s.val();
    });
}

grid.prototype.update = function(delta) {}

grid.prototype.set = function(row,col,color) {
    if (!SERVER) {
	return
    }
    FB_GRID.child('state/' + row + '/' + col).set(color);
}

grid.prototype.drawOn = function(layers) {
    for(var row=0; row < this.state.length; row++) {
        for (var col = 0; col < this.state[row].length; col ++) {
            if (this.state[row][col] == 0) {
                var color = "black"
            } else {
                var color = "white"
            }
            new block((col * BLOCK_SIZE), (row * BLOCK_SIZE), color, "bgBlocks").drawOn(layers);
        }
    }
}

grid.prototype.checkCollisions = function(piece, checkpoints) {
    var pieceType = piece._state['color'] == "black" ? 0 : 1;
    checkpoints = checkpoints ||["NW","NE","SW","SE"]
    for (var i = 0; i < piece.blocks.length; i++) {
        for (corner of checkpoints) {
            var row = Math.floor(piece.blocks[i][corner]().y / BLOCK_SIZE);
            var col = Math.floor(piece.blocks[i][corner]().x / BLOCK_SIZE);
            if (col < 0 || col >= GRID_W) {
                return true;
            }
            if (row < 0 || row >= GRID_H) {
                continue;
            }
            if (this.state[row][col] == pieceType) {
                return true;
            }
        }
    }
    return false;
}

grid.prototype.freeze = function(piece) {
    this.scoreboard.add(BLOCK_SCORE);
       
    var pieceType = piece.color == "black" ? 0 : 1;
    var testRows = [];
    for (var i = 0; i < piece.blocks.length; i++) {
        row = Math.floor(piece.blocks[i].center().y / BLOCK_SIZE);
        col = Math.floor(piece.blocks[i].center().x / BLOCK_SIZE);
        if (row < 0 || row > GRID_H - 1) {
	    RUNNING = false;
	    console.log("game over");
	    return;
	}
        this.set(row, col, pieceType);
        testRows.push(row);
    }
    
    testRows =  testRows.sort().filter(function(item, pos) {
        return !pos || item != testRows[pos - 1];
    });
    if (pieceType == 0) { testRows = testRows.reverse(); }
    
    // Check for complete rows:
    var state = this.state;
    var hoffset = 0;
    for (var i = 0; i < testRows.length; i++) {
        var row = testRows[i];
        if (state[row].every(function(cell,i,ary){return(cell == pieceType)})) {
            state.splice(row,1);
            highlight.row(row + hoffset);
            this.scoreboard.multiplier *= LINE_MULTIPLE;
            SPEED += LINE_BOOST;
            if (pieceType == 0) {
                hoffset -= 1;
                testRows = testRows.map(function(row,i,ary){return(row + 1)});
                state.splice(0,0,[1,1,1,1,1,1,1,1,1,1,1]);
            }
            if (pieceType == 1) {
                hoffset += 1;
                testRows = testRows.map(function(row,i,ary){return(row - 1)});
                state.push([0,0,0,0,0,0,0,0,0,0,0]);
            }
            
        }
    }
    FB_GRID.child('state').set(state);
};

grid.prototype.destroy = function() {this.destroyed = true;};

/****************************
*                           *
*   Block class             *
*                           *
****************************/

function block(x,y,color, blockLayer, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || BLOCK_SIZE;
    this.height = height || BLOCK_SIZE;
    this.color = color || "black";
    this.blockLayer = blockLayer || "blocks";
};

block.prototype.screenX = function() { return this.x; };
block.prototype.screenY = function() { return this.y; };

block.prototype.NW = function() {
    return {x: this.screenX() + 1, y: this.screenY()};
};
block.prototype.NE = function() {
    return {x: this.screenX() + this.width - 1, y: this.screenY()};
};
block.prototype.SW = function() {
    return {x: this.screenX() + 1, y: this.screenY() + this.height};
};
block.prototype.SE = function() {
    return {x: this.screenX() + this.width - 1, y: this.screenY() + this.height};
};

block.prototype.center = function() {
    return {x: this.screenX() + (this.width / 2),
            y: this.screenY() + (this.height / 2)};
};

block.prototype.update = function(delta) { };

block.prototype.drawOn = function(layers) {
    var that = this;
    layers[this.blockLayer].drawings.push(function(ctx) {   
        ctx.fillStyle = that.color;
        ctx.fillRect(that.screenX(), that.screenY(), that.width, that.height);
    });
};

block.prototype.destroy = function() { this.destroyed = true; };

/****************************
*                           *
*   Tetromino class         *
*                           *
****************************/


function tetromino(state, ref) {
    this._state = Object.assign({
	x: 0,
	y: 0,
	color: "black",
	shape: [[-1,0],[0,0],[0,1],[1,0]],
	velocity: {x: 0, y: 0},
    }, state);
    this._stateRef = ref || FB_TETROMINOS.push(this._state);
    
    this.width = BLOCK_SIZE;
    this.height = BLOCK_SIZE;
    this.blocks = [];
    this.turbo = 1;
    for(var i=0; i < this._state['shape'].length; i++) {
        blk = new block(this._state['x'] + (this._state['shape'][i][0] * BLOCK_SIZE) , this._state['y'] + (this._state['shape'][i][1] * BLOCK_SIZE), this._state['color'])
        this.blocks.push(blk)
    }

    // All of these handlers have to be stored on the object so that they can be cleaned up on destroy
    var that = this;
    this.keyDownListener = function(e) { e.preventDefault(); that.handleKeyDown(e);};
    this.keyUpListener = function(e) { e.preventDefault(); that.handleKeyUp(e,that);};
    window.addEventListener("keyup", this.keyUpListener);
    window.addEventListener("keydown", this.keyDownListener);
    
    this.fbMoveListener = function(d) { that.handleFbMove(d.val()); };
    FB_MOVES_LIST.on("child_added", this.fbMoveListener)

    this.fbStateCallback = function(s) {
	if (s.val() === null) {
	    that.destroy();
	    return;
	}
        that._state = s.val();
    }
    this._stateRef.on("value", this.fbStateCallback);
    
}

Object.defineProperty(tetromino.prototype, 'x', {
    get: function() { return this._state['x']; },
    set: function(x) {
	this._state['x'] = x;
	if (SERVER) {
	    this._stateRef.set(this._state);
	}
    }
});

Object.defineProperty(tetromino.prototype, 'y', {
    get: function() { return this._state['y']; },
    set: function(y) {
	this._state['y'] = y;
	if (SERVER) {
	    this._stateRef.set(this._state);
	}
    }
});

Object.defineProperty(tetromino.prototype, 'color', {
    get: function() { return this._state['color']; }
});

Object.defineProperty(tetromino.prototype, 'shape', {
    get: function() { return this._state['shape']; }
});

Object.defineProperty(tetromino.prototype, 'velocity', {
    get: function() { return this._state['velocity']; }
});		      		      

tetromino.prototype.positionBlocks = function() {
    for(var i=0; i < this.blocks.length; i++) {
        this.blocks[i].x = Math.floor(this.x) + (this.shape[i][0] * BLOCK_SIZE);
        this.blocks[i].y = Math.floor(this.y) + (this.shape[i][1] * BLOCK_SIZE);
    }
};

tetromino.prototype.update = function(delta) {
    
    if (this.frozen && new Date().getTime() - this.frozen > 1000 * FREEZE_DELAY) {
        this.grid().freeze(this);
        this.destroy();
        tetromino.generate(this.color);
    }
    
    this.x += this.velocity.x * delta * SPEED * this.turbo;
    this.y += this.velocity.y * delta * SPEED * this.turbo;
    this.positionBlocks();
    
    if (this.grid().checkCollisions(this)) {
        this.x -= this.velocity.x * delta * this.turbo;
        this.y -= this.velocity.y * delta * this.turbo;
        this.y = Math.round(this.y / BLOCK_SIZE) * BLOCK_SIZE;
        this.positionBlocks();
        this.frozen = this.frozen || new Date().getTime();
    } else {
        this.frozen = false;
    } 
};

tetromino.prototype.drawOn = function(layers) {
    for (var i=0; i < this.blocks.length; i++) {
        this.blocks[i].drawOn(layers);
    }
};

tetromino.prototype.handleKeyDown = function(e) {
    switch(e.keyCode) {
    case CONTROLS[this.color]["turbo"]:
	FB_MOVES_LIST.push({color: this.color, move: "turbo_on"});
        break;
    }
    
};

tetromino.prototype.handleKeyUp = function(e) {
    switch(e.keyCode) {
    case CONTROLS[this.color]["rotate"]:
        FB_MOVES_LIST.push({color: this.color, move: "rotate"});
        break;
    case CONTROLS[this.color]["left"]:
        FB_MOVES_LIST.push({color: this.color, move: "left"});
        break;
    case CONTROLS[this.color]["right"]:
        FB_MOVES_LIST.push({color: this.color, move: "right"});
        break;
    case CONTROLS[this.color]["turbo"]:
        FB_MOVES_LIST.push({color: this.color, move: "turbo_off"});
        break;
    } 
};

tetromino.prototype.handleFbMove = function(move) {
    if (move.color != this.color) { return; }
    switch(move.move) {
    case "rotate":
        this.rotate("L");
        break;
    case "left":
        this.shift("L");
        break;
    case "right":
        this.shift("R");
        break;
    case "turbo_on":
        this.turbo = TURBO_MULTIPLIER;
	break;
    case "turbo_off":
        this.turbo = 1;
        break;
    } 
};

tetromino.prototype.shift = function(dir) {
    switch (dir) {
    case "L":
        dir = {x: -1 * BLOCK_SIZE, y: 0};
        break;
    case "R":
        dir = {x: BLOCK_SIZE, y: 0};
        break;
    }
    this.x += dir.x;
    this.y += dir.y;
    this.positionBlocks();
    if (this.grid().checkCollisions(this)) {
        this.x -= dir.x;
        this.y -= dir.y;
        this.positionBlocks();
    
        // CHEATTT
        if (this.y % BLOCK_SIZE < 5 || BLOCK_SIZE - (this.y & BLOCK_SIZE) < 3) {
            var oldx = this.x;
            var oldy = this.y;
            this.y = Math.round(this.y / BLOCK_SIZE) * BLOCK_SIZE;
            this.x += dir.x;
            this.y += dir.y;
            this.positionBlocks();
            if (this.grid().checkCollisions(this, ["center"])) {
                this.x = oldx;
                this.y = oldy;
                this.positionBlocks();
            }
        }
    }
};

tetromino.prototype.rotate = function(M) {
    switch (M) {
    case "L":
        M = [[0,-1],[1,0]];
        break;
    case "R":
        M = [[0,1],[-1,0]];
        break;
    }
    
    var oldShape = this.shape.slice(0);
    
    for(var i=0; i < this.shape.length; i++) {
        this.shape[i] = mul(M,this.shape[i]);
    }
    
    this.positionBlocks();
    if (this.grid().checkCollisions(this)) {
        this.shape = oldShape;
        this.positionBlocks();
    }
    
};

tetromino.prototype.destroy = function() {
    this.destroyed = true;
    if (SERVER) {
	this._stateRef.off("value", this.fbStateCallback);
	this._stateRef.remove();
    }
    window.removeEventListener("keyup", this.keyUpListener);
    window.removeEventListener("keydown", this.keyDownListener);
}


/****************************
*                           *
*   Highlight class         *
*                           *
****************************/

function highlight(x, y, height, width, rgb, duration) {
    this.x = x || 0;
    this.y = y || 0;
    this.height = height || 10;
    this.width = width || 10;
    this.rgb = rgb || '255,255,0';
    this.duration = duration || 1;
    
    this.color = "rgb(" + this.rgb + ")";
    this.created = new Date().getTime();
}

highlight.prototype.update = function(delta) {
    var elapsed = ((new Date().getTime() - this.created) / 1000);
    if (elapsed > this.duration) {
        this.destroy();
    } else {
        var alpha = 1 - (elapsed / this.duration);
        this.color = "rgba(" + this.rgb + "," + alpha + ")";
    }
    
}

highlight.prototype.destroy = function() { this.destroyed = true };

highlight.prototype.drawOn = function(layers) {
    new block(this.x, this.y, this.color, "effects", this.width, this.height).drawOn(layers);
};


/****************************
*                           *
*   Scoreboard class        *
*                           *
****************************/

function scoreboard(score) {
    this.score = score || 0;
    this.multiplier = 1;
    this.highscore = parseInt(localStorage.getItem("highscore"));
    this.highscore = this.highscore || 0;
    this.add(0);
}

scoreboard.prototype.add = function(pts) {
    this.score += Math.floor(pts * this.multiplier);
    document.getElementById("score").textContent = this.score;
    
    if (this.score > this.highscore) {
        this.highscore = this.score;
        localStorage.setItem("highscore", this.highscore);
    }
    document.getElementById("high_score").textContent = this.highscore;
};
