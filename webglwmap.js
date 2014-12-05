var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer();

function display() {
  document.querySelector('#WebGL').appendChild(renderer.domElement);
  renderer.render(scene, camera);
}