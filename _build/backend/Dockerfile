FROM openjdk:18-ea-6

COPY backend/target/admin-backend.jar app.jar

ENTRYPOINT ["java","-Dspring.config.additional-location=file:/config/config.yml","-jar","/app.jar"]
