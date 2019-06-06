var parseString = require('xml2js').parseString;
const Arc = require('./arc.js');
const Graphics = require('./graphics.js');
const Place = require('./place.js');

class Transition {
    constructor(id, name, graphics, silent){
        this.id = id;
        this.name = name;
        this.graphics = graphics;
        this.silent = silent;
    }

    calculateManualPreConditions(fragment){ //currently unused and not supported
        this.manualPreConditions = fragment.preconditions;
    }

    //### Logic behind the translation of fragments data objects into arcs to the according place ###
    calculatePreAndPostConditions(fragment){
        this.preConditions = [];
        this.postConditions = [];
        this.dataOutputs = [];
        this.dataInputs = [];
        parseString(fragment.content, {explicitArray: false}, (err, result) => {
            const processModel = result['bpmn:definitions']['bpmn:process'];
            //console.log(processModel);
            const startEvent = processModel['bpmn:startEvent'];
            //console.log(startEvent);
            this.parseNextNode(processModel, startEvent['bpmn:outgoing']);
        });

        this.preConditions = this.dataInputs.filter(input => {return !this.dataOutputs.includes(input)});
        //console.log(this.preConditions);
        this.postConditions = this.dataOutputs.filter(output => {return !this.dataInputs.includes(output)});
        //console.log(this.postConditions);
    }

    //### Parsing Through the Fragments nodes###
    parseNextNode(processModel, outgoing){
        var nodes = [];

        //currently only the parsing through tasks is possible.
        //To enable other bpmn elements they have to be added into nodes[] here, like the 'bpmn:task', for instance: 'bpmn:servicetask'...
        if(Array.isArray(processModel['bpmn:task'])){
            nodes.push(...processModel['bpmn:task']);
        }else{
            nodes.push(processModel['bpmn:task']);
        }

        const nextNode = nodes.find(task => task['bpmn:incoming'] === outgoing); //find the bpmn element having the incoming arc the current has as outgoing

        if(nextNode != undefined){
            this.getDataInputs(processModel, nextNode); //read the incoming Data objects
            this.getDataOutputs(processModel, nextNode); //read the outgoing Data objects
            this.parseNextNode(processModel, nextNode['bpmn:outgoing']); //proceed with the next node
        }
        return 0;
    }

    getDataInputs(processModel, node){
        const dataInputAssociations = node['bpmn:dataInputAssociation'];
        const dataInputRef = []; //contains all references of Data Objects going into the node
        if(Array.isArray(dataInputAssociations)){
            dataInputAssociations.forEach(function (input){
                dataInputRef.push(input['bpmn:sourceRef']);
            });
        }else{
            dataInputRef.push(dataInputAssociations['bpmn:sourceRef']);
        }
        this.dataInputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataInputRef.includes(ref.$.id)})); //push all of the models Data Objects into dataInputs, that have one of the nodes input references
    }

    getDataOutputs(processModel, node){
        const dataOutputAssociations = node['bpmn:dataOutputAssociation'];
        const dataOutputRef = []; //contains all references of Data Objects coming out of the node
        if(Array.isArray(dataOutputAssociations)){
            dataOutputAssociations.forEach(function (input){
                dataOutputRef.push(input['bpmn:targetRef'])
            });
        }else{
            dataOutputRef.push(dataOutputAssociations['bpmn:targetRef']);
        }
        this.dataOutputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataOutputRef.includes(ref.$.id)})); //push all of the models Data Objects into dataOutputs, that have one of the nodes output references
    }

    calculateArcs(places, transIdCount, placeIdCount){
        this.arcs = [];
        this.transitions = [];

        const temp = this.calculateIncomingArcs(places, transIdCount, placeIdCount);
        transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
        placeIdCount = temp[1];
        const temp2 = this.calculateOutgoingArcs(places, transIdCount, placeIdCount);
        transIdCount = temp2[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
        placeIdCount = temp2[1];
        return [transIdCount, placeIdCount];
    }


    //### Calculation of Incoming Arcs ###
    calculateIncomingArcs(places, transIdCount, placeIdCount){
        this.silentPrePlaces = [];
        this.preConditions.forEach(preCondition => {
            const temp = this.createIncomingArc(places, transIdCount, placeIdCount, preCondition); //for each preCondition build the specific arc
            transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
            placeIdCount = temp[1];
        });

        this.silentPrePlaces.forEach(place => { //while creating the arcs additional places can be necessary, the arcs from place to transition are built here.
            var arcColor = [place.name];
            var arc = new Arc('arcPT_' + place.id + this.id, place.id, this.id, arcColor);
            this.arcs.push(arc);
        });
        return [transIdCount, placeIdCount];
    }

    createIncomingArc(places, transIdCount, placeIdCount, preCondition){
        var arcColor = [preCondition.$['griffin:dataclass']]; //get the token color the arc should allow

        let needsPrePlace = false;
        this.preConditions.forEach(preCon => { //iterate through all preconditions to see if there are other preconditions with the same dataclass
            let temp = ((preCon.$['griffin:dataclass'] === preCondition.$['griffin:dataclass'] && preCon != preCondition) || needsPrePlace); //check if each preconditions dataclass is equal to this preconditions dataclass and the precondition itself is not equal to this precondition
            needsPrePlace = temp;
        });

        if(needsPrePlace){
            const temp = this.handlePrePlace(places, transIdCount, placeIdCount, preCondition);
            transIdCount = temp[0];
            placeIdCount = temp[1];
        }else{
            var sourcePlace = places.find(place => {return place.name === preCondition.$['name']});
            var arc = new Arc('arcPT_' + sourcePlace.id + this.id, sourcePlace.id, this.id, arcColor);
            this.arcs.push(arc);
        }
        return [transIdCount, placeIdCount];
    }

    handlePrePlace(places, transIdCount, placeIdCount, preCondition){
        var neededPrePlace = this.silentPrePlaces.find(place => {return place['name'] === preCondition.$['griffin:dataclass']});
        if(neededPrePlace === undefined){//if needed prePlace does not exist, add one
            const temp = this.createPrePlace(placeIdCount, preCondition);
            neededPrePlace = temp[0]; //the neededPostPlace and placeIdCount have to be updated
            placeIdCount = temp[1];
        }
        var graphics = new Graphics("#FFFFFF", this.graphics.posX - 100, this.graphics.posY + 100 * this.preConditions.indexOf(preCondition) - 50);
        var silentPreTransition = new Transition('t'+transIdCount++, '', graphics, true);
        this.transitions.push(silentPreTransition);

        var sourcePlace = places.find(place => {return place.name === preCondition.$['name']});

        var arcColor = [preCondition.$['griffin:dataclass']];
        var arc1 = new Arc('arcPT_' + sourcePlace.id + silentPreTransition.id, sourcePlace.id, silentPreTransition.id, arcColor);
        this.arcs.push(arc1);
        var arc2 = new Arc('arcTP_' + silentPreTransition.id + neededPrePlace['id'], silentPreTransition.id, neededPrePlace['id'], arcColor);
        this.arcs.push(arc2);

        return[transIdCount, placeIdCount];
    }

    createPrePlace(placeIdCount, postCondition){
        var graphics = new Graphics("#FFFFFF", this.graphics.posX - 100, this.graphics.posY); //create graphics for the place
        var silentPlace = new Place('p' + placeIdCount++, postCondition.$['griffin:dataclass'], graphics, []); //create new place
        this.silentPrePlaces.push(silentPlace);
        return [silentPlace, placeIdCount];
    }


    //### Calculation of Outgoing Arcs ###
    calculateOutgoingArcs(places, transIdCount, placeIdCount){
        this.silentPostPlaces = [];
        //console.log(this.postConditions);
        this.postConditions.forEach(postCondition => {
            const temp = this.createOutgoingArc(places, transIdCount, placeIdCount, postCondition); //for each postCondition build the specific arc
            transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
            placeIdCount = temp[1];
        });

        this.silentPostPlaces.forEach(place => {
            var arcColors = [place.name];
            var arc = new Arc('arcTP_' + this.id + place.id, this.id, place.id, arcColors);
            this.arcs.push(arc);
            //console.log(arc);
        });
        return [transIdCount, placeIdCount];
    }

    createOutgoingArc(places, transIdCount, placeIdCount, postCondition){
        var arcColor = [postCondition.$['griffin:dataclass']];
        let needsPostPlace = false;
        this.postConditions.forEach(postCon => { //iterate through all postconditions to see if there are other postconditions with the same dataclass
            let temp = ((postCon.$['griffin:dataclass'] === postCondition.$['griffin:dataclass'] && postCon != postCondition) || needsPostPlace); //check if each postconditions dataclass is equal to this postconditions dataclass and the postcondition itself is not equal to this postcondition
            needsPostPlace = temp;
        });

        if(needsPostPlace){
            const temp = this.handlePostPlace(places, transIdCount, placeIdCount, postCondition);
            transIdCount = temp[0];
            placeIdCount = temp[1];
        }else{
            var targetPlace = places.find(place => {return place.name === postCondition.$['name']});
            var arc = new Arc('arcTP_' + this.id + targetPlace.id, this.id, targetPlace.id, arcColor);
            this.arcs.push(arc);
        }

        return [transIdCount, placeIdCount];
    }

    handlePostPlace(places, transIdCount, placeIdCount, postCondition){
        var arcColor = [postCondition.$['griffin:dataclass']];
        var neededPostPlace = this.silentPostPlaces.find(place => {return place['name'] === postCondition.$['griffin:dataclass']});
        if(neededPostPlace === undefined){//if needed postPlace does not exist, add one
            const temp = this.createPostPlace(placeIdCount, postCondition);
            neededPostPlace = temp[0]; //the neededPostPlace and placeIdCount have to be updated
            placeIdCount = temp[1];
        }
        var graphics = new Graphics("#FFFFFF", this.graphics.posX + 100, this.graphics.posY + 100 * this.postConditions.indexOf(postCondition) - 50);
        var silentPostTransition = new Transition('t'+transIdCount++, '', graphics, true); //create a new transition following the needed place to the target place
        this.transitions.push(silentPostTransition);

        var targetPlace = places.find(place => {return place.name === postCondition.$['name']});

        //create arcs from the new place to the new transition and from transition to target place
        var arc1 = new Arc('arcPT_' + neededPostPlace['id'] + silentPostTransition.id, neededPostPlace['id'], silentPostTransition.id, arcColor);
        this.arcs.push(arc1);
        var arc2 = new Arc('arcTP_' + silentPostTransition.id + targetPlace.id, silentPostTransition.id, targetPlace.id, arcColor);
        this.arcs.push(arc2);

        return [transIdCount, placeIdCount];
    }

    createPostPlace(placeIdCount, postCondition){
        var graphics = new Graphics("#FFFFFF", this.graphics.posX + 100, this.graphics.posY); //create graphics for the place
        var silentPlace = new Place('p' + placeIdCount++, postCondition.$['griffin:dataclass'], graphics, []); //create new place
        this.silentPostPlaces.push(silentPlace);
        return [silentPlace, placeIdCount];
    }

}

module.exports = Transition;