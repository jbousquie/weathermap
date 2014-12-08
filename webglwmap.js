

// on met le rendu dans une fonction appelée par le init() général
function displayGraph() {
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 1000);
  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xFEFEFE, 0.9);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMapEnabled = true;
  document.querySelector('#WebGL').appendChild(renderer.domElement);

  camera.position.x = 10;
  camera.position.y = 5;
  camera.position.z = 60;
  camera.lookAt(scene.position);

  var  axes = new THREE.AxisHelper(20);
  scene.add(axes);

  var ambientLight = new THREE.AmbientLight(0xc0c0c0);
  scene.add(ambientLight);

  var trackballControls = new THREE.TrackballControls(camera);
  trackballControls.rotateSpeed = 1.0;
  trackballControls.zoomSpeed = 1.0;
  trackballControls.panSpeed = 1.0;
  
  // dessin de tous les équipements du graphe
  for(i=0;i<graph.length;i++) {
    var deviceGeometry = new THREE.BoxGeometry(10,2,5);
    var deviceMaterial = new THREE.MeshLambertMaterial();
    deviceMaterial.opacity = .9;
    deviceMaterial.color.setRGB(.5,.5,.5);

    var device = new THREE.Mesh(deviceGeometry, deviceMaterial);
    device.position.x = graph[i]["coord"][0];
    device.position.y = graph[i]["coord"][1];
    device.position.z = graph[i]["coord"][2];
    console.log(graph[i]["coord"]);

    scene.add(device);

  }


  // boucle d'animation
  function render() {
    window.requestAnimationFrame(render);
    var delta = clock.getDelta();
    trackballControls.update(delta);
    renderer.render(scene, camera);
  }

  var clock = new THREE.Clock();
  render();


}