<p align="center">
  <img src="../assets/banners/frontend-banner.svg" height="120" alt="HouseMix Logo - Frontend" />
</p>

This is the frontend for HouseMix, written in Angular (currently 21.1.1).

# Running

## Prerequisites

To get started, ensure you have the following tools installed on your development machine:

* Node.js
* npm
* Angular CLI (> 21.1.1)

and then install the dependencies

```bash
npm install
```

## Development

### Default development server

```bash
npm start
```

This command is an alias for `ng serve`. It starts a development server using the standard **development configuration** on port `4200`. It features fast rebuilds, enables source maps, and disables optimizations to provide an efficient local coding experience.

### Custom development server (alternative port)

```bash
npm run start-dev
```

This is equivalent to running `ng serve --build-target=house-mix:build:development --port 4201`. It explicitly selects the `development` build target and hosts the application on port `4201`, which is useful when the default port is already in use.

### Watch mode (build without serving)

```bash
npm run watch
```

Watch mode continuously rebuilds the project whenever file changes are detected. It uses the development configuration but does not start a local web server. This is typically used when the assets are being served by an external backend or proxy.

## Build

### Full production build

```bash
npm run build
```

This command triggers a two-step build process to ensure the application is correctly prepared for hosting:

```bash
npm run build:common
ng build --configuration production --base-href /house-mix/
```

First, it compiles the shared TypeScript code from `../common`. Then, it builds the Angular application in **production mode**, setting the base URL to `/house-mix/`. This base href is essential for deployments where the application is served from a subpath. The final assets are generated in the `dist/house-mix` directory.

### Build shared common package only

```bash
npm run build:common
```

This command compiles the `common` TypeScript project independently. It is required before running the main build and should be executed whenever changes are made to the shared logic.
