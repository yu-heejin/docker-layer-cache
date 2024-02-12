# 캐시 최적화
FROM adoptopenjdk:11-jdk
WORKDIR application
COPY ./dependencies ./
COPY ./spring-boot-loader ./
COPY ./snapshot-dependencies ./
COPY ./application ./
ENTRYPOINT ["java", "-Dspring.profiles.active=dev", "-Duser.timezone=Asia/Seoul", "org.springframework.boot.loader.JarLauncher"]

# 최적화하지 않은 경우
FROM openjdk:11-jdk
ARG JAR_FILE=./build/libs/*-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT [ "java", "-jar", "/app.jar" ]