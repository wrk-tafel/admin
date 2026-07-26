FROM amazoncorretto:26-alpine AS builder
WORKDIR /builder
COPY ./artifact/admin-backend.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted

FROM amazoncorretto:26-alpine
VOLUME /app/config
VOLUME /app/logs

RUN mkdir /app
RUN mkdir /app/config
RUN mkdir /app/logs

WORKDIR /app
COPY --from=builder /builder/extracted/dependencies/ ./
COPY --from=builder /builder/extracted/spring-boot-loader/ ./
COPY --from=builder /builder/extracted/snapshot-dependencies/ ./
COPY --from=builder /builder/extracted/application/ ./

ENTRYPOINT ["java","-Duser.timezone=Europe/Vienna","-Dspring.config.additional-location=file:/app/config/config.yml","org.springframework.boot.loader.launch.JarLauncher"]
