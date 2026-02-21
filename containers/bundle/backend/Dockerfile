FROM node:24-alpine
WORKDIR /app

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

ARG BACKEND_RUNNER_VERSION
ENV BACKEND_RUNNER_VERSION=${BACKEND_RUNNER_VERSION}

ENTRYPOINT ["sh", "entrypoint.sh"]
