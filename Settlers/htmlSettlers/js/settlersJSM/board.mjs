import hex from '../settlersJSM/hex.mjs';
import Road from '../settlersJSM/road.mjs';
import * as THREE from '../build/three.module.js';


const BRICK= "brick";
const WOOD= "wood";
const WHEAT= "wheat";
const WOOL= "wool";
const ROCK= "rock";
const DESERT= "desert";
const WATER = "water";



function mixArray(arr){
    length = arr.length;
    let temp;
    let rand;
    for(let i = length-1; i>=0; i--){
        rand = Math.floor(Math.random()*i);
        temp = arr[i];
        arr[i] = arr[rand];
        arr[rand] = temp;
    }
}


//all nodes (hexes) on the board
//The first node is located at 0,0, the others are connected to the edges
let nodeDataList = [];

let nodeList = []; 

let edgeList = [];

let vertexList = [];

class boardNode{ // hexagons
    constructor(hexData, nodeIndex, 
        edgeIndexList=[undefined,undefined,undefined,undefined,undefined,undefined], 
        vertexIndexList=[undefined,undefined,undefined,undefined,undefined,undefined]){
        this.nodeIndex = nodeIndex; // the index in the global node list
        // edges index 0 is top, goes clockwise
        //   0 / \ 1             
        //  5 |   | 2   
        //   4 \ / 3 
        //
        // verticies index
        //      0
        //  5  / \ 1
        //    |   |
        //  4  \ / 2
        //      3
        this.edgeIndexList = edgeIndexList;
        this.vertexIndexList = vertexIndexList;
        this.hexData = hexData; //game properties of the node
    }

    // Connects the edges and verticies of two nodes together
    // The edge number is relative to this node
    // The node must not have existing edges or verticies
    connectToNodeViaEdge(node, edgeNum){
        //parameter check
        
        let otherEdgeNum = (edgeNum+3)%6; //edge index of other node
        if((edgeNum < 0) && (edgeNum >= 6)) throw new Error("Invalid edge to connect node");
        if(this.edgeIndexList[edgeNum] != undefined) throw new Error("This edge is already taken")
        
        if(node != undefined){
            if(node.edgeIndexList[otherEdgeNum] != undefined) throw new Error("The other edge is already taken"); 
            
            //new verticies
            let vertex1Index = edgeNum //clockwise edge
            let vertex1 = undefined;
            if(this.vertexIndexList[vertex1Index] == undefined){ 
                vertex1 = new boardVertex(vertexList.length);
                vertex1.addNode(this.nodeIndex);
                vertex1.addNode(node.nodeIndex);
                vertexList.push(vertex1);
                this.vertexIndexList[vertex1Index] = vertex1.vertexIndex;
            } else { //already exists
                vertex1 = vertexList[this.vertexIndexList[vertex1Index]];
                vertex1.addNode(node.nodeIndex);
            }
            node.vertexIndexList[(vertex1Index+2)%6] = vertex1.vertexIndex;

            //vertex 2
            let vertex2Index = (edgeNum+5)%6 //counter clockwise edge

            let vertex2 = undefined;
            if(this.vertexIndexList[vertex2Index] == undefined){ 
                vertex2 = new boardVertex(vertexList.length);
                vertex2.addNode(this.nodeIndex);
                vertex2.addNode(node.nodeIndex);
                vertexList.push(vertex2);
                this.vertexIndexList[vertex2Index] = vertex2.vertexIndex;
            } else { //already exists
                vertex2 = vertexList[this.vertexIndexList[vertex2Index]];
                vertex2.addNode(node.nodeIndex);
            }
            node.vertexIndexList[(vertex2Index+4)%6] = vertex2.vertexIndex;
            
            //new edge
            let newEdgeIndex = edgeList.length;
            let newEdge = new boardEdge(newEdgeIndex, [this.nodeIndex, node.nodeIndex], [vertex1.vertexIndex, vertex2.vertexIndex]);
            edgeList.push(newEdge);
            this.edgeIndexList[edgeNum] = newEdgeIndex;
            node.edgeIndexList[otherEdgeNum] = newEdgeIndex;

            vertex1.addEdge(newEdgeIndex);
            vertex2.addEdge(newEdgeIndex);
        } else {
            throw new Error("Undefined node");
        }
    }
}

// represents edge on board
// node and vertex indicies have no order
class boardEdge{ //roads
    constructor(edgeIndex, nodeIndexList=[undefined, undefined], vertexIndexList=[undefined, undefined]){
        this.edgeIndex = edgeIndex;

        //connects two nodes together
        this.nodeIndexList = nodeIndexList;
        //connects two vertexes together
        this.vertexIndexList = vertexIndexList;
    }


    getOtherNode(nodeIndex){
        if(this.nodeIndexList[0]==nodeIndex) return this.nodeIndexList[1];
        if(this.nodeIndexList[1]==nodeIndex) return this.nodeIndexList[0];
        throw new Error("node not connected to edge");
    }
}

// represents verticies on the board
// edges index
//      0 |       1\ / 2
//     2 / \ 1    0 |
//
// nodes index
//    0  |  1       \ 2 /
//     / 2 \       1  |  0
class boardVertex{ //cities
    constructor(vertexIndex, nodeIndexList = [undefined,undefined,undefined]){
        this.vertexIndex = vertexIndex;
        this.nodeIndexList = nodeIndexList;
        this.edgeIndexList = [undefined,undefined,undefined];
    }

    addNode(nodeIndex){
        for(let i = 0; i<3; i++){
            if(this.nodeIndexList[i] == nodeIndex){
                return;
            } else if (this.nodeIndexList[i] == undefined){ 
                this.nodeIndexList[i] = nodeIndex;
                return;
            }
        }
        throw new Error("Vertex full of node connections")
    }

    addEdge(edgeIndex){
        for(let i=0; i<3; i++){
            if(this.edgeIndexList[i] == edgeIndex){
                return
            } else if(this.edgeIndexList[i] == undefined){
                this.edgeIndexList[i] = edgeIndex;
                return;
            }
        }
        throw new Error("Vertex full of edge connections");
    }
}

/*
function upleft(index){
    switch(index){
        case 0,1,2,3,7:
            return undefined;
            break;
        case 4,5,6, 16,17,18:
            return index-4;
            break;
        case 8,9,10,11,12,13,14,15:
            return index-5;
            break;
        default: return undefined;
    }
}

function upright(index){
    switch(index){
        case 0,1,2,6,11:
            return undefined;
            break;
        case 3,4,5,16,17,18:
            return index-3;
            break;
        case 7,8,9,10,12,13,14,15:
            return index-4;
            break;
        default: return undefined;
    }
}

function right(index){
    switch(index){
        case 2,6,11,15,18:
            return undefined;
            break;
        case 0,1,3,4,5,7,8,9,10,12,13,14,16,17:
            return index+1;
            break;
        default: return undefined;
    }
}

function downright(index){
    switch(index){
        case 11,15,16,17,18:
            return undefined;
            break;
        case 0,1,2,12,13,14:
            return index+4;
            break;
        case 3,4,5,6,7,8,9,10:
            return index+5;
            break;
        default: return undefined;
    }
}

function downleft(index){
    switch(index){
        case 7,12,16,17,18:
            return undefined;
            break;
        case 0,1,2,13,14,15:
            return index+3;
            break;
        case 3,4,5,6,8,9,10,11:
            return index+4;
            break;
        default: return undefined;
    }
}

function left(index){
    switch(index){
        case 0,3,7,12,16:
            return undefined;
            break;
        case 1,2,4,5,6,8,9,10,11,13,14,15,17,18:
            return index-1;
            break;
        default: return undefined;
    }
}*/

class Board extends THREE.Group {
    constructor(){
        super();
        
        //create nodeList

        //numbers to be assigned to tiles
        //let valueArray = [2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12];
        let valueArray = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19];
        //randomize numbers
        //mixArray(valueArray);

        //make tiles, desert must go last to not have number
        let TileArray = [
            BRICK,BRICK,BRICK,
            WOOD,WOOD,WOOD,WOOD,
            WOOL,WOOL,WOOL,WOOL,
            WHEAT,WHEAT,WHEAT,WHEAT,
            ROCK,ROCK,ROCK,
            DESERT
        ];

        //randomize types
        //mixArray(TileArray);

        // make node data list
        for(let i=0;i<19;i++){
            nodeDataList.push({type: TileArray[i], value: valueArray[i]});
        }

        // make board edge
        for(let i=0;i<18;i++){
            nodeDataList.push({type: WATER, value: valueArray[i]});
        }

        debugger;
        let currentNum = 0;
        let nodeQueue = [0];
        let currentNode = undefined;
        let nextNode = new boardNode(nodeDataList[currentNum], nodeList.length)
        nodeList.push(nextNode);
        
        while(currentNum < 18){
            //remove from queue
            currentNum = nodeQueue.shift();
            currentNode = nodeList[currentNum];

            //for each edge, add to queue and connect edges
            for(let i=0; i<6;i++){
                if(currentNode.edgeIndexList[i] == undefined){
                    //add to queue
                    //make new node object
                    let nextNodeIndex = nodeList.length;
                    nextNode = new boardNode(nodeDataList[nextNodeIndex], nextNodeIndex)
                    nodeList.push(nextNode);

                    nodeQueue.push(nextNodeIndex);

                    //connect edges
                    //between this and new
                    currentNode.connectToNodeViaEdge(nextNode, i);
                    
                    //one minus
                    let minusI = (i+5)%6;

                    let edgeIndexToMinus = currentNode.edgeIndexList[minusI];
                    if( edgeIndexToMinus != undefined){
                        let minusNodeIndex = edgeList[edgeIndexToMinus].getOtherNode(currentNode.nodeIndex);
                        if(minusNodeIndex != undefined){
                            let minusNode = nodeList[minusNodeIndex];
                            let minusNodeEdge = (minusI+5+3)%6;
                            minusNode.connectToNodeViaEdge(nextNode,minusNodeEdge);
                        }
                    }


                    //one plus
                    let plusI = (i+1)%6;

                    let edgeIndexToPlus = currentNode.edgeIndexList[plusI];
                    if( edgeIndexToPlus != undefined){
                        let plusNodeIndex = edgeList[edgeIndexToPlus].getOtherNode(currentNode.nodeIndex);
                        if(plusNodeIndex != undefined){
                            let plusNode = nodeList[plusNodeIndex];
                            let plusNodeEdge = (i+2+3)%6;
                            plusNode.connectToNodeViaEdge(nextNode,plusNodeEdge);
                        }
                    }
                }
            }
        }
        console.log(nodeList);


        /*
        //build in a circle for now
        let indexQueue = [0];
        let indexStack = [];
        let nodeConnectionsList = [];
        for(let i = 18; i >= 0; i--){
            indexStack.push(i);
            nodeConnectionsList.push([undefined,undefined,undefined, undefined, undefined, undefined]);
        }

        while(indexStack.length > 0){
            let currentIndex = indexQueue.pop();
            for(let i = 0; i < 19; i++) { //each edge
                if(indexStack.length>0){

                }
            }
        }

        for(let i = 0; i < 19; i++){
            let val = valueArray[valueindex];
            if(TileArray[i] == DESERT){val = 0;}
            nodeList.push(new boardNode({type:TileArray[i], number: val, visited: false}, nodeList.length-1));
        }
        //mix all tiles, the first hex will be in the center
        mixArray(TileArray);
        */
       
        
        /*let nodeQueue = [nodeList[0]];
        
        while(nodeQueue.length > 0){
            let currentNode = nodeQueue.pop();
            for(let i = 0; i < 19; i++){ //all sides
                if(currentNode){}
            }
        }*/


        let y = -2;
        let x = -1;

        let valueindex = 0;
        for(let i = 0; i < 19; i++){
            let val = valueArray[i];
            //if(TileArray[i] == DESERT){val = 0} else{ valueindex++;}
            let h = new hex(TileArray[i], val);

            //h.position.x = (2*Math.random()-1)*spawnArea.x;
            //h.position.z = (2*Math.random()-1)*spawnArea.y;
            
            
            h.adjustXY(x,y);
            this.add(h);

            x++;
            switch(i){
                case 2:
                    x = -1.5;
                    y++;
                break;
                case 6:
                    x = -2;
                    y++;
                break;
                case 11:
                    x = -1.5;
                    y++;
                break;
                case 15:
                    x = -1;
                    y++;
                break;
                default:
            }
        }

        //h.position.y = .1;

        let r = new Road();
        //r.adjustXY()
        r.position.y = .01;
        r.position.x = -.075
        this.add(r);
    }
}

export default Board;