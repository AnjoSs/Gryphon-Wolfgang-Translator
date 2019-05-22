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

    calculateManualPreConditions(fragment){
        this.manualPreConditions = fragment.preconditions;
    }

    getFollowingNode(processModel, outgoing){
        var nodes = [];
        if(Array.isArray(processModel['bpmn:task'])){
            nodes.push(...processModel['bpmn:task']);
        }else{
            nodes.push(processModel['bpmn:task']);
        }

        const followingNode = nodes.find(task => task['bpmn:incoming'] === outgoing);
        if(followingNode != undefined){
            const dataInputAssociations = followingNode['bpmn:dataInputAssociation'];
            const dataInputRef = [];
            if(Array.isArray(dataInputAssociations)){
                dataInputAssociations.forEach(function (input){
                    dataInputRef.push(input['bpmn:sourceRef']);
                });
            }else{
                dataInputRef.push(dataInputAssociations['bpmn:sourceRef']);
            }
            this.dataInputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataInputRef.includes(ref.$.id)}));

            const dataOutputAssociations = followingNode['bpmn:dataOutputAssociation'];
            const dataOutputRef = [];
            if(Array.isArray(dataOutputAssociations)){
                dataOutputAssociations.forEach(function (input){
                    dataOutputRef.push(input['bpmn:targetRef'])
                });
            }else{
                dataOutputRef.push(dataOutputAssociations['bpmn:targetRef']);
            }
            this.dataOutputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataOutputRef.includes(ref.$.id)}));

            this.getFollowingNode(processModel, followingNode['bpmn:outgoing']);
        }
        return 0;
    }

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
            this.getFollowingNode(processModel, startEvent['bpmn:outgoing']);
        })

        this.preConditions = this.dataInputs.filter(input => {return !this.dataOutputs.includes(input)});
        //console.log(this.preConditions);
        this.postConditions = this.dataOutputs.filter(output => {return !this.dataInputs.includes(output)});
        //console.log(this.postConditions);
    }

    calculateArcs(places, placeIdCount, transIdCount){
        this.arcs = [];
        this.places = [];
        this.transitions = [];
        this.silentPrePlaces = [];

        this.preConditions.forEach(preCondition => {
            var arcColors = [preCondition.$['griffin:dataclass']];
            if(this.preConditions.filter(function (postCon){ return postCon.$['griffin:dataClass'] === preCondition.$['griffin:dataClass']}).length > 1){
                //console.log(preCondition);
                //console.log(this.silentPrePlaces);
                var neededPrePlace = this.silentPrePlaces.find(place => {return place['name'] === preCondition.$['griffin:dataclass']});
                //console.log(neededPrePlace);
                if(neededPrePlace === undefined){//if needed prePlace does not exist, add one
                    var graphics = new Graphics("#FFFFFF", this.graphics.posX - 100, this.graphics.posY);
                    var silentPrePlace = new Place('p' + placeIdCount++, preCondition.$['griffin:dataclass'], graphics, null);
                    this.silentPrePlaces.push(silentPrePlace);
                    neededPrePlace = silentPrePlace;
                    //console.log(silentPrePlace);
                }
                //console.log(this.silentPrePlaces);
                var graphics = new Graphics("#FFFFFF", this.graphics.posX - 150, this.graphics.posY);
                var silentPreTransition = new Transition('t'+transIdCount++, '', graphics, true);
                //console.log(silentPreTransition);
                this.transitions.push(silentPreTransition);

                var sourcePlace = places.find(place => {return place.name === preCondition.$['name']});

                var arcColors = [preCondition.$['griffin:dataclass']];
                var arc1 = new Arc('arcPT_' + sourcePlace.id + silentPreTransition.id, sourcePlace.id, silentPreTransition.id, arcColors);
                this.arcs.push(arc1);
                //console.log(arc1);
                var arc2 = new Arc('arcTP_' + silentPreTransition.id + neededPrePlace['id'], silentPreTransition.id, neededPrePlace['id'], arcColors);
                this.arcs.push(arc2);
                //console.log(arc2);
            }else{
                var sourcePlace = places.find(place => {return place.name === preCondition.$['name']});
                var arc = new Arc('arcPT_' + sourcePlace.id + this.id, sourcePlace.id, this.id, arcColors);
                this.arcs.push(arc);
            }
        });

        this.silentPrePlaces.forEach(place => {
            var arcColors = [place.name];
            var arc = new Arc('arcPT_' + place.id + this.id, place.id, this.id, arcColors);
            this.arcs.push(arc);
            this.places.push(place);
            //console.log(arc);
        });

        this.silentPostPlaces = [];
        this.postConditions.forEach(postCondition => {
            var arcColors = [postCondition.$['griffin:dataclass']];
            if(this.postConditions.filter(function (postCon){ return postCon.$['griffin:dataClass'] === postCondition.$['griffin:dataClass']}).length > 1){
                //console.log(postCondition);
                //console.log(this.silentPostPlaces);
                var neededPostPlace = this.silentPostPlaces.find(place => {return place['name'] === postCondition.$['griffin:dataclass']});
                //console.log(neededPostPlace);
                if(neededPostPlace === undefined){//if needed prePlace does not exist, add one
                    var graphics = new Graphics("#FFFFFF", this.graphics.posX + 100, this.graphics.posY);
                    var silentPostPlace = new Place('p' + placeIdCount++, postCondition.$['griffin:dataclass'], graphics, []);
                    this.silentPostPlaces.push(silentPostPlace);
                    neededPostPlace = silentPostPlace;
                    //console.log(silentPostPlace);
                }
                //console.log(this.silentPostPlaces);
                var graphics = new Graphics("#FFFFFF", this.graphics.posX + 150, this.graphics.posY);
                var silentPostTransition = new Transition('t'+transIdCount++, '', graphics, true);
                //console.log(silentPostTransition);
                this.transitions.push(silentPostTransition);

                var targetPlace = places.find(place => {return place.name === postCondition.$['name']});

                var arc1 = new Arc('arcPT_' + neededPostPlace['id'] + silentPostTransition.id, neededPostPlace['id'], silentPostTransition.id, arcColors);
                this.arcs.push(arc1);
                //console.log(arc1);
                //var arc2 = new Arc('arcTP_' + silentPostTransition.id + neededPostPlace['id'], silentPostTransition.id, neededPostPlace['id'], []]);
                var arc2 = new Arc('arcTP_' + silentPostTransition.id + targetPlace.id, silentPostTransition.id, targetPlace.id, arcColors);
                this.arcs.push(arc2);
                //console.log(arc2);
            }else{
                var targetPlace = places.find(place => {return place.name === postCondition.$['name']});
                var arc = new Arc('arcTP_' + this.id + targetPlace.id, this.id, targetPlace.id, arcColors);
                this.arcs.push(arc);
            }
        });

        this.silentPostPlaces.forEach(place => {
            var arcColors = [place.name];
            var arc = new Arc('arcTP_' + this.id + place.id, this.id, place.id, arcColors);
            this.arcs.push(arc);
            this.places.push(place);
            //console.log(arc);
        });

        return transIdCount;
    }
}

module.exports = Transition;