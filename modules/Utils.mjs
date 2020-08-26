export function YToLat(Y){
 return Math.atan(Math.pow(Math.E, ((Y)/111319.490778)*Math.PI/180.0))*360.0/Math.PI-90.0;
}

export function LatToScale(lat){
 return 1 / Math.cos(lat * Math.PI / 180);
}