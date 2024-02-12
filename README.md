## Docker Layer
- Docker는 지정된 이미지를 빌드하는데 필요한 **모든 명령이 순서대로 포함된 텍스트 파일인 Dockerfile을 순서대로 build를 수행**한다.
- 아래 Dockerfile에 적힌 코드가 각각 읽기 전용 레이어로 구성된다.
    
    ```docker
    # syntax=docker/dockerfile:1
    FROM ubuntu:latest
    RUN apt-get update && apt-get install -y build-essentials
    COPY main.c Makefile /src/
    WORKDIR /src/
    RUN make build
    ```
    
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/3afca01c-e6e0-413f-998d-4662a913cfb5)

https://docs.docker.com/build/cache/  

* 단, 모든 줄마다 레이어를 만들지는 않고 **파일 시스템에 변화가 생기는 (ex. `ADD`, `COPY`, `RUN`)경우에만 이미지 레이어를 생성**한다.
* echo 등과 같이 standard out을 발생시키는 커맨드같은 경우 새로운 레이어를 만들지 않기 때문에 이미지 사이즈에 영향을 주지 않는다.

## Docker Cache

- Docker 빌드 시 매번 모든 레이어를 빌드하면 속도가 느려질 수 있다.
    - 이를 해결하기 위해 Docker는 Docker cache를 통해 해당 문제를 해결했다.
- 각 레이어에서 변경 사항이 없다면, **기존 레이어를 재사용하여 빌드 과정에서 속도를 높인다.**
    - 반면, 변경 사항이 존재하는 경우 레이어의 캐시를 무효화하고 다시 빌드한다.
- 이 과정에서 캐시가 무효화 되는 경우가 있는데, 대표적으로 우리가 작성한 코드가 변경되는 경우가 있다.
    - 이 경우, 수정 사항이 발생하여 레이어의 캐시가 무효화되는데, 문제는 **이후의 모든 레이어도 처음부터 다시 빌드해야 한다.**
        
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/90d46542-63a0-4ed0-9d57-dac0a9444dae)

https://docs.docker.com/build/cache/
        
- **Build Cache가 무효화되는 경우**
    - Starting with a parent image that's already in the cache, the next instruction is compared against all child images derived from that base image to see if one of them was built using the exact same instruction. If not, the cache is invalidated.
    - In most cases, simply comparing the instruction in the Dockerfile with one of the child images is sufficient. However, certain instructions require more examination and explanation.
    - For the `ADD` and `COPY` instructions, the modification time and size file metadata is used to determine whether cache is valid. During cache lookup, cache is invalidated if the file metadata has changed for any of the files involved.
    - Aside from the `ADD` and `COPY` commands, cache checking doesn't look at the files in the container to determine a cache match. For example, when processing a `RUN apt-get -y update` command the files updated in the container aren't examined to determine if a cache hit exists. In that case just the command string itself is used to find a match.

## Docker Cache 효율적으로 사용하기

> 간단하게 **변경이 잦은 레이어를 최대한 코드 마지막에 배치한다.**
> 

<aside>
❓ 변경이 잦은 레이어를 마지막에 배치하는 이유

</aside>

- 이미지 레이어가 변경되면 **하위 이미지 레이어는 변경 사항이 없더라도 캐시를 사용하지 못한다. (이미지 레이어 체인)**

![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/9e9e3d41-d210-4223-9979-55c587b9e04a)


https://malwareanalysis.tistory.com/236

![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/baeb6cc7-ec4e-43f4-aac4-ccf8a3599c8a)


https://malwareanalysis.tistory.com/236

- 이미지 레이어는 데이터와 Parent 정보로 구성되어 있기 때문에, **Parent의 정보가 변경되면 하위 이미지 레이어 전체가 변경되기 때문이다.**
- 만약 **캐시가 무효화되는 경우 하위 Dockerfile 명령은 새 이미지를 생성하고 캐시가 사용되지 않는다.** (Once the cache is invalidated, all subsequent Dockerfile commands generate new images and the cache isn't used.)
- 따라서, **코드 수정이 잦은 레이어는 하단으로 배치하여 마지막에 빌드**하는 것이 캐시 기능을 잘 활용할 수 있다. (If your build contains several layers and you want to ensure the build cache is reusable, order the instructions from less frequently changed to more frequently changed where possible.)

## 응용 예시

<aside>
⚠️ 단, 이 방법은 각 개발 및 배포 환경에 따라 속도나 용량이 다를 수 있습니다.

</aside>

https://github.com/yu-heejin/docker-layer-cache

### Spring Boot

1. 기존 방식으로 빌드하기
    
    ```docker
    FROM openjdk:11-jdk
    ARG JAR_FILE=./build/libs/*-SNAPSHOT.jar
    COPY ${JAR_FILE} app.jar
    EXPOSE 8080
    ENTRYPOINT [ "java", "-jar", "/app.jar" ]
    ```
    
    ```docker
    **[+] Building 5.7s (8/8) FINISHED**                                                                                                                    
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 529B                                                                                                           0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/openjdk:11-jdk                                                                              1.8s
     => [auth] library/openjdk:pull token for registry-1.docker.io                                                                                 0.0s
     => [internal] load build context                                                                                                              3.8s
     => => transferring context: 40.38MB                                                                                                           3.8s
     => [1/2] FROM docker.io/library/openjdk:11-jdk@sha256:99bac5bf83633e3c7399aed725c8415e7b569b54e03e4599e580fc9cdb7c21ab                        0.0s
     => CACHED [2/2] COPY ./build/libs/*-SNAPSHOT.jar app.jar                                                                                      0.0s
     => exporting to image                                                                                                                         0.0s
     => => exporting layers                                                                                                                        0.0s
     => => writing image sha256:0417aef0a6104dbf838cd3f5c1154120245f0e8d8d964d0cda1f738456224e88
    
    # 코드 수정 후 재빌드
    **[+] Building 5.4s (7/7) FINISHED**                                                                                                                    
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 37B                                                                                                            0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/openjdk:11-jdk                                                                              1.2s
     => [internal] load build context                                                                                                              3.8s
     => => transferring context: 40.38MB                                                                                                           3.8s
     => CACHED [1/2] FROM docker.io/library/openjdk:11-jdk@sha256:99bac5bf83633e3c7399aed725c8415e7b569b54e03e4599e580fc9cdb7c21ab                 0.0s
     => [2/2] COPY ./build/libs/*-SNAPSHOT.jar app.jar                                                                                             0.1s
     => exporting to image                                                                                                                         0.1s
     => => exporting layers                                                                                                                        0.1s
     => => writing image sha256:936b52aef27393642b8a3d2afc4cac2f6e713b901013deb197b9e913ef26efc2                                                   0.0s
     => => naming to docker.io/library/backend
    ```
    
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/228e9dbd-e2dc-4f47-be7e-99f822307f08)

    
2. Layered jar 방식을 사용하여 빌드하기
    
    <aside>
    📝 Layered jar 방식에 대한 설명은 아래 링크를 참고해주세요.
    
    </aside>
    
    [Reusing Docker Layers with Spring Boot | Baeldung](https://www.baeldung.com/docker-layers-spring-boot)
    
    ![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/9b83c22b-2342-4886-8454-38f6ed20046e)

    ```
    FROM adoptopenjdk:11-jdk
    WORKDIR application
    COPY ./dependencies ./
    COPY ./spring-boot-loader ./
    COPY ./snapshot-dependencies ./
    COPY ./application ./
    ENTRYPOINT ["java", "-Dspring.profiles.active=dev", "-Duser.timezone=Asia/Seoul", "org.springframework.boot.loader.JarLauncher"]
    ```
    
    ```docker
    **+] Building 6.0s (12/12) FINISHED**                                                                                                                  
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 525B                                                                                                           0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/adoptopenjdk:11-jdk                                                                         1.8s
     => [auth] library/adoptopenjdk:pull token for registry-1.docker.io                                                                            0.0s
     => [1/6] FROM docker.io/library/adoptopenjdk:11-jdk@sha256:0f081fe6de07a0a97d74768f512e2a2f2493cb5f383d7d4fa9f46a6d689b6850                   0.0s
     => [internal] load build context                                                                                                              3.9s
     => => transferring context: 40.51MB                                                                                                           3.9s
     => CACHED [2/6] WORKDIR application                                                                                                           0.0s
     => CACHED [3/6] COPY ./dependencies ./                                                                                                        0.0s
     => CACHED [4/6] COPY ./spring-boot-loader ./                                                                                                  0.0s
     => CACHED [5/6] COPY ./snapshot-dependencies ./                                                                                               0.0s
     => [6/6] COPY ./application ./                                                                                                                0.1s
     => exporting to image                                                                                                                         0.0s
     => => exporting layers                                                                                                                        0.0s
     => => writing image sha256:05753e1106cb71b701329881a35ae2396df5a7941fcc03e17fad19a7223f7a6e                                                   0.0s
     => => naming to docker.io/library/backend
    
    # 코드 수정 후 재빌드
    **[+] Building 1.0s (11/11) FINISHED**                                                                                                                  
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 37B                                                                                                            0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/adoptopenjdk:11-jdk                                                                         0.8s
     => [internal] load build context                                                                                                              0.0s
     => => transferring context: 46.21kB                                                                                                           0.0s
     => [1/6] FROM docker.io/library/adoptopenjdk:11-jdk@sha256:0f081fe6de07a0a97d74768f512e2a2f2493cb5f383d7d4fa9f46a6d689b6850                   0.0s
     => CACHED [2/6] WORKDIR application                                                                                                           0.0s
     => CACHED [3/6] COPY ./dependencies ./                                                                                                        0.0s
     => CACHED [4/6] COPY ./spring-boot-loader ./                                                                                                  0.0s
     => CACHED [5/6] COPY ./snapshot-dependencies ./                                                                                               0.0s
     => [6/6] COPY ./application ./                                                                                                                0.0s
     => exporting to image                                                                                                                         0.0s
     => => exporting layers                                                                                                                        0.0s
     => => writing image sha256:828126f560858d377b7818ab12a8822af64086ea18d36eb1a8c41e609468f0a2                                                   0.0s
     => => naming to docker.io/library/backend
    ```
    
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/cb683d75-d197-4811-88e3-c67ee5cdf53d)

    

### Node.js

1. 기존 방식으로 빌드
    
    ```docker
    FROM node:18
    WORKDIR /backend/
    COPY . .
    RUN npm install
    CMD ["npm", "start"]
    ```
    
    ```docker
    **[+] Building 11.9s (9/9) FINISHED**                                                                                                                   
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 37B                                                                                                            0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/node:18                                                                                     0.8s
     => [internal] load build context                                                                                                              0.0s
     => => transferring context: 1.15kB                                                                                                            0.0s
     => [1/4] FROM docker.io/library/node:18@sha256:2a13079c6393cd19adfd8d362fac004b2d0eed462f3c3fedfad2c0d0de17b429                               0.0s
     => CACHED [2/4] WORKDIR /backend/                                                                                                             0.0s
     => [3/4] COPY . .                                                                                                                             0.0s
     => [4/4] RUN npm install                                                                                                                     10.5s
     => exporting to image                                                                                                                         0.4s
     => => exporting layers                                                                                                                        0.4s
     => => writing image sha256:48bec6b9c9e810d25d6727191ab69154dfcd9a800cae203a5081adf427e44818                                                   0.0s 
     => => naming to docker.io/library/backend
    
    # 코드 수정 후 재빌드
    **[+] Building 14.9s (9/9) FINISHED**                                                                                                                   
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 37B                                                                                                            0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/node:18                                                                                     0.8s
     => [1/4] FROM docker.io/library/node:18@sha256:2a13079c6393cd19adfd8d362fac004b2d0eed462f3c3fedfad2c0d0de17b429                               0.0s
     => [internal] load build context                                                                                                              0.0s
     => => transferring context: 1.15kB                                                                                                            0.0s
     => CACHED [2/4] WORKDIR /backend/                                                                                                             0.0s
     => [3/4] COPY . .                                                                                                                             0.0s
     => [4/4] RUN npm install                                                                                                                     13.6s
     => exporting to image                                                                                                                         0.4s
     => => exporting layers                                                                                                                        0.4s
     => => writing image sha256:60c4e7b88b88d12f0c5edf9d8db9c15c5ad0d20d84b272ab5a653edfe4315dcc                                                   0.0s 
     => => naming to docker.io/library/backend
    ```
    
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/eaaf8d50-8f10-47ba-89af-4c9e5a1a6cf4)

    
2. 캐시를 사용한 빌드
    
    ```docker
    FROM node:18
    WORKDIR /backend/
    COPY package*.json /backend/
    RUN npm install
    # 변경이 잦은 코드 복사를 가장 마지막에 배치
    COPY . .
    CMD ["npm", "start"]
    ```
    
    ```docker
    **+] Building 13.5s (11/11) FINISHED**                                                                                                                 
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 351B                                                                                                           0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/node:18                                                                                     1.5s
     => [auth] library/node:pull token for registry-1.docker.io                                                                                    0.0s
     => [1/5] FROM docker.io/library/node:18@sha256:2a13079c6393cd19adfd8d362fac004b2d0eed462f3c3fedfad2c0d0de17b429                               0.0s
     => [internal] load build context                                                                                                              0.0s
     => => transferring context: 1.46kB                                                                                                            0.0s
     => CACHED [2/5] WORKDIR /backend/                                                                                                             0.0s
     => [3/5] COPY package*.json /backend/                                                                                                         0.0s
     => [4/5] RUN npm install                                                                                                                     11.4s
     => [5/5] COPY . .                                                                                                                             0.0s
     => exporting to image                                                                                                                         0.4s
     => => exporting layers                                                                                                                        0.4s
     => => writing image sha256:08eff0316f49e4da7dfe4c75baf00a4a3658e25f2d5c5e09fd3d837001fd67d6                                                   0.0s 
     => => naming to docker.io/library/backend
    
    # 코드 수정 후 재빌드
    **[+] Building 1.1s (10/10) FINISHED**                                                                                                                  
     => [internal] load build definition from Dockerfile                                                                                           0.0s
     => => transferring dockerfile: 37B                                                                                                            0.0s
     => [internal] load .dockerignore                                                                                                              0.0s
     => => transferring context: 2B                                                                                                                0.0s
     => [internal] load metadata for docker.io/library/node:18                                                                                     0.8s
     => [internal] load build context                                                                                                              0.0s
     => => transferring context: 1.15kB                                                                                                            0.0s
     => [1/5] FROM docker.io/library/node:18@sha256:2a13079c6393cd19adfd8d362fac004b2d0eed462f3c3fedfad2c0d0de17b429                               0.0s
     => CACHED [2/5] WORKDIR /backend/                                                                                                             0.0s
     => CACHED [3/5] COPY package*.json /backend/                                                                                                  0.0s
     => CACHED [4/5] RUN npm install                                                                                                               0.0s
     => [5/5] COPY . .                                                                                                                             0.0s
     => exporting to image                                                                                                                         0.0s
     => => exporting layers                                                                                                                        0.0s
     => => writing image sha256:85bde5c523280367d908050c6c37ef308eddd4239100fa476fa8b5284561ba9e                                                   0.0s
     => => naming to docker.io/library/backend
    ```
    
![image](https://github.com/yu-heejin/docker-layer-cache/assets/96467030/33c8dbe7-f566-4648-b5f6-92c27e32dce1)

    

## 추가로 알아두면 좋은 자료

- Docker 빌드 최적화 모범 사례
    
    [Best practices for Dockerfile instructions](https://docs.docker.com/develop/develop-images/instructions/)
    
- GitHub Actions를 활용한 Docker 캐싱
    
    > GitHub Actions의 러너는 매번 새로운 가상 환경에서 실행되기 때문에 모든 작업은 새롭게 다시 시작된다. 만약 GitHub Actions에서 캐시 기능을 사용하고 싶다면 docker/build-push-action을 사용해볼 수 있다.
    > 
    
    [GitHub Actions에서 도커 캐시를 적용해 이미지 빌드하기 | 카카오엔터테인먼트 FE 기술블로그](https://fe-developers.kakaoent.com/2022/220414-docker-cache/)
    
    [Github Action에서 Docker Image Layers 캐싱하기](https://flavono123.oopy.io/posts/cache-container-image-layers-in-github-action)
    
- Docker Layer에 대한 심화 자료
    
    [[Docker] Docker가 Image Layer를 구성하는 방법](https://creboring.net/blog/how-docker-divide-image-layer/)

## 참고 자료

- https://fe-developers.kakaoent.com/2022/220414-docker-cache/
- https://docs.docker.com/develop/develop-images/dockerfile_best-practices/#leverage-build-cache
- https://docs.docker.com/build/cache/
- https://malwareanalysis.tistory.com/236
- https://medium.com/swlh/docker-caching-introduction-to-docker-layers-84f20c48060a
