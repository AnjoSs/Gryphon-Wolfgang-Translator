const parseString = require('xml2js').parseString;
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
        this.preConditions = []; //saves the needed Data Objects and states, that are necessary to start the fragment
        this.postConditions = []; //saves the Data Objects and states resulting in the end of a fragment
        this.dataOutputs = []; //saves all Data Objects that have an outgoing reference of a task
        this.dataInputs = []; //saves all Data Objects that have an incoming reference to a task

        parseString(fragment.content, {explicitArray: false}, (err, result) => { //parse the xml description of the fragment saved in the attribute content
            const processModel = result['bpmn:definitions']['bpmn:process'];
            const startEvent = processModel['bpmn:startEvent'];
            this.parseNextNode(processModel, startEvent['bpmn:outgoing']); //begin parsing through the tasks and other nodes in the fragment, beginning with the start event
        });

        this.preConditions = this.dataInputs.filter(input => {return !this.dataOutputs.includes(input)}); //all data objects that are going into a task without going out before have to be a precondition

        this.postConditions = this.dataOutputs.filter(output => {return !this.dataInputs.includes(output)}); //all data objects that are going out of a task without going in afterwards have to be a postcondition
    }

    //### Parsing Through the Fragments nodes###
    parseNextNode(processModel, outgoing){
        let nodes = []; //contains all nodes such as tasks, events etc.

        //currently only parsing through tasks is possible.
        //To enable other bpmn elements they have to be added into nodes[] here, like the 'bpmn:task', for instance: 'bpmn:servicetask'...
        //also gateways should be supported by adding the logic here
        if(Array.isArray(processModel['bpmn:task'])){
            nodes.push(...processModel['bpmn:task']);
        }else{
            nodes.push(processModel['bpmn:task']);
        }

        const nextNode = nodes.find(task => task['bpmn:incoming'] === outgoing); //find the bpmn element having the incoming arc that the current has as outgoing

        if(nextNode !== undefined){
            this.getDataInputs(processModel, nextNode); //read the incoming Data objects of the next node
            this.getDataOutputs(processModel, nextNode); //read the outgoing Data objects of the next node
            this.parseNextNode(processModel, nextNode['bpmn:outgoing']); //proceed with the next node as current
        }
        return 0;
    }

    getDataInputs(processModel, node){
        const dataInputAssociations = node['bpmn:dataInputAssociation'];
        const dataInputRef = []; //contains all references of Data Objects going into the node
        if(Array.isArray(dataInputAssociations)){ //for more than one input association
            dataInputAssociations.forEach(function (input){
                dataInputRef.push(input['bpmn:sourceRef']);
            });
        }else{ //for only one
            dataInputRef.push(dataInputAssociations['bpmn:sourceRef']);
        }
        this.dataInputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataInputRef.includes(ref.$.id)})); //push all of the models Data Objects into dataInputs, that have one of the nodes input references
    }

    getDataOutputs(processModel, node){
        const dataOutputAssociations = node['bpmn:dataOutputAssociation'];
        const dataOutputRef = []; //contains all references of Data Objects coming out of the node
        if(Array.isArray(dataOutputAssociations)){ //for more than one output association
            dataOutputAssociations.forEach(function (input){
                dataOutputRef.push(input['bpmn:targetRef'])
            });
        }else{ //for only one
            dataOutputRef.push(dataOutputAssociations['bpmn:targetRef']);
        }
        this.dataOutputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataOutputRef.includes(ref.$.id)})); //push all of the models Data Objects into dataOutputs, that have one of the nodes output references
    }


    //### The Logic of Creating Arcs and XOR-Splits and Joins ###
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
            const temp = this.createIncomingArc(places, transIdCount, placeIdCount, preCondition); //for each preCondition, build the specific arc
            transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
            placeIdCount = temp[1];
        });

        this.silentPrePlaces.forEach(place => { //while creating the arcs additional places can be necessary, the arcs from place to transition are built here.
            const arcColor = [place.name];
            const arc = new Arc('arcPT_' + place.id + this.id, place.id, this.id, arcColor);
            this.arcs.push(arc);
        });
        return [transIdCount, placeIdCount];
    }

    createIncomingArc(places, transIdCount, placeIdCount, preCondition){
        const arcColor = [preCondition.$['griffin:dataclass']]; //get the token color that the arc should allow

        let needsPrePlace = false;
        this.preConditions.forEach(preCon => { //iterate through all preconditions to see if there are other preconditions with the same dataclass
            needsPrePlace = ((preCon.$['griffin:dataclass'] === preCondition.$['griffin:dataclass'] && preCon !== preCondition) || needsPrePlace); //check if each preconditions dataclass is equal to this preconditions dataclass and the precondition itself is not equal to this precondition
        });

        if(needsPrePlace){
            const temp = this.handlePrePlace(places, transIdCount, placeIdCount, preCondition); //a prePlace is needed as well as arcs to and from it
            transIdCount = temp[0];
            placeIdCount = temp[1];
        }else{ //an arc from the data object state place to the transition is needed
            const sourcePlace = places.find(place => {return place.name === preCondition.$['name']});
            const arc = new Arc('arcPT_' + sourcePlace.id + this.id, sourcePlace.id, this.id, arcColor);
            this.arcs.push(arc);
        }
        return [transIdCount, placeIdCount];
    }

    handlePrePlace(places, transIdCount, placeIdCount, preCondition){
        let neededPrePlace = this.silentPrePlaces.find(place => {return place['name'] === preCondition.$['griffin:dataclass']});
        if(neededPrePlace === undefined){//if needed prePlace does not exist, add one
            const temp = this.createPrePlace(placeIdCount, preCondition);
            neededPrePlace = temp[0]; //the neededPostPlace and placeIdCount have to be updated
            placeIdCount = temp[1];
        }
        const graphics = new Graphics("#FFFFFF", this.graphics.posX - 100, this.graphics.posY + 100 * this.preConditions.indexOf(preCondition) - 50); //add a transition between the data object states place and the pre place
        const silentPreTransition = new Transition('t'+transIdCount++, '', graphics, true);
        this.transitions.push(silentPreTransition);

        const sourcePlace = places.find(place => {return place.name === preCondition.$['name']});
        const arcColor = [preCondition.$['griffin:dataclass']];

        const arc1 = new Arc('arcPT_' + sourcePlace.id + silentPreTransition.id, sourcePlace.id, silentPreTransition.id, arcColor); //add an arc between the data object state place and the new transition
        this.arcs.push(arc1);

        const arc2 = new Arc('arcTP_' + silentPreTransition.id + neededPrePlace['id'], silentPreTransition.id, neededPrePlace['id'], arcColor); //add an arc between the new transition and the data object state place
        this.arcs.push(arc2);

        return[transIdCount, placeIdCount];
    }

    createPrePlace(placeIdCount, postCondition){
        const graphics = new Graphics("#FFFFFF", this.graphics.posX - 100, this.graphics.posY); //create graphics for the place
        const silentPlace = new Place('p' + placeIdCount++, postCondition.$['griffin:dataclass'], graphics, []); //create new place
        this.silentPrePlaces.push(silentPlace);
        return [silentPlace, placeIdCount];
    }


    //### Calculation of Outgoing Arcs ###
    calculateOutgoingArcs(places, transIdCount, placeIdCount){
        this.silentPostPlaces = [];
        this.postConditions.forEach(postCondition => {
            const temp = this.createOutgoingArc(places, transIdCount, placeIdCount, postCondition); //for each postCondition build the specific arc
            transIdCount = temp[0]; //for consistency of the id's the id's have to be updated by using a temporary variable carrying the new id's as result of the function
            placeIdCount = temp[1];
        });

        this.silentPostPlaces.forEach(place => { //for each post place create a new arc from transition to place
            const arcColors = [place.name];
            const arc = new Arc('arcTP_' + this.id + place.id, this.id, place.id, arcColors);
            this.arcs.push(arc);
        });
        return [transIdCount, placeIdCount];
    }

    createOutgoingArc(places, transIdCount, placeIdCount, postCondition){
        const arcColor = [postCondition.$['griffin:dataclass']];
        let needsPostPlace = false;
        this.postConditions.forEach(postCon => { //iterate through all postconditions to see if there are other postconditions with the same dataclass
            needsPostPlace = ((postCon.$['griffin:dataclass'] === postCondition.$['griffin:dataclass'] && postCon !== postCondition) || needsPostPlace); //check if each postconditions dataclass is equal to this postconditions dataclass and the postcondition itself is not equal to this postcondition
        });

        if(needsPostPlace){
            const temp = this.handlePostPlace(places, transIdCount, placeIdCount, postCondition); //handle the necessity of the place and arcs to and from it
            transIdCount = temp[0]; //for consistency of the id's have to be updated by using a temporary variable carrying the new id's as result of the function
            placeIdCount = temp[1];
        }else{ //add an arc from the transition to the according data object state place
            const targetPlace = places.find(place => {return place.name === postCondition.$['name']});
            const arc = new Arc('arcTP_' + this.id + targetPlace.id, this.id, targetPlace.id, arcColor);
            this.arcs.push(arc);
        }

        return [transIdCount, placeIdCount];
    }

    handlePostPlace(places, transIdCount, placeIdCount, postCondition){
        const arcColor = [postCondition.$['griffin:dataclass']]; //the color the arc should allow
        let neededPostPlace = this.silentPostPlaces.find(place => {return place['name'] === postCondition.$['griffin:dataclass']}); //finds the post place needed by the postcondition if it already exists
        if(neededPostPlace === undefined){//if needed postPlace does not exist, add one
            const temp = this.createPostPlace(placeIdCount, postCondition);
            neededPostPlace = temp[0]; //the neededPostPlace and placeIdCount have to be updated
            placeIdCount = temp[1];
        }
        const graphics = new Graphics("#FFFFFF", this.graphics.posX + 100, this.graphics.posY + 100 * this.postConditions.indexOf(postCondition) - 50); //create the transitions graphics
        const silentPostTransition = new Transition('t'+transIdCount++, '', graphics, true); //create a new transition between the needed place and the target place
        this.transitions.push(silentPostTransition);

        const targetPlace = places.find(place => {return place.name === postCondition.$['name']}); //locate the data object state place that is target of the precondition

        //create arcs from the new place to the new transition and from transition to target place
        const arc1 = new Arc('arcPT_' + neededPostPlace['id'] + silentPostTransition.id, neededPostPlace['id'], silentPostTransition.id, arcColor);
        this.arcs.push(arc1);

        const arc2 = new Arc('arcTP_' + silentPostTransition.id + targetPlace.id, silentPostTransition.id, targetPlace.id, arcColor);
        this.arcs.push(arc2);

        return [transIdCount, placeIdCount];
    }

    createPostPlace(placeIdCount, postCondition){
        const graphics = new Graphics("#FFFFFF", this.graphics.posX + 100, this.graphics.posY); //create graphics for the place
        const silentPlace = new Place('p' + placeIdCount++, postCondition.$['griffin:dataclass'], graphics, []); //create new place
        this.silentPostPlaces.push(silentPlace);
        return [silentPlace, placeIdCount];
    }
}

module.exports = Transition;