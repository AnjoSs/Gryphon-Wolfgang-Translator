var parseString = require('xml2js').parseString;

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

        const followingNode = processModel['bpmn:task'].find(task => task['bpmn:incoming'] === outgoing);
        //console.log(followingNode);

        if(followingNode != undefined){
            //console.log(followingNode.$.name);
            const dataInputAssociations = followingNode['bpmn:dataInputAssociation'];
            //console.log(dataInputAssociations);
            //console.log(dataInputAssociations[0]['bpmn:sourceRef']);

            const dataInputRef = [];
            if(Array.isArray(dataInputAssociations)){
                dataInputAssociations.forEach(function (input){
                    dataInputRef.push(input['bpmn:sourceRef']);
                    //console.log('true ' + input['bpmn:sourceRef']);
                });
            }else{
                dataInputRef.push(dataInputAssociations['bpmn:sourceRef']);
                //console.log('false');
            }
            //console.log(dataInputRef);
            this.dataInputs.push(...processModel['bpmn:dataObjectReference'].filter(function(ref){return dataInputRef.includes(ref.$.id)}));
            //this.dataInputs.forEach(dIn => console.log('Input: ' + dIn.$.name));

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
            //this.dataOutputs.forEach(dOut => console.log('Output: ' + dOut.$.name));
            //console.log(this.dataOutputs);

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

        /*TODO: preconditions = dataIn - dataOut
                postconditions = dataOut - dataIn

        this.postConditions.push(this.dataOutputs);
        console.log(this.postConditions);
        this.dataInputs.forEach(input => this.postConditions.splice(this.postConditions.indexOf(console.log(input))));
        console.log(this.postConditions);*/
    }
}

module.exports = Transition;