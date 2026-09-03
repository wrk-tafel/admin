FROM amazoncorretto:26-alpine@sha256:1d79860472b4f7227dc0cb8d97672d0b51a417b62c437a8c5a951512724297b7 AS builder
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
FROM amazoncorretto:26-alpine@sha256:1d79860472b4f7227dc0cb8d97672d0b51a417b62c437a8c5a951512724297b7 AS cds-trainer
# Version matches what's actually run everywhere else (docker-compose.yml, Testcontainers, e2e/
# lighthouse CI - all postgres:18-bookworm), so the CDS training run boots against the same major
# version the app is deployed against. fuzzystrmatch (used by household duplicate detection, see
# R__00031) lives in postgresql-contrib, not the base package. Deliberately not version-pinned:
# Alpine's repo only carries the current build of each package, so a pinned version here would
# eventually vanish from the index and break the build outright rather than just drift - the base
# image digest pin above is what makes the rest of this stage reproducible.
RUN apk add --no-cache postgresql18 postgresql18-contrib
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

FROM amazoncorretto:26-alpine@sha256:1d79860472b4f7227dc0cb8d97672d0b51a417b62c437a8c5a951512724297b7
# The base image is pinned by digest so every build - local or CI, today or in a year - produces the
# same image, rather than silently picking up whatever Alpine packages happen to be current that day.
# The cost is that a fixed digest also fixes its bundled package versions, so a patched CVE (e.g.
# libssl3/libcrypto3, see the Trivy code-scanning alerts this addresses) never arrives on its own -
# pulling current versions here closes that gap. Deliberately not version-pinned like the base image:
# Alpine's repo only carries the current build of each package, so pinning an exact version here
# would eventually vanish from the index and break the build outright once Alpine ships the next fix.
RUN apk add --no-cache --upgrade libssl3 libcrypto3
ARG VERSION=dev
ARG BUILD_DATE=unknown
ENV TAFELADMIN_VERSION=$VERSION
ENV TAFELADMIN_BUILD_DATE=$BUILD_DATE
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
