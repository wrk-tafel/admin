FROM openjdk:17-slim-bullseye

COPY backend/target/admin-backend.jar app.jar

ENTRYPOINT ["java","-jar","/app.jar"]