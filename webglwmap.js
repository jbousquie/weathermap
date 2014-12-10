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
  this.sprite = makeTextSprite(name);
  this.sprite.position.set(this.label[0], this.label[1], this.label[2]);
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
        lk = new Link(ifname, devices[i], getDeviceByName(device_ifnames[ifname]));
        links.push(lk);
      // si la destination == null, on passe au suivant => pas de lien
      }
    }
  }
}


// fonction makeTextSprite
// création d'un sprite à partir d'un canvas2D contenant du texte
// http://stackoverflow.com/questions/23514274/three-js-2d-text-sprite-labels
function makeTextSprite( message, parameters ) {
  if ( parameters === undefined ) parameters = {};
  var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
  var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 72;
  var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
  var borderColor = parameters.hasOwnProperty("borderColor") ?parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
  var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
  var textColor = parameters.hasOwnProperty("textColor") ?parameters["textColor"] : { r:0, g:0, b:0, a:1.0 };

  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  context.font = "Bold " + fontsize + "px " + fontface;
  var metrics = context.measureText( message );
  var textWidth = metrics.width;

  context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
  context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

  context.lineWidth = borderThickness;
  context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
  context.fillText( message, borderThickness, fontsize + borderThickness);

  var texture = new THREE.Texture(canvas) 
  texture.needsUpdate = true;

  var spriteMaterial = new THREE.SpriteMaterial( { map: texture, useScreenCoordinates: false } );
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
  return sprite;
}


// on met le rendu dans une fonction appelée par le init() général
function displayGraph() {

  // on crée tous les objets logiques à manipuler
  createDevices();
  createLinks();

  // initialisation de la scène et du renderer
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, window.innerWidth /window.innerHeight, 0.1, 5000);
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
    scene.add(devices[i].sprite);
  }

  // dessin des liens
  var linkRadius = 1.5;
  for ( var i=0; i<links.length; i++) {
      var originIn = new THREE.Vector3(links[i].device_origin.x-linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetIn = new THREE.Vector3(links[i].device_destination.x-linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleIn = new THREE.Vector3( (links[i].device_origin.x-linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - 10,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
      var originOut = new THREE.Vector3(links[i].device_origin.x+linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetOut = new THREE.Vector3(links[i].device_destination.x+linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleOut = new THREE.Vector3( (links[i].device_origin.x+linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - 10,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
    //var curve = new THREE.SplineCurve3( [origin, target] ); 
    //var curve = new THREE.LineCurve3( origin, target ); 
      var curveIn = new THREE.QuadraticBezierCurve3(originIn, middleIn, targetIn ); 
      var curveOut = new THREE.QuadraticBezierCurve3(originOut, middleOut, targetOut ); 


      var linkGeometryIn = new THREE.TubeGeometry(curveIn,64,linkRadius);
      var linkGeometryOut = new THREE.TubeGeometry(curveOut,64,linkRadius);


      var linkMaterialIn = new THREE.MeshLambertMaterial();
      linkMaterialIn.ambient.setRGB(0,0,1);
      linkMaterialIn.transparent = true;
      linkMaterialIn.opacity = .4;
      var linkIn = new THREE.Mesh(linkGeometryIn, linkMaterialIn);

      var linkMaterialOut = new THREE.MeshLambertMaterial();
      linkMaterialOut.ambient.setRGB(1,0,0);
      linkMaterialOut.transparent = true;
      linkMaterialOut.opacity = .4;
      var linkOut = new THREE.Mesh(linkGeometryOut, linkMaterialOut);

      scene.add(linkIn);
      scene.add(linkOut);

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