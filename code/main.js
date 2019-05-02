const fs = require('fs');
const xmlbuilder = require('xmlbuilder');

//### Data Input ###
const inputPath = "inputcasemodel.json";
const inputFile = fs.readFileSync(inputPath);

//### Creating JSON Objects ###
const caseModel = JSON.parse(inputFile);

const terminationConditions = caseModel.terminationconditions;  //has array of conditions
const fragments = caseModel.fragments;  //has array of fragments with precondition, name, content xml
const modelName = caseModel.name;  //just the Name of the Case Model
const startConditions = caseModel.startconditions;  // Unicorn query and array of Data Classes with mapping and name and state
const dataClasses = caseModel.domainmodel.dataclasses; //contains all Data Object Describtions

//### CPN Classes ###
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
        this.initialMarking = initialMarking;
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

class TokenColor {
    constructor(color, rgbcolor){
        this.color = color;
        this.rgbcolor = rgbcolor;
    }
}


//### Execution ###
var transIdCount = 0;
var placeIdCount = 0;
var stdGraphics = "TBD";
var transitions = [];
var places = [];
var tokenColorArray = [];

createNet();
createTransitions(fragments);
createPlaces(dataClasses);
createTokenColors(dataClasses);

function createNet(netName) {
    net = new Net(netName);
}

function createTransitions(fragments){
    fragments.forEach(function(fragment){
        transition = new Transition("t"+transIdCount++, fragment.name, stdGraphics, false);
        transitions.push(transition);
        //console.log(fragment);
    })
}

function createPlaces(dataClasses){
    dataClasses.forEach(function(dataClass){
        dataClass.olc.intermediateThrowEvent.forEach(function(state){
            place = new Place("p"+placeIdCount++, dataClass.name + "[" + state.name + "]", stdGraphics, null);
            places.push(place);
            //console.log(state.name);
        })
    })
}

function createTokenColors(dataClasses){
    dataClasses.forEach(function(dataClass){
        tokenColor = new TokenColor(dataClass.name, [0,0,0]);
        tokenColorArray.push(tokenColor);
    })
}


//### XML-Builder ###
buildCPN();

function buildCPN(cpn) {
    var pnml = xmlbuilder.create('pnml'); //Creates the nets XML
    pnml.att("xmlns","http://www.pnml.org/version-2009/grammar/pnml");

    var net = pnml.ele('net'); //Creating child of pnml
    net.att("id", "ParcelDelivery_Max");
    net.att("type", "http://ifnml.process-security.de/grammar/v1.0/cpnet");

    var page = net.ele('page'); //creating child of net
    page.att("id", "top-level");

    //Attach the Places, each is child of page
    places.forEach(function (place) {
        var pl = page.ele('place'); //create places node as child of page
        pl.att("id", place.id);
        var naming = pl.ele('name'); //create child of place
        var text = naming.ele('text', {}, place.name); //create child of name
        var namingGraphics = naming.ele('graphics');

        //TODO: Missing children of naming node, graphics, initial marking

        var graphics = pl.ele('graphics'); //create child of place

        if(place.initialMarking){ //only needed if place has initial marking
            var initialMarking = pl.ele('initialMarking'); //create child of place;
        }
    });

    //Attach the Transitions, each is child of page
    transitions.forEach(function (trans) {
        page.ele(trans.id);
    });


    var tokencolors = net.ele('tokencolors'); //creating child of net

    fs.writeFile('outputcpn.xml', pnml, (err) => {
        if (err) throw err;
        console.log("The file was succesfully saved!");
    });
}

//### Test-Blubber ###
test();

function test() {
    //console.log(modelName);
    //console.log(places);
    //console.log(domainModel.dataclasses[0].name);
    //let p01 = new Place("p01", "first", "blue", null);
    //console.log(p01);
    //console.log(cpn);
}
