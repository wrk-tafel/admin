FROM openjdk:18.0.2-oraclelinux7
VOLUME /app/config
VOLUME /app/logs

RUN mkdir /app
RUN mkdir /app/config
RUN mkdir /app/logs

COPY ./artifact/admin-backend.jar /app/app.jar

WORKDIR /app
ENTRYPOINT ["java","-Dspring.config.additional-location=file:/app/config/config.yml","-jar","app.jar"]
