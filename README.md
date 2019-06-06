Gryphon-Wolfgang-Translator
===========================

This Translator is a tool for the translation and abstraction of fragment based case models modelled in the model repository **Gryphon** into Colored Petri Nets executable with **WOLFGANG**. This enables the simulation of fragments and their dependencies based on data objects.

Getting Started
===============

Local Installation (for developers)
-----------------------------------

### Prerequisites

The following software is necessary to run the translator:

-   Install **Node.js**, available
    [here](https://nodejs.org/en/download/) (this includes the node
    package manager `npm`)
    
-   Install the **WOLFGANG** petri net editor, available 
    [here](https://github.com/iig-uni-freiburg/WOLFGANG.git)

### Initial setup

1.  Clone the source code repository from
    [github](http://github.com/bptlab/gryphon) (e.g. by running
    `git clone https://github.com/bptlab/gryphon.git` on the command
    line)
    -   the following command assumes that you are in the gryphon
        directory!
2.  Run `npm install` to set up all additional dependency packages

### Starting the Gryphon-Wolgang-Translator
-------------------------------------------

Having set up all of the above, you can start the translator as follows:

1. Get your Input data by downloading it from your Gryphon-Model Repository
    - Model a case model in the Gryphon Model Repository
    - Download the model and save it named as "inputcasemodel.json" into the file directory you cloned the project to in `/code`
2. Run the code by executing `main.js`
3. Open the created `outputcpn.pnml` with the **WOLFGANG** petri net editor
