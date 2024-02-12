# 캐시 최적화
FROM node:18
WORKDIR /backend/
COPY package*.json /backend/
RUN npm install
# 변경이 잦은 코드 복사를 가장 마지막에 배치
COPY . .
CMD ["npm", "start"]

# 최적화하지 않은 경우
FROM node:18
WORKDIR /backend/
COPY . .
RUN npm install
CMD ["npm", "start"]