const fs = require('fs');
const pnmlBuilder = require('./xml-build.js');
var parseString = require('xml2js').parseString;

//### CPN Classes ###
const Place = require('./place.js');
const Transition = require('./transition.js');
const Graphics = require('./graphics.js');
const Arc = require('./arc.js');
const TokenColor = require('./tokenColor.js');

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


//### Execution ###
var transIdCount = 0;
var placeIdCount = 0;
var places = [];
var transitions = [];
var arcs = [];
var tokenColorArray = [];

createTransitions(fragments);
createPlaces(dataClasses);
createArcs(fragments);
createTestArcs();
createTokenColors(dataClasses);

//### XML-Builder ###
pnmlBuilder.buildPnml(modelName, places, transitions, arcs, tokenColorArray);

function createTransitions(fragments){
    fragments.forEach(function(fragment){
        graphics = new Graphics("#FFFFFF", 100, transIdCount*100+100);
        transition = new Transition("t"+transIdCount++, fragment.name, graphics, false);
        transitions.push(transition);
        //console.log(fragment);
    })
}

function createPlaces(dataClasses){
    dataClasses.forEach(function(dataClass){
        dataClass.olc.intermediateThrowEvent.forEach(function(state){
            graphics = new Graphics("#FFFFFF", 300, placeIdCount*100+100);
            place = new Place("p"+placeIdCount++, dataClass.name + "[" + state.name + "]", graphics, null);
            places.push(place);
            //console.log(state.name);
        })
    })
}

function createArcs(fragments){
    fragments.forEach(function (fragment){
        parseString(fragment.content, function (err, result) {
            //console.log(result['bpmn:definitions']['bpmn:process']);
        })
    })
}

function createTestArcs(){
    arc = new Arc("arcTP_t0p1", "t0", "p1",  ["DCParcel"]);
    arcs.push(arc);
}

function createTokenColors(dataClasses){
    dataClasses.forEach(function(dataClass){
        tokenColor = new TokenColor(dataClass.name, [0,0,0]);
        tokenColorArray.push(tokenColor);
    })
}
