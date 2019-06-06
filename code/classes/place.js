class Place {
    constructor(id, name, graphics, initialMarking){
        this.id = id;
        this.name = name;
        this.graphics = graphics;
        this.initialMarking = initialMarking;
        this.isUsed = false;
    }
}

module.exports = Place;