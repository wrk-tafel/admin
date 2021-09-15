call mvnw clean install -DskipTests -f backend/pom.xml
call npm run build-local --prefix frontend
call docker compose build
