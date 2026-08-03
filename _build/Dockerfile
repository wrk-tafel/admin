FROM amazoncorretto:26-alpine AS builder
WORKDIR /builder
COPY ./artifact/admin-backend.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted
RUN find extracted -exec touch -d @0 {} \+

FROM amazoncorretto:26-alpine
ARG VERSION=dev
ARG BUILD_TIME=unknown
ENV TAFELADMIN_VERSION=$VERSION
ENV TAFELADMIN_BUILD_TIME=$BUILD_TIME
VOLUME /app/config
VOLUME /app/logs
VOLUME /app/documents
VOLUME /app/scanner

RUN mkdir /app
RUN mkdir /app/config
RUN mkdir /app/logs
RUN mkdir /app/documents
RUN mkdir /app/scanner

WORKDIR /app
COPY --from=builder /builder/extracted/dependencies/ ./
COPY --from=builder /builder/extracted/spring-boot-loader/ ./
COPY --from=builder /builder/extracted/snapshot-dependencies/ ./
COPY --from=builder /builder/extracted/application/ ./
COPY ./frontend-dist/ ./static/

# -XX:MaxRAMPercentage raises the JVM's default 25% heap cap (meant for very large hosts) to a
# percentage that actually uses the memory given to this container. -XX:+ExitOnOutOfMemoryError
# makes an OOM kill the process instead of leaving it running in a corrupted state, so the
# container's restart policy is what recovers it (see issue #2879/#2935) rather than a wedged app
# silently serving errors until someone notices.
ENTRYPOINT ["java","-Duser.timezone=Europe/Vienna","-Duser.language=de","-Duser.country=DE","-XX:MaxRAMPercentage=75.0","-XX:+ExitOnOutOfMemoryError","-Dspring.config.additional-location=file:/app/config/config.yml","org.springframework.boot.loader.launch.JarLauncher"]
