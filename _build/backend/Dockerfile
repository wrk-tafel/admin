FROM openjdk:18-ea-6

RUN mkdir /app
RUN mkdir /app/config
RUN mkdir /app/logs

COPY backend/target/admin-backend.jar /app/app.jar

WORKDIR /app

ENTRYPOINT ["java","-Dspring.config.additional-location=file:/app/config/config.yml","-jar","app.jar"]
