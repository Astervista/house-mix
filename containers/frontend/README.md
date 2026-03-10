<p align="center">
  <img src="frontend-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

## Description

This is the docker container package containing the compiled Angular frontend for
<a href="https://github.com/Astervista/house-mix">HouseMix</a>. For more information about how the frontend works
and which parameters it requires, refer to <a href="https://github.com/Astervista/house-mix/blob/main/frontend/README.md">the backend's readme</a>.

This frontend uses the compiled common library.

## Executing

The frontend is already configured to run properly in a docker container, and serves the frontend is served at
port 80 in the container, which is running a nginx server.

#### Fetch the image

```shell
docker pull ghcr.io/astervista/house-mix-frontend:latest
```

#### Run the frontend

```shell
docker run -d \
  --name house-mix-frontend \
  --restart unless-stopped \
  ghcr.io/astervista/house-mix-frontend:latest
```

## Bundled execution

This is the container running only the frontend server, if you want to run the entire system (backend + frontend server) with automatic
version handling, check out <a href="https://github.com/Astervista/house-mix/releases">the bundler</a>, published
as the main release for HouseMix's repo.
