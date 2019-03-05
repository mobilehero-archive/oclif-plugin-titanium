oclif-plugin-titanium
=====================

oclif plugin for creating, building, and managing Titanium Native mobile apps

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-plugin-titanium.svg)](https://npmjs.org/package/oclif-plugin-titanium)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-plugin-titanium.svg)](https://npmjs.org/package/oclif-plugin-titanium)
[![License](https://img.shields.io/npm/l/oclif-plugin-titanium.svg)](https://github.com/brentonhouse/oclif-plugin-titanium/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g oclif-plugin-titanium
$ mobile COMMAND
running command...
$ mobile (-v|--version|version)
oclif-plugin-titanium/0.0.1 darwin-x64 node-v11.7.0
$ mobile --help [COMMAND]
USAGE
  $ mobile COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mobile app:create [NAME] [TEMPLATE]`](#mobile-appcreate-name-template)

## `mobile app:create [NAME] [TEMPLATE]`

Create a shiny new mobile application

```
USAGE
  $ mobile app:create [NAME] [TEMPLATE]

ARGUMENTS
  NAME      Name of your project
  TEMPLATE  Template to use for creating your new app

OPTIONS
  -c, --copyright=copyright      Copyright for your project
  -d, --description=description  Description for your project
  -i, --id=id                    [default: Generate from project name] ID for your project
  -l, --license=license          [default: MIT] Specifies the license for the project
  -n, --name=name                Name of your project
  -p, --path=path                Specifies the directory where you want to initialize the project
  -p, --publisher=publisher      Name of person/company publishing app
  -t, --template=template        [default: @titanium/template-alloy-default] Template to use for creating your new app
  -u, --url=url                  URL for your project

DESCRIPTION
  ...
  Create a new mobile app from a template using all sorts of nifty options!

  Tool will create an app using values from parameters or from the user config file which is located here:  
  ~/.config/@geek/mobile/config.json
  Future versions of the tool will allow setting config values from CLI.

EXAMPLES

  Create app using default template (@titanium/alloy-template-default):
  mobile app:create my-mobile-app

  Create app from npm package:
  mobile app:create my-mobile-app @titanium/alloy-template-basic

  Create app from local template:
  mobile app:create my-mobile-app ../templates/my-mobile-template

  Create app from GitHub repo:
  mobile app:create my-mobile-app brentonhouse/titanium-alloy-template-default

  Create app using default template (@titanium/alloy-template-default):
  mobile app:create my-mobile-app
```

_See code: [src/commands/app/create.js](https://github.com/brentonhouse/oclif-plugin-titanium/blob/v0.0.1/src/commands/app/create.js)_
<!-- commandsstop -->
