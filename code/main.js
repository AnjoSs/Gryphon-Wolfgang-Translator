const fs = require('fs');
const xmlbuilder = require('xmlbuilder');

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
createTestArcs();
createTokenColors(dataClasses);


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


//### XML-Builder ###
buildCPN();

function buildCPN() {
    var pnml = xmlbuilder.create('pnml'); //Creates the nets XML
    pnml.att("xmlns","http://www.pnml.org/version-2009/grammar/pnml");

    var net = pnml.ele('net'); //Creating child of pnml
    net.att("id", modelName);
    net.att("type", "http://ifnml.process-security.de/grammar/v1.0/cpnet");

    var page = net.ele('page'); //creating child of net
    page.att("id", "top-level");

    //Attach the Places, each is child of page
    places.forEach(function (place) {
        var pl = page.ele('place'); //create places node as child of page
        pl.att("id", place.id);

        buildStdNameNode(pl, place.name);
        buildStdGraphicsNode(pl, place.graphics);

        //TODO: Missing children of initial marking
        if(place.initialMarking){/* //only needed if place has initial marking
            var initialMark = pl.ele('initialMarking'); //create child of place;
            var text = initialMark.ele('text', 1);
            var colors = initialMark.ele(colors);
            place.initialMarking.forEach( function (newColor) {
                var color = colors.ele('color', newColor);
            })
        */}
    });

    //Attach the Transitions, each is child of page
    transitions.forEach(function (trans) {
        var tr = page.ele('transition'); //create places node as child of page
        tr.att("id", trans.id);

        buildStdNameNode(tr, trans.name);
        buildStdGraphicsNode(tr, trans.graphics);

        tr.ele("silent", "false");

    });

    arcs.forEach(function (newArc) {
        var arc = page.ele('arc'); //create child of page
        arc.att("id", newArc.id);
        arc.att("source", newArc.source);
        arc.att("target", newArc.target);

        var arcGraphics = arc.ele('graphics');
        var line = arcGraphics.ele('line'); //create child of graphics
        line.att("color", "#000000");
        line.att("shape", "line");
        line.att("style", "solid");
        line.att("width", "1.0");

        var inscription = arc.ele('inscription');
        inscription.ele('text', 1);
        var arcColors = inscription.ele('colors'); //create child of inscription
        newArc.colors.forEach(function(newColor){
            arcColors.ele('color', newColor);
        });
        buildStdTextGraphicsNode(inscription);
    });

    var tokencolors = net.ele('tokencolors'); //creating child of net

    fs.writeFile('outputcpn.xml', pnml, (err) => {
        if (err) throw err;
        console.log("The XML was successfully saved!");
    });
    fs.writeFile('outputcpn.pnml', pnml, (err) => {
        if (err) throw err;
        console.log("The PNML was successfully saved!");
    });
}

function buildStdNameNode(parent, name){
    var naming = parent.ele('name'); //create child of place
    naming.ele('text', {}, name); //create child of name

    buildStdTextGraphicsNode(naming);

    var toolSpecific = naming.ele('toolspecific'); //create child of name
    toolSpecific.att("tool", "de.uni-freiburg.telematik.editor");
    toolSpecific.att("version", "1.0");
    toolSpecific.ele('visible', "true");
}

function buildStdTextGraphicsNode(parent){
    var namingGraphics = parent.ele('graphics'); //create child of name
    var namingOffset = namingGraphics.ele('offset'); //create child of naming Graphics
    namingOffset.att("x", "1.0");
    namingOffset.att("y", "30.0");
    var namingFill = namingGraphics.ele('fill'); //create child of naming Graphics
    namingFill.att("color", "transparent");
    namingFill.att("gradient-color", "none");
    var line = namingGraphics.ele('line'); //create child of naming Graphics
    line.att("color", "transparent");
    line.att("shape", "line");
    line.att("style", "solid");
    line.att("width", "1.0");
    var namingFont = namingGraphics.ele('font'); //create child of naming Graphics
    namingFont.att("align", "center");
    namingFont.att("family", "Dialog");
    namingFont.att("rotation", "0.0");
    namingFont.att("size", "11");
    namingFont.att("style", "normal");
    namingFont.att("weight", "normal");
}

function buildStdGraphicsNode(parent, graphics){
    var graphicsNode = parent.ele('graphics'); //create child of place
    var dimension = graphicsNode.ele('dimension'); //create child of graphics
    dimension.att('x', "45.0");
    dimension.att('y', "45.0");
    var position = graphicsNode.ele('position'); //create child of graphics
    position.att('x', graphics.posX);
    position.att('y', graphics.posY);
    var fill = graphicsNode.ele('fill'); //create child of graphics
    fill.att("color", graphics.fillColor);
    fill.att("gradient-color", "none");
    var line = graphicsNode.ele('line'); //create child of graphics
    line.att("color", "transparent");
    line.att("shape", "line");
    line.att("style", "solid");
    line.att("width", "1.0");
}