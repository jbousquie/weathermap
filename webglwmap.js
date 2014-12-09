// Ce script se charge de toute la partie de rendu à partir des données récupérées
// par le script weathermap.js

// variable globale devices : tableau des devices
var devices = [];

// variable globale links : tableau des links
var links = [];

// objet Device
var Device = function(name, type, coord, label, ifnames) {
  this.name = name;
  this.type = type;
  this.label = label;
  this.x = coord[0];
  this.y = coord[1];
  this.z = coord[2];
  this.ifnames = ifnames;
}

// objet Link
var Link = function(ifname, device_origin, device_destination) {
  this.name = ifname;
  this.device_origin = device_origin;
  this.device_destination = device_destination;
}

Link.prototype.setSpeed = function(speed) {
  this.speed = speed;
}

// fonction createDevices()
// crée les objets Device et les range dans le tableau devices
function createDevices() {
  for(var i=0; i<graph.length; i++) {
    var dev = new Device(graph[i]["name"], graph[i]["type"], graph[i]["coord"],graph[i]["label"],graph[i]["ifnames"]);
    devices.push(dev);
  }
}

// fonction getDeviceByName()
// retrouve un objet Device à partir de son nom, retourne null sinon
function getDeviceByName(name) {
  var i = 0;
  while(i < devices.length) {
    if (devices[i].name == name) { return devices[i]; }
    i++;
  }
  return null;
}

// fonction createLinks()
// crée tous les objets Link et les range dans le tableau links
function createLinks() {
  // boucle sur tous les devices
  for (var i=0; i<devices.length; i++) {
    var device_ifnames = devices[i].ifnames;
    // boucle sur les ifnames du device
    for (ifname in device_ifnames) {
        // si le ifname a une destination (not null)
      if ( device_ifnames[ifname] != null ) {
        lk = new Link(ifname, devices[i], device_ifnames[ifname]);
        links.push(lk);
      // si la destination == null, on passe au suivant => pas de lien
      }
    }
  }
}


// on met le rendu dans une fonction appelée par le init() général
function displayGraph() {

  // on crée tous les objets logiques à manipuler
  createDevices();
  createLinks();

  // initialisation de la scène et du renderer
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 1000);
  var renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0xFEFEFE, 0.9);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMapEnabled = true;
  document.querySelector('#WebGL').appendChild(renderer.domElement);

  camera.position.x = 10;
  camera.position.y = 5;
  camera.position.z = 300;
  camera.lookAt(scene.position);

  var  axes = new THREE.AxisHelper(20);
  scene.add(axes);

  var ambientLight = new THREE.AmbientLight(0xFEFEFE);
  scene.add(ambientLight);

  // initialisation des contrôle du trackball
  var trackballControls = new THREE.TrackballControls(camera);
  trackballControls.rotateSpeed = 1.0;
  trackballControls.zoomSpeed = 1.0;
  trackballControls.panSpeed = 1.0;
  
  // dessin de tous les équipements du graphe
  // dessin des devices
  for( var i=0; i<devices.length; i++ ) {
    var deviceGeometry = new THREE.BoxGeometry(50,10,25);
    var deviceMaterial = new THREE.MeshLambertMaterial();
    //deviceMaterial.color.setRGB(.7,.5,.5);
    deviceMaterial.ambient.setRGB(.5,.5,.5);

    var device = new THREE.Mesh(deviceGeometry, deviceMaterial);
    device.position.x = devices[i].x;
    device.position.y = devices[i].y;
    device.position.z = devices[i].z;
    scene.add(device);
  }

  // dessin des liens
  for ( var i=0; i<links.length; i++) {
      var origin = new THREE.Vector3(links[i].device_origin.x, links[i].device_origin.y, links[i].device_origin.z);
      var target = new THREE.Vector3(links[i].device_destination.x, links[i].device_destination.y, links[i].device_destination.z);
      var middle = new THREE.Vector3( (links[i].device_origin.x+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - 10,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
    //var curve = new THREE.SplineCurve3( [origin, target] ); 
    //var curve = new THREE.LineCurve3( origin, target ); 
      var curve = new THREE.QuadraticBezierCurve3(origin, middle, target ); 

      var linkGeometry = new THREE.TubeGeometry(curve);

      var linkMaterial = new THREE.MeshLambertMaterial();
      //linkMaterial.color.setRGB(0.2,0.2,.9);
      linkMaterial.ambient.setRGB(0,0,1);
      var link = new THREE.Mesh(linkGeometry, linkMaterial);

      scene.add(link);
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