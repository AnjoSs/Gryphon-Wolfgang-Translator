const fs = require('fs');
const xmlbuilder = require('xmlbuilder');
const Arc = require('./classes/arc.js');

//This Class uses the npm module 'xmlbuilder' with a specific semantic.
//To get insight take a look at the documentation at https://www.npmjs.com/package/xmlbuilder.

module.exports = {
    buildPnml: function (modelName, places, transitions, tokenColorArray) {
        var pnml = xmlbuilder.create('pnml'); //Creates the XML
        pnml.att("xmlns", "http://www.pnml.org/version-2009/grammar/pnml"); //is needed by Wolfgang

        var net = pnml.ele('net'); //Creating child of pnml
        net.att("id", modelName);
        net.att("type", "http://ifnml.process-security.de/grammar/v1.0/cpnet");

        var page = net.ele('page'); //creating child of net
        page.att("id", "top-level"); //needed by wolfgang

        //Attach the Places, each is child of page
        places.forEach(function (place) { buildPlace(place, page) });

        //Attach the Transitions, each is child of page
        let usedArcs = [];
        transitions.forEach(function (trans) {
            buildTransition(trans, page); //build the trnsition
            trans.transitions.forEach(silentTrans => {buildTransition(silentTrans, page)}); //for each silent transition belonging to a transition build it
            trans.silentPrePlaces.forEach(place => {buildPlace(place, page)}); //for each pre condition belonging to a transition build a place
            trans.silentPostPlaces.forEach(place => {buildPlace(place, page)}); //for each post condition belonging to a transition build a place
            trans.arcs.forEach(arc => {
                if(!usedArcs.includes(arc.id)){ //assure that no arc is used twice, preventing errors in wolfgang
                    usedArcs.push(arc.id);
                    buildArc(arc, page);
                }
            });
        });

        buildTokenColors(tokenColorArray, net);

        return pnml;
    }
};

function buildTransition(trans, parent){
    var tr = parent.ele('transition'); //create places node as child of page
    tr.att("id", trans.id);
    buildStdNameNode(tr, trans.name);
    buildStdGraphicsNode(tr, trans.graphics);
    tr.ele("silent", "false");
}

function buildPlace(place, parent){
    var pl = parent.ele('place'); //create places node as child of page
    pl.att("id", place.id);
    buildStdNameNode(pl, place.name);
    buildStdGraphicsNode(pl, place.graphics);
    //Initial Marking is currently not supported
    /*if (place.initialMarking) {//only needed if place has initial marking
            var initialMark = pl.ele('initialMarking'); //create child of place;
            var text = initialMark.ele('text', 1);
            var colors = initialMark.ele(colors);
            place.initialMarking.forEach( function (newColor) {
                var color = colors.ele('color', newColor);
            })
    }*/
}

function buildArc(newArc, page){
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
    newArc.colors.forEach(function (newColor) {
        arcColors.ele('color', newColor);
    });
    buildStdTextGraphicsNode(inscription);
}

function buildTokenColors(tokenColorArray, parent){
    var tokenColors = parent.ele('tokencolors');
    tokenColorArray.forEach(ele => {
        var tokenColor = tokenColors.ele('tokencolor');
        tokenColor.ele('color', ele.color);
        var rgbColor = tokenColor.ele('rgbcolor');
        rgbColor.ele('r', ele.rgbcolor[0]);
        rgbColor.ele('g', ele.rgbcolor[1]);
        rgbColor.ele('b', ele.rgbcolor[2]);
    })

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