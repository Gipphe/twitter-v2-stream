class Left<A> {
	private value: A;

	public constructor(x: A) {
		this.value = x;
	}

	public unwrap(): A {
		return this.value;
	}
}

class Right<A> {
	private value: A;

	public constructor(x: A) {
		this.value = x;
	}

	public unwrap(): A {
		return this.value;
	}
}

export type Either<A, B> = Left<A> | Right<B>;

export const left = <A, B>(x: A): Either<A, B> => new Left(x);
export const right = <A, B>(x: B): Either<A, B> => new Right(x);

export function fold<A, B, C>(fa: (l: A) => C, fb: (r: B) => C): (either: Either<A, B>) => C {
	return (e: Either<A, B>): C => {
		if (e instanceof Left) {
			return fa(e.unwrap());
		}
		return fb(e.unwrap());
	};
}
