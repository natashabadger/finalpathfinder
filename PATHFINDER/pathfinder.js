'use strict'

// wait for the window to load and than call back setup()
window.addEventListener('load', setup, false);
var count = 0;
var cellId = 0;
var pf;   // the global path finder object
const TWO_PI = 6.28318530718;
const FRAME_RATE=30;

function setup() {
  pf = new PathFinder();
  window.setTimeout(draw, 100);    // wait 100ms for resources to load then start draw loop
}

function draw() {   // the animation loop
  pf.run();
  window.setTimeout(draw, 1000/FRAME_RATE);  // come back here every interval
}


class PathFinder{

  constructor(){
    // get and validate canvas and context
    this.canvas = document.getElementById('canvas');
    if (!this.canvas || !this.canvas.getContext)
    throw "No valid canvas found!";
    this.context = this.canvas.getContext("2d");
    if(!this.context)
    throw "No valid context found!";
    // pf properties

    this.isRunning = true;
    this.mouseX = 0;
    this.mouseY = 0;
    this.w = 45;
    this.done = false;
    // containerarrays for cells
    this.grid = [];
    this.enemies = [];     

    this.cols = Math.floor(this.canvas.width / this.w);
    this.rows = Math.floor(this.canvas.height / this.w);

    this.loadGrid();
    this.root = this.grid[this.cols - 1][this.rows -1];
    this.brushfire();
    //  add listeners
    // Every time the use clicks in a cell that cell becomes blocked
    // or unblocked and all the distances and parents need to
    // be determined again.
    this.canvas.addEventListener('mousedown',function(evt){
      pf.mouseX = evt.offsetX;
      pf.mouseY = evt.offsetY;
      let row = Math.floor(pf.mouseY/pf.w);
      let col = Math.floor(pf.mouseX/pf.w);
      // toggle the occupied property of the clicked cell
      pf.grid[col][row].occupied = !pf.grid[col][row].occupied;
      pf.brushfire();   // all new distances and parents
      // delete any enemy that is currently in a cell without a parent
      for(let i = 0; i < pf.enemies.length;  i++) {
        let enemy = pf.enemies[i];
        if(!enemy.currentCell.parent)
            enemy.kill = true;    // kill the orphans
        }
    }, false );

    this.canvas.addEventListener('mousemove',function(evt){
      pf.mouseX = evt.offsetX;
      pf.mouseY = evt.offsetY;
    }, false );
  
    var b = document.getElementById('buttOne'); // send enemy
    if(b) {
        b.addEventListener('mouseover',this.handleButtonMouseOver);
        b.addEventListener('mouseout',this.handleButtonMouseOut);
        b.addEventListener('click', this.sendEnemies);
        }
  
  }

    // brushfire()
    // starting with the 'root' cell, which is the bottom right cell of the grid
    // assign a "distance" to all other cells where the distance is the
    // accumulated steps from that cell to the root cell.
    // An adjacent neighbor has a step of 10
    // and a diagonal neighbor has a step of 14.
    
  brushfire() {
    // Initialize each cell in the grid to have a distance that
    // is the greatest possible.  Initialize each cell to 
    // have no parent and populate it's array of neighbors
    for(var i = 0; i < this.cols; i++){
      for(var j = 0; j < this.rows; j++){
        var cell = this.grid[i][j];
        cell.dist = this.cols * this.rows * 10;     // set distance to max
        cell.vec = null;    // clear parent vector
        cell.parent = 0;    // clear parent
        cell.addNeighbors(this,  this.grid); // fill the neighbors array
      }
    }
    // Initialize the fifo queue with the root cell
    this.root.dist = 0;
    this.root.occupied = false;
    var queue = [this.root];

    // loop as long as the queue is not empty, removing the first cell
    // in the queue and adding all its neighbors to the end of the
    // queue.  The neighbors will only be those that are not occupied
    // and not blocked diagonally.  
    while(queue.length) {    
        var current = queue.shift();   // remove the first cell from the queue
        // for all its neighbors...
        for(let j =0; j < current.neighbors.length; j++){
            let neighbor = current.neighbors[j];
            var dist = current.dist+10; // adjacent neighbors have a distance of 10
            if(current.loc.x != neighbor.loc.x && current.loc.y != neighbor.loc.y)
                dist = current.dist+14; // diagonal neighbors have a distance of 14
            // if this neighbor has not already been assigned a distance
            // or we now have a shorter distance, give it a distance
            // and a parent and push to the end of the queue.
            if(neighbor.dist > dist) {
                neighbor.parent = current;
                neighbor.dist = dist;
                queue.push(neighbor);
                }
          }     // for each neighbor
        }   // while(queue.length)
        
        // give each cell a vector that points to its parent
      for(var i = 0; i < this.cols; i++){
        for(var j = 0; j < this.rows; j++){
          this.grid[i][j].vec = this.grid[i][j].getVector();
        }
      }
  
    }

    // sendEnemies()
    // Send a random number of enemies, up to 5, each from a random location
    // in the top half of the grid.  About half of the enemies will take the
    // optimal path simply by following the parent chain and about half will
    // take a path of randomly choosing cells to be next on the path 
    // from all those cells with a distance to the root that is
    // less than its current location.    
    // A valid cell to start the enemy must have a parent because lack
    // of a parent means either it is occupied or it is blocked from any path.
    sendEnemies() {
        var numEnemies = Math.random() * 5;     // up to 5 enemies
        var row, col, startCell, i, j;
        for( i = 0; i < numEnemies; i++) {
            for(j = 0; j < 3; j++) { // try 3 times to find valid start cell
                let row = Math.floor(Math.random() * (pf.rows/2));    // top  half of rows
                let col = Math.floor(Math.random() * pf.cols);        // any column
                startCell = pf.grid[col][row];
                if(startCell && startCell.parent)   // must have a parent to have any path
                    break;
                }
            if(j < 3) { // if we found a valid cell to start the enemy
                let randomPath = Math.floor(Math.random() * 2);    // about half
                pf.enemies.push(new Enemy(pf, startCell, randomPath));
                }          
            }    
    }
    

  run(){
    this.render();
    for(let i = this.enemies.length-1; i >= 0; i--) {
        if(this.enemies[i].kill)
            this.enemies.splice(i,1);   // delete this dead enemy
        else this.enemies[i].run();
        }
    
  }//  End run++++++++++++++++++++++++++++++++++++++++++++++++++++

  render(){
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // render entire grid
    for(let i = 0; i < this.cols; i++){
      for(let j = 0; j < this.rows; j++){
        this.grid[i][j].render();
      }//loop
    }// loop
 

  } //  ++++++++++++++++++++++++++++++++++++++++  End Render
  // +++++++++++++++++++++++++++++++++++++++++++  load a 2D array with cells
  loadGrid(){
    for(var i = 0; i < this.cols; i++){
      this.grid[i] = [];
      for(var j = 0; j < this.rows; j++){
        this.grid[i][j] = new Cell(this, vector2d((i*this.w), (j*this.w)), ++cellId);
        // make 10% of the cells occupied
        if(this.grid[i][j] != this.root && Math.floor(Math.random()*100) < 10)   
            this.grid[i][j].occupied = true;
      }
    }

  }  // ++++++++++++++++++++++++++++++++++++++++++++++  End LoadGrid

  handleButtonMouseOver() {
    this.style.backgroundColor = '#AA3377';
  }

  handleButtonMouseOut() {
    this.style.backgroundColor = '#AAA';
  }



}/// pathfinder
