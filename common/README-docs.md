# Introduction

This is the documentation for HouseMix's common subproject.

This subproject contains all the model classes that are shared between the frontend and backend, in order to avoid duplicated code. This project is not much more than a collection of models with their own internal functions, the corresponding JSON serialized classes with the serialization/deserialization logic and some helper classes for REST communication.

As a general rule, the classes in this project should contain as much logic and helper functions as possible, excluding server-side-only business logic and glue logic.

The project is structured in four main folders, that divide models in the system's three main areas, and a common utils folder:

- `/devices/`: contains all the definitions about devices on the system and their organizations. `Actuator`, `Sensor`, `Group` and related classes are all here.
- `/mixing/`: contains all the definitions about mixes, their dependencies and relationships. `Mix`, `Datum`, `ElaborationNode`, `Mix-Layout` and related classes are all here.
- `/system/`: contains all the definitions about system configuration and customizations.
- `/utils/`: contains classes and functions useful both in the backend and frontend. Things like common constants, color conversion tools, basic enhancement functions are all here. 

Model modules contain the model classes and their `JSON` serialization counterparts. The model classes all provide a `toJSON()` and `fromJSON()` function that transform into and from the relative `JSON` classes. `JSON` classes' members are decorated with `class-validator` and `class-transformer` decorators for type checking on the backend side. Read the [common project readme](https://github.com/Astervista/house-mix/tree/main/common#caveats) on the repo to learn about the caveats with this. Some model classes or network-only classes don't have the `JSON` counterpart because they already are simple DTOs.

Occasionally, some model modules are accompanied by a `rest-classes.ts` module containing a set of such DTOs and helper classes that define data to be sent through the REST requests.

