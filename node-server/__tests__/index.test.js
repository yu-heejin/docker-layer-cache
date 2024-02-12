import { findUser, findUserReturnBoolean, calculateDivide } from '../index';

const users = ['Neo', 'Dorothy', 'Potato', 'Frontend', 'Backend'];

// Jest 기본 문법
describe('3 더하기 5의 결과는 무엇일까?', () => {	
	test('3 더하기 5는 8입니다.', () => {
		expect(3 + 5).toEqual(8);
	})
});

// 1. users 배열에서 'Neo'라는 닉네임을 가진 유저의 인덱스 위치 반환 테스트 작성
// users 배열에서 'Neo'라는 닉네임을 가진 유저의 인덱스 위치 반환 테스트 작성
test('Neo라는 사람은 존재합니다.', () => {
    expect(findUser('Neo', users)).toEqual(0);
});

// 2. users 배열에서 'Foo'라는 사람이 존재하지 않는지 확인
test('Foo라는 사람은 없습니다.', () => {
	expect(findUserReturnBoolean('Foo', users)).toBeFalsy();
})

// 3. (테스트 2개) 0으로 나누었을 때 오류가 발생하는지 확인, 4 나누기 2의 몫이 2인지 확인
describe('나누기 함수 실행하기', () => {	
	test('4 나누기 2는 2입니다.', () => {
		expect(calculateDivide(4, 2)).toEqual(2);
	});

	test('0으로 나누었을 때 오류가 발생합니다.', () => {
		expect(() => calculateDivide(3, 0)).toThrow('[ERROR] 나누는 수는 0이 될 수 없습니다.');
	});
});
