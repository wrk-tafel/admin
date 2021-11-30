FROM openjdk:11-jdk-slim

COPY backend/target/admin-backend.jar app.jar

ENTRYPOINT ["java","-jar","/app.jar"]