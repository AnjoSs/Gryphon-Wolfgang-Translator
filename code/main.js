const fs = require('fs');
const pnmlBuilder = require('./xml-build.js');

//### CPN Classes ###
const Place = require('./classes/place.js');
const Transition = require('./classes/transition.js');
const Graphics = require('./classes/graphics.js');
const TokenColor = require('./classes/tokenColor.js');

//### Data Input ###
const inputPath = process.argv[2] || (__dirname + "\\inputcasemodel.json");
const inputFile = fs.readFileSync(inputPath);

//### Creating JSON Objects ###
const caseModel = JSON.parse(inputFile);

//const terminationConditions = caseModel.terminationconditions;  //has array of conditions, currently unused
const fragments = caseModel.fragments;  //has array of fragments with precondition, name, content xml
const modelName = caseModel.name;  //just the Name of the Case Model
//const startConditions = caseModel.startconditions;  // Unicorn query and array of Data Classes with mapping and name and state, currently unused
const dataClasses = caseModel.domainmodel.dataclasses; //contains all Data Object Describtions


//### Execution ###
let transIdCount = 0; //The Memory Structure of pnml needs a continuous id for transitions and places, therefore a global id counter is necessary
let placeIdCount = 0;

const places = getPlaces(dataClasses); //generate places out of the input data classes
const transitions = getTransitions(fragments); //generate fragments out of input fragments
const tokenColors = getTokenColors(dataClasses); //generate Token Colors out of the input data classes

const pnml = pnmlBuilder.buildPnml(modelName, places, transitions, tokenColors); //builds the resulting pnml file

//### write the created pnml into a file ###
fs.writeFile('outputcpn.pnml', pnml, (err) => {
    if (err) throw err;
    console.log("The PNML was successfully saved!");
});


//### functions ###
function getPlaces(dataClasses){
    let placeArray = [];
    dataClasses.forEach(function(dataClass){
        dataClass.olc.intermediateThrowEvent.forEach(function(state){ //for each state of a dataclass defined in the specific olc a place is created
            graphics = new Graphics("#FFFFFF", 700, placeIdCount*100+100); //creates the places graphics, needed by the pnml builder
            place = new Place("p"+placeIdCount++, dataClass.name + "[" + state.name + "]", graphics, null); //create a new place with its attributes needed by the pnml builder
            placeArray.push(place);
        });
    });
    return placeArray;
}

function getTransitions(fragments){
    let transitionArray = [];
    fragments.forEach(function(fragment){ //for each fragment create a fragment
        graphics = new Graphics("#FFFFFF", 200, fragments.indexOf(fragment)*200+100); //create the transitions graphics, needed by the pnml builder
        transition = new Transition("t"+transIdCount++, fragment.name, graphics, false); //create a new transition with its attributes needed by the pnml builder
        //transition.calculateManualPreConditions(fragment); // This is currently unused
        transition.calculatePreAndPostConditions(fragment); // implement the logic of arcs between places and the fragment representing transitions
        const temp = transition.calculateArcs(places, transIdCount, placeIdCount); //calculate the transitions arcs and update the Id Counters
        transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
        placeIdCount = temp[1];
        transitionArray.push(transition);
    });
    return transitionArray;
}

function getTokenColors(dataClasses){
    let tokenColorArray = [];
    const colorArray = [[255,0,0], [0,255,0], [0,0,255], [255,0,255], [255,255,0], [0,255,255]]; //provide a set of example rgb colors
    dataClasses.forEach(function(dataClass){ //create a token color for each data class
        tokenColor = new TokenColor(dataClass.name, colorArray[dataClasses.indexOf(dataClass) % colorArray.length]); // the attribute color is chosen from the colorArray to provide variety
        tokenColorArray.push(tokenColor);
    });
    return tokenColorArray;
}