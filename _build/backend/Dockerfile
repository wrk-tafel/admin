FROM openjdk:11-jdk-slim

COPY backend/target/admin-backend-0.0.0.jar app.jar

ENTRYPOINT ["java","-jar","/app.jar"]