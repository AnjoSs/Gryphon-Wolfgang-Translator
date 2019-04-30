var fs = require('fs');



//### Data Input ###
const inputPath = "C:\\Users\\Ich\\PNML\\GryphonExports\\Parcel Delivery_Max.json";
const inputFile = fs.readFileSync(inputPath);



//### Creating JSON Objects ###
const caseModel = JSON.parse(inputFile);

const terminationConditions = caseModel.terminationconditions;  //has array of conditions
const fragments = caseModel.fragments;  //has array of fragments with precondition, name, content xml
const modelName = caseModel.name;  //just the Name of the Case Model
const startConditions = caseModel.startconditions;  // Unicorn query and array of Data Classes with mapping and name and state
const domainModel = caseModel.domainmodel; //contains all Data Object Describtions



//### CPN Classes ###
//TODO: All XML Objects necessary?
class Net {
    constructor(name){
        this.name = name;
    }
}

class Place {
    constructor(id, name, graphics, initialMarking){
        this.id = id;
        this.name = name;
        this.graphics = graphics;
        this.initialMarking =initialMarking;
    }
}

class Transition {
    constructor(id, name, graphics, silent){
        this.id = id;
        this.name = name;
        this.graphics = graphics;
        this.silent = silent;
    }
}

class Arc {
    constructor(id, source, target, graphics, inscription){
        this.id = id;
        this.source = source;
        this.target = target;
        this.graphics = graphics;
        this.inscription = inscription;
    }
}

class Token {
    constructor(color, rgbcolor){
        this.color = color;
        this.rgbcolor = rgbcolor;
    }
}

//### Execution ###


//### Test-Blubber ###
test();

function test() {
    console.log(modelName);
    console.log(fragments[0].name);
    console.log(domainModel.dataclasses[0].name);
    let p01 = new Place("p01", "first", "blue", null);
    console.log(p01);
}
