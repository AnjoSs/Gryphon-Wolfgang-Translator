"# Gryphon-Wolfgang-Translator"

Getting Started
===============

Local Installation (for developers)
-----------------------------------

### Prerequisites

The following software is necessary to build and run the editor:

-   Install **Node.js**, available
    [here](https://nodejs.org/en/download/) (this includes the node
    package manager `npm`)
-   Install **node-gyp** by running `npm install -g node-gyp` on the
    command line, e.g. [cygwin](https://cygwin.com) or Window `cmd`
    -   Unix/Mac: this may require the **build-essentials** tools, which
        you can install with `sudo apt-get install build-essential`
-   Install **browserify** by running `npm install -g browserify`
-   Install **grunt-cli** by runniing `npm install -g grunt-cli`
-   Install **mongodb**, available
    [here](https://www.mongodb.org/downloads).
    -   add the `bin` directory to your path (default directory is
        `C:\Program Files\MongoDB\Server\3.4\bin`)

When using Windows you have to install the following additional
dependencies:

-   Install **Python 2.7.X (not Python 3)**, available
    [here](https://www.python.org/downloads/release/python-2713/). Add
    the directory containing the python.exe executable to your PATH
-   Install Microsoft \*Visual Studio Community Edition 2015 (not
    2017)\*, available
    [here](https://www.visualstudio.com/en-us/downloads/download-visual-studio-vs.aspx).
    -   Be sure to select Windows 10 SDK and Windows 8.1 SDK during
        installation
-   Configure npm to use the right version of Visual Studio:
    `npm config set msvs_version 2015`
-   Configure npm with the path to your Python executable:
    `npm config set python C:\YOUR_PYTHON_DIRECTORY\python.exe`

### Initial setup
