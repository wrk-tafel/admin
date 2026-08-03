FROM amazoncorretto:26-alpine AS builder
WORKDIR /builder
COPY ./artifact/admin-backend.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted
RUN find extracted -exec touch -d @0 {} \+

# Trains an AppCDS archive by running the app through a real startup (migrations, EntityManagerFactory
# build, security config, ...) against a throwaway local Postgres, then dumping the JVM's loaded-class
# set on exit. Baking that archive into the final image lets every deployed container skip re-parsing/
# re-verifying those classes, which measured ~20-25% faster starts with zero behavior change (see issue
# #2881). The trainer must launch the app the exact same way the final ENTRYPOINT does (JarLauncher over
# the extracted layered jar, not a plain `java -jar`) - CDS is classpath-layout sensitive, and a mismatch
# here would silently produce a dead archive that never gets used at runtime.
FROM amazoncorretto:26-alpine AS cds-trainer
# fuzzystrmatch (used by household duplicate detection, see R__00031) lives in postgresql-contrib, not
# the base package.
RUN apk add --no-cache postgresql17 postgresql17-contrib
ENV PGDATA=/var/lib/postgresql/data
RUN mkdir -p "$PGDATA" /run/postgresql && chown -R postgres:postgres /var/lib/postgresql /run/postgresql \
    && su postgres -c "initdb -D '$PGDATA' --auth=trust --no-sync" \
    && su postgres -c "pg_ctl -D '$PGDATA' -o \"-c listen_addresses=localhost\" -w start" \
    && su postgres -c "createuser tafeladmin -s" \
    && su postgres -c "createdb tafeladmin -O tafeladmin" \
    && su postgres -c "pg_ctl -D '$PGDATA' -w stop"

WORKDIR /app
COPY --from=builder /builder/extracted/dependencies/ ./
COPY --from=builder /builder/extracted/spring-boot-loader/ ./
COPY --from=builder /builder/extracted/snapshot-dependencies/ ./
COPY --from=builder /builder/extracted/application/ ./
# The local profile supplies the JWT/mail/support properties SecurityProperties/TafelAdminProperties
# require; mail/scanner-folder targets are never dialed during startup, so no mail server needs to
# exist here.
RUN mkdir documents scanner-inbox logs
RUN su postgres -c "pg_ctl -D '$PGDATA' -o \"-c listen_addresses=localhost\" -w start" \
    && java -Dspring.context.exit=onRefresh \
         -XX:ArchiveClassesAtExit=/app-cds.jsa \
         org.springframework.boot.loader.launch.JarLauncher --spring.profiles.active=local \
    && su postgres -c "pg_ctl -D '$PGDATA' -w stop"

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
COPY --from=cds-trainer /app-cds.jsa ./app-cds.jsa
COPY ./frontend-dist/ ./static/

# -XX:MaxRAMPercentage raises the JVM's default 25% heap cap (meant for very large hosts) to a
# percentage that actually uses the memory given to this container. -XX:+ExitOnOutOfMemoryError
# makes an OOM kill the process instead of leaving it running in a corrupted state, so the
# container's restart policy is what recovers it (see issue #2879/#2935) rather than a wedged app
# silently serving errors until someone notices.
ENTRYPOINT ["java","-Duser.timezone=Europe/Vienna","-Duser.language=de","-Duser.country=DE","-XX:SharedArchiveFile=/app/app-cds.jsa","-XX:MaxRAMPercentage=75.0","-XX:+ExitOnOutOfMemoryError","-Dspring.config.additional-location=file:/app/config/config.yml","org.springframework.boot.loader.launch.JarLauncher"]
