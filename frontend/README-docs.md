# Introduction

This is the documentation for the frontend project of HouseMix.
This documentation is mainly focused on the development of the project, but it can also be used to understand the general working of the system (especially here in the frontend).
For information on how to run and install the project, refer to the instructions on the [GitHub repository](https://github.com/astervista/house-mix).

Generally, this project is an Angular project that results in a static single-page web app where the HouseMix system can be interacted with.
The frontend consists of a main page that can show three main components (or tabs, or sections): [`HomeComponent`](classes/components_home_home.component.HomeComponent.html) - the start tab where smart devices can be managed, [`MixingComponent`](classes/components_mixing_mixing.component.MixingComponent.html) - the tab in which to manage mixing, and [`SystemComponent`](classes/components_system_system.component.SystemComponent.html), where the system can be customized.

The sources are organized in the following top-level directories/packages (you can see them in the lateral menu):

- [`/components`](#components): The folder where all the Angular components are defined. This includes dialogs, form components, the main tabs, and utility components.
- [`/directives`](#directives): The folder where all the Angular directives are defined.
- [`/services`](#services): The folder where all the Angular services are defined. Services contain light business logic and the REST endpoints calls.
- [`/utils`](#utils): This folder contains all support and utility classes.

The structure of such categories is explained in the following sections.

The project follows the traditional Angular file structure: files containing components are called `component-name.component.ts`, put in the same folder as their relative `component-name.component.html` and `component-name.component.scss`; directives are put in files named `directive-name.directive.ts` and services in files named `service-name.service.ts`. All other `.ts` files are support files, and are usually found in the same folder as the component they refer to, or in the `/utils/` folder.

This documentation contains information about all classes, members, functions, modules and constants, including the non-exported and private ones, to help with programming. In the documentation there are special custom tags and blocks that enhance the Angular-specific characteristics of the Angular classes, such as the location of the template files for components or which are their inputs.

# Top-level directories

## Components

The `/components/` top level directory contains all the classes that by virtue of the `@Component()` decorator are treated by the Angular system as graphical components that are inserted into the DOM. The directory is organized in subdirectories that separate the components by their role:

- `/components/auxiliary/`: in this directory lie all the non-stand-alone components that offer common functions that are useful to other more complex components. For example, common input clusters, the loading graphic and pickers are defined here.
- `/components/dialogs`: this directory contains all the components that make up the content of common dialog boxes. Notably, this folder does not contain components used in the mix editing screen, because they are considered pertinent to their context only.
- `/components/entities`: in here there are all the components that display a specific entity in the business logic, such as for example a device, or a system configuration element.
- `/components/home`: this directory contains the home tab component that handles the configuration of the devices in the system in groups.
- `/components/mixing`: the mixing directory contains the tab component that handles the management of the mixning, as well as the component to edit the mixes themselves in the `/components/mixing/mix` subfolder, along with its dialogs.
- `/components/system`: this last directory contains the last tab component that displays the customization to the system. It also contains the settings screen component.

## Directives

This folder contains useful directives to apply to components. These directives generally define special behaviors specific to the system or widely useful. For example, this folder contains the [InputReturnBehaviorDirective](./classes/directives_input-return-behavior_input-return-behavior.directive.InputReturnBehaviorDirective.html) which enhances dialog by adding a "focus next control on return" function, or the [ScrollOnSelectedDirective](/classes/directives_scroll-on-selected_scroll-on-selected.directive.ScrollOnSelectedDirective.html), that focuses and scrolls a container when a component gets selected.

## Services

The classes in this folder are Angular services. The services provide non-UI logic functionality to components, and most of them also contain functions to call the REST backend. The services are one for each top level api endpoint (`/device`, `/groups` `/mixing`, `/system`), plus a service to handle local storage functions.

## Utils

In here, utility classes for the whole system. Among these there is [BetterMatDialog](./classes/utils_better-mat-dialog.BetterMatDialog.html), used to easily create dialogs, and the [`/utils/networking/decorators.ts`](./modules/utils_networking_decorators.html) module that defines decorators to assign to function members of a service to automatically generate an api endpoint call without any code.
