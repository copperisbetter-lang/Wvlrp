FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/index.html
COPY east-bank.html /usr/share/nginx/html/east-bank.html
COPY the-roost.html /usr/share/nginx/html/the-roost.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY script.js /usr/share/nginx/html/script.js
COPY roost-life.js /usr/share/nginx/html/roost-life.js
COPY assets /usr/share/nginx/html/assets

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
