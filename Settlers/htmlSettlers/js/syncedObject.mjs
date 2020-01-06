
const hiddenObj = {};
let s = undefined;

function send(set){
    if (s){
        s.emit('val',set)
    }
}

//send single param
const handler = {
    set(obj, prop, value){
        /*if(typeof(set.value) == "object"){
            obj[prop] = {};
            obj[prop] = new Proxy(obj[prop], this);
    
        } else {
            obj[prop] = value;
        }*/
        obj[prop] = value; //actually set
        send({prop, value});// emit to other
    },
    get(obj, prop){

    }
}



export const synced = new Proxy(hiddenObj, handler);
export function setSyncedSocket(socket){
    s = socket;
}

function setValue(){
    if(typeof(set.value) == "object"){
        hiddenObj[set.prop] = {};

    } else {
        hiddenObj[set.prop] = set.value;
    }
}

export function syncedRegisterHandler(so){
    so.on('val',function(set){
        console.log(set);

        //setValue(hiddenObj,set);

        hiddenObj[set.prop] = set.value;
        

        //send to others if server
        if(so.broadcast){
            so.broadcast.emit('val',set);
        }
    });
}

/*
//send entire object
synced.sendAll = function(s){
    s.emit('valall', hiddenObj);
}

//recive entire object
socket.on('valAll', function(obj){
    hiddenObj = obj;
})
*/


export default synced;