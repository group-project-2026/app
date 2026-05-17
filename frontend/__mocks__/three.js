// Minimal mock for three module to satisfy imports in tests.
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class SphereGeometry {
  constructor(radius = 1, widthSegments = 8, heightSegments = 6) {
    this.parameters = { radius, widthSegments, heightSegments };
  }
  computeBoundingSphere() {}
}

class Object3D {}

Object3D.prototype.position = new Vector3();
Object3D.prototype.scale = { setScalar: function () {} };
Object3D.prototype.updateMatrix = function () {
  this.matrix = {};
};

module.exports = {
  BackSide: 2,
  Vector3,
  SphereGeometry,
  Object3D,
  Color: class Color {
    constructor(value) {
      this.value = value || "#ffffff";
    }
    set() {}
  }
};
