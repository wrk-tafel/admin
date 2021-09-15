#!/bin/bash
./mvnw clean install -DskipTests -f backend/pom.xml
cd frontend
npm run build
cd ..
docker compose build
