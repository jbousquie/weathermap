function init(){

  var links = [
    { o:{x:0, y:50, z:100}, d:{x:70, y:-10, z:50} },
    { o:{x:50, y:100, z:0}, d:{x:-50, y:-50, z:-50} },
    { o:{x:-50, y:80, z:100}, d:{x:10, y:-10, z:-100} },
    { o:{x:-90, y:20, z:80}, d:{x:20, y:-50, z:-50} }
  ];
  

  // initialisation de la scène et du renderer
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 5000);
  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xFEFEFE, 0.9);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMapEnabled = true;
  document.querySelector('#WebGL').appendChild(renderer.domElement);

  // initialisation des contrôle du trackball
  var trackballControls = new THREE.TrackballControls(camera);
  trackballControls.rotateSpeed = 1.0;
  trackballControls.zoomSpeed = 1.0;
  trackballControls.panSpeed = 1.0;

  camera.position.x = 0;
  camera.position.y = 10;
  camera.position.z = 600;
  camera.lookAt(scene.position);

  var ambientLight = new THREE.AmbientLight(0xFEFEFE);
  scene.add(ambientLight);


  var uniforms = {
    time: { type: "f", value: 0},
    resolution: { type: "v2", value: new THREE.Vector2 },
    vec: { type: "v2", value : new THREE.Vector2}
  };

  var mat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: document.querySelector('#vertex-shader').innerHTML,
    fragmentShader: document.querySelector('#fragment-shader').innerHTML
  });

  var curveRadius = 10;
  for(var i=0; i<links.length; i++) {
    var ori = new THREE.Vector3(links[i].o.x, links[i].o.y, links[i].o.z);
    var dst = new THREE.Vector3(links[i].d.x, links[i].d.y, links[i].d.z);
    var mid = new THREE.Vector3( (links[i].o.x+links[i].d.x)/2, (links[i].o.y+links[i].d.y)/2 - curveRadius, (links[i].o.z+links[i].d.z)/2 );

    var curve = new THREE.QuadraticBezierCurve3(ori, mid, dst );
    var linkGeom = new THREE.TubeGeometry(curve, 64, 5);
    var delta_x = dst.x - ori.x;
    var delta_y = dst.y - ori.y;
    var norme = Math.sqrt(delta_x * delta_x + delta_y * delta_y);
    //uniforms.vec.x = delta_x / norme;
    //uniforms.vec.y =  delta_y / norme;
    uniforms.vec.x = delta_x;
    uniforms.vec.y =  delta_y;
    var link = new THREE.Mesh(linkGeom, mat);
    scene.add(link);
  }

  function render() {  
    var delta = clock.getDelta();
    uniforms.time.value += delta * 10;
    trackballControls.update(delta);
    renderer.render(scene, camera);
  }
  
  function loop() {
    window.requestAnimationFrame(loop);
    render();
  }

  var clock = new THREE.Clock();
  loop();
}