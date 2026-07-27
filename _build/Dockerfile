FROM amazoncorretto:26-alpine AS builder
WORKDIR /builder
COPY ./artifact/admin-backend.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted
RUN find extracted -exec touch -d @0 {} \+

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
COPY ./frontend-dist/ ./static/

ENTRYPOINT ["java","-Duser.timezone=Europe/Vienna","-Duser.language=de","-Duser.country=DE","-Dspring.config.additional-location=file:/app/config/config.yml","org.springframework.boot.loader.launch.JarLauncher"]
