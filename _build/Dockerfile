FROM amazoncorretto:26-alpine AS builder
WORKDIR /builder
COPY ./artifact/admin-backend.jar app.jar
RUN java -Djarmode=tools -jar app.jar extract --layers --launcher --destination extracted \
    && find extracted -exec touch -d @0 {} \+

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
# Alpine's own repo ships patched packages (e.g. libssl3/libcrypto3 CVE fixes) well before a new
# amazoncorretto:26-alpine tag is published, so pulling them at build time closes that gap instead
# of waiting on upstream - see the Trivy code-scanning alerts this addresses.
RUN apk --no-cache upgrade
ARG VERSION=dev
ARG BUILD_TIME=unknown
ENV TAFELADMIN_VERSION=$VERSION
ENV TAFELADMIN_BUILD_TIME=$BUILD_TIME
VOLUME /app/config
VOLUME /app/logs
VOLUME /app/documents
VOLUME /app/scanner

WORKDIR /app
RUN mkdir config logs documents scanner
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

# Management port (see application.yml) is separate from the app's server port and stays reachable
# even if the main servlet container is wedged. wget is busybox's, not GNU's - it ships in the base
# alpine image already, so no extra package is needed. Its own exit code (0 on HTTP 2xx, 1 otherwise)
# is the health signal, so no wrapping shell/`|| exit` is needed.
#
# Timings are based on measured cold-start time of this image (CDS archive included): three local
# runs of `docker run` to a 200 from /actuator/health landed at ~17.8s/18.5s/18.8s, matching the
# "Started AdminBackendApplicationKt in ~16.6s" boot log line plus container/network overhead.
# start-period gives ~2.5x headroom over that for a slower/loaded host; start-interval polls quickly
# within it so the container flips to "healthy" soon after it actually is, instead of waiting for a
# full steady-state interval tick.
HEALTHCHECK --interval=30s --timeout=3s --start-period=45s --start-interval=3s --retries=3 \
    CMD ["wget", "--spider", "-q", "-T", "3", "http://localhost:8081/actuator/health"]
