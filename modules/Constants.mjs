export const DEBUG = false;

export const MERCATOR_A = 6378137.0;
export const WORLD_SIZE = MERCATOR_A * Math.PI * 2;


export const ThreeboxConstants = {
	WORLD_SIZE: WORLD_SIZE,
	PROJECTION_WORLD_SIZE: WORLD_SIZE / (MERCATOR_A * Math.PI * 2),
	MERCATOR_A: MERCATOR_A,
	DEG2RAD: Math.PI / 180,
	RAD2DEG: 180 / Math.PI,
	EARTH_CIRCUMFERENCE: 40075000, // In meters
}
