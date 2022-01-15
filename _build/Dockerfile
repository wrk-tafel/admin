FROM openjdk:17.0.1-oraclelinux7
VOLUME /config

COPY ./artifact/admin-backend.jar /app.jar

ENTRYPOINT ["java","-Dspring.config.additional-location=file:/config/config.yml","-jar","/app.jar"]
