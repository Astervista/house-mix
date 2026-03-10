<p align="center">
  <img src="backend-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

## Description

This is the npm package containing the compiled backend for
<a href="https://github.com/Astervista/house-mix">HouseMix</a>. For more information about how the backend works
and which parameters it requires, refer to <a href="https://github.com/Astervista/house-mix/blob/main/backend/README.md">the backend's readme</a>.

This backend uses the common library and serves the REST apis for the system, manages the connection with
the zigbee2mqtt server through mqtt, and runs all the logic to calculate the status of all the zigbee devices,
publishing it back to the devices on mqtt.

## Executing

To execute the backend, add `@astervista:registry=https://npm.pkg.github.com/` to the `.npmrc` file to add the repository
to npm.

The package can then be installed with npm:

```shell
npm install "@astervista/house-mix-backend@latest" --omit=dev
```

Then the entry point js file needs to be run directly with node

```shell
node node_modules/@astervista/house-mix-backend/dist/backend/src/main.js
```

## Bundled execution

This will run the backend only, if you want to run the entire system (backend + frontend server) with automatic
version handling, check out <a href="https://github.com/Astervista/house-mix/releases">the bundler</a>, published
as the main release for HouseMix's repo.
