// users 배열에서 특정 사용자의 인덱스 위치 찾기
export function findUser(nickname, users) {
    return users.indexOf(nickname);
};

// users 배열에서 특정 사용자가 존재하는지 true/false로 확인
export function findUserReturnBoolean(nickname, users) {
    return users.includes(nickname);
};

// 나누기 계산 함수
export function calculateDivide(a, b) {
    if (b == 0) {
        throw new Error('[ERROR] 나누는 수는 0이 될 수 없습니다.');
    }

    return a / b;
};