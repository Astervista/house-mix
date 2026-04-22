<p align="center">
  <img src="assets/banners/banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

HouseMix is a smart home engine designed to be the "mixing console" for your smart home.

Imagine the state of your home to be handled like a big river: data comes from the sensors around
the house, sensors that are similar and local get combined into groups, and data gets refined and transformed towards the main stream. From this main stream the delta spreads, and smaller
streams of data go towards their single destination (the "actuator" devices, like lamps) getting more refined for the specific device.

At every step, data gets transformed by "mixes", which elaborate the information, like a mixing console.

HouseMix is an abstraction layer that works on top of Zigbee and Zigbee2Mqtt, it's completely written in Typescript, using nestjs for the backend and Angular for the frontend.

For information about installation, you can jump directly to the [Installation](#installation) section below.

# The core idea

As it is often the case, I wrote HouseMix because I was dissatisfied with any tool that I could find that handled home automation. For a while I wrote my own javascript scripts that
roughly handled mqtt commands based on my needs. At the seventh script or so, I learned that my work was serial which basically transformed sensor data into lightbulbs commands, through
a fairly linear path.

This can more or less be achieved with available home automation frameworks. However, what I found is that the more user-friendly and easy-to-use ones work on a simple trigger → condition →
action
system, while the more customizable and powerful ones are a pain to use and almost always require coding skills for the most complex tasks. What HouseMix brings is an expansion of the
trigger → condition → action, where triggers and actions are all routed in the same data flow, giving the ability to mix data from different flows and create complex systems, but still
retaining a simpler structure for simpler tasks, but leaving the possibility to basically code behaviors through a more user-friendly graphical node elaboration structure.

So I wrote HouseMix, designed to be the "mixing console" for your smart home. Instead of complex scripts or rigid automation rules, it treats your home environment as a
continuous flow of data that can be mixed and manipulated.

# The Mechanics

In a smart home, there are usually two types of devices connected to the network: "input" devices, like buttons, motion sensors, light and temperature sensors, and "output" devices, like
lights, smart plugs, blinds. HouseMix calls the former *sensors*, and the latter *actuators*. Sensors – together with system status information, like time and date – are the source of
the data flow, and elaboration goes towards the actuators. Devices can be grouped into logical *groups* that can be used to synthesize or generalize the data coming from the sensor or going
to
the actuators.

At every step (every sensor, every group, every actuator and at the center of the system, where everything meets) data can be elaborated through "mixes". If you are familiar with Node-RED or
with 3D editing software, you may already have an idea of how a mix works. Every mix has some data coming into it, on the left, some data that needs to come out on the right side, and a
canvas
in the middle where the data is mixed through the use of nodes.

Elaboration is then hierarchical: mixes lower down can only use the output of higher rank mixes and data only flows downstream towards the actuators. The full ranking is
*raw sensor and system data* → *sensor mixes* → *narrower groups* → *broader groups* → *center mixes* → *broader groups* → *narrower groups* → *actuator mixes*, from upstream to downstream.

The system then works in cycles: every cycle is triggered by some change, every mix is calculated in cascade and the actuator outputs are sent to the corresponding devices through mqtt.

# Basic structure

This repository is a monorepo for the whole system. The system is split into three main parts: the `/backend` directory contains the nestjs project for the backend, the `/frontend` directory
contains the Angular project for the frontend, and a `/common` directory containing the classes shared between the two sides. Additional first level directories contain graphic assets and
the
setup for publishing.

## Backend

The backend runs on top of zigbee2mqtt, which it assumes is already installed and correctly setup; HouseMix does not provide facilities to pair or handle devices on the zigbee network,
it relies on the information passed to it and assumes the devices are paired and working. It then connects to the MQTT server used by zigbee2mqtt and listens for status changes on the topic
of the sensors and writes on the set topic of the actuators at the end of every cycle.

The data on the backend is saved in plain json on disk, so the backend does not require any database to be installed. I does not therefore handle backups and data consistency.

The backend also provides some additional inputs to the system, such as checking the connection status of devices on the network, a timeout based refresh cycle, and status persistency.

## Frontend

The frontend is a static Angular project (without SSR), served from the compiled Angular project. The main UI is divided in three sections, for handling the group hierarchy, the mixes and
the system configuration respectively.

## Common

The common directory contains the Typescript project relative for the majority of all the data representation classes, used by both the frontend and the backend for the system logic, with
the corresponding serialization classes and some REST communication classes

## More info

For more detailed info on how the code is structured, developement information and the frontend user guide, checkout the READMEs in the specific subprojects:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Common README](common/README.md)

# Installation

There are several ways to install HouseMix. All installations assume that you have the following already installed:

- [Zigbee2MQTT pre-requisites](https://www.zigbee2mqtt.io/guide/getting-started/)
- [Zigbee2MQTT installation](https://www.zigbee2mqtt.io/guide/installation/)
- [Node.js](https://nodejs.org/en/download)
- Some proxy software to route different paths coming to the server between the backend server (/house-mix/api/*) and the frontend server (every other /house-mix/* paths)

The MQTT server must be reachable from the installation location of HouseMix, and already running before running HouseMix.

There are three ways to run the system, depending on the level of customization needed:

- (Easy) Bundle: HouseMix comes with a [bundle script](containers/bundle/README.md) that launches everything in one command
- (Medium) Per-project packages: both the [frontend](containers/frontend/README.md) and the [backend](backend/README-package.md) are published as packages (a docker image and a npm package
  respectively) that can be downloaded and run separately
- (Pro) Build your own: for maximum customization, you can live run or compile your customized version of both the [frontend](frontend/README.md) and the [backend](backend/README.md)

## (Easy) Bundle

To run HouseMix as-is, you just have to have [docker](https://www.docker.com/get-started/) installed and run the bundle script as shown in the [bundle readme](containers/bundle/README.md).
This will run the frontend with `/house-mix/` as base path, and the backend with `/house-mix/api` as base path, each in their docker container, and each reachable through a docker network.
What you need to do is only create a configuration file and route the correct requests to the correct virtual machine using some proxy software.

The bundle script also takes care of updates: by setting the correct version in the configuration file, both the frontend and backend will be updated with the correct version.

## (Medium) Per-project packages

If the pre-packaged bundle doesn't cut it for you, what it basically does is running the packages for the two projects. Those can be run manually separately
following the [frontend container README](containers/frontend/README.md) and the [backend package README](backend/README-package.md). This way, they can be run separately or you can even
run one as is and run the other using the Pro option

## (Pro) Build your own

Each project contains the source code that can either be run in dev mode or re-compiled and re-published. Refer to the [frontend README](frontend/README.md) and
the [backend README](backend/README.md) for more information
