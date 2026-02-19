FROM nginx:stable-alpine
EXPOSE 80
COPY frontend/dist/house-mix/browser/ /usr/share/nginx/html/house-mix/
COPY containers/frontend/nginx.conf /etc/nginx/nginx.conf
