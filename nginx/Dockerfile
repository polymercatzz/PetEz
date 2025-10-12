FROM nginx:alpine
# Remove default Nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy your custom config file
COPY nginx.conf /etc/nginx/conf.d/
HEALTHCHECK CMD curl --fail http://localhost || exit 1
