FROM amazoncorretto:25-alpine
VOLUME /app/config
VOLUME /app/logs

RUN mkdir /app
RUN mkdir /app/config
RUN mkdir /app/logs

COPY ./artifact/admin-backend.jar /app/app.jar

WORKDIR /app
ENTRYPOINT ["java","-Duser.timezone=Europe/Vienna","-Dspring.config.additional-location=file:/app/config/config.yml","-jar","app.jar"]
