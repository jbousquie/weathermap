// Ce script se charge de toute la partie de rendu à partir des données récupérées
// par le script weathermap.js

// variable globale devices : tableau des devices
var devices = {};

// variable globale links : tableau des links
var links = [];

// tableau général des textSprites
var textSprites= [];


// fonction createDevices()
// crée les objets Device et les range dans le tableau devices
function createDevices(devices) {
  for(var i=0; i<graph.length; i++) {
    var dev = new Device(graph[i]["name"], graph[i]["type"], graph[i]["coord"],graph[i]["label"],graph[i]["ifnames"]);
    devices[graph[i]["name"]] = dev;
  }
}


// fonction createLinks()
// crée tous les objets Link et les range dans le tableau links
function createLinks(devices, links) {
  var texture_index = 0;
  // boucle sur tous les devices
  for ( var i in devices ) {
    var device_ifnames = devices[i].ifnames;
    // boucle sur les ifnames du device
    for (ifname in device_ifnames) {
      // si le ifname a une destination (not null)
      if ( device_ifnames[ifname] != null ) {
        lk = new Link(ifname, devices[i], devices[device_ifnames[ifname]]);
        links.push(lk);
        devices[i].link[ifname] = lk;
        devices[i].txt_idx[ifname] = texture_index;
      // si la destination == null, on passe au suivant => pas de lien
      }
      devices[i].txt_idx[ifname] = texture_index;
      texture_index += 1;
    }
  }
}


//  fonction makeTextPlane :
// crée un sprite texte
var makeTextPlane = function(text, size, scene) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 600, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 200, "bold 72px Arial", "black", "transparent", true);
  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
  plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
  plane.material.backFaceCulling = false;
  plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
  plane.material.diffuseTexture = dynamicTexture;
  return plane;
};


// fonction createScene : dessin de tous les éléments visuels
var createScene = function(canvas, engine) {
  // on crée tous les objets logiques à manipuler
  createDevices(devices);
  createLinks(devices, links);

  // BabylonJS
  var scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.9, 0.9, 0.9);
  var camera = new BABYLON.ArcRotateCamera("Camera", 0 ,0, 0, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0,10,-500));
  camera.attachControl(canvas, false);

  var light0 = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(0,1,0), scene);
  light0.diffuse = new BABYLON.Color3(1, 1, 1);
  light0.specular = new BABYLON.Color3(1, 1, 1);
  light0.groundColor = new BABYLON.Color3(0, 0, 0);

  // axes pour le debug
  showAxis(100, scene);

  // dessin de tous les équipements du graphe
  // ========================================
  // dessin des devices
  var deviceMat = new BABYLON.StandardMaterial("DeviceMaterial", scene);
  deviceMat.alpha = 0.9;
  deviceMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  deviceMat.emissiveColor = new BABYLON.Color3.Black();
  //deviceMat.backFaceCulling = false;
  //mat.wireframe = true;
  var nb = 0;
  for( var i in devices ) {
    var device = new BABYLON.Mesh.CreateBox("Device"+nb, 10.0, scene);
    device.material = deviceMat;
    device.position.x = devices[i].x;
    device.position.y = devices[i].y;
    device.position.z = devices[i].z;
    device.scaling.x = 5;
    device.scaling.z  = 2.5;

    var labelSize = 60;
    var label = makeTextPlane(devices[i].name, labelSize, scene);
    label.position = new BABYLON.Vector3(devices[i].label[0], devices[i].label[1] - labelSize/2, devices[i].label[2]);
    nb++;
  }

  return scene;
};

// fonction displayGraph : 
// tout le rendu est dans une fonction appelée par le init() général
function displayGraph(refresh_rate) {

  // initialisation du moteur et de la render loop
  var canvas = document.querySelector('#WebGL');
  var engine = new BABYLON.Engine(canvas, true);
  var scene = createScene(canvas, engine);
  window.addEventListener("resize", function() {
    engine.resize();
  });

  engine.runRenderLoop(function() {
    scene.render();
  });

  
/*  // dessin des liens
  // ================

  // rayon de la section d'un lien tubulaire
  var linkRadius = 2;
  // courbe du lien : courbe de Bézier, déport latéral y d'un unique point de contrôle au milieu des extrémités du lien ... pour l'instant
  var curveRadius = 10;

  var index = 0;
  for ( var i=0; i<links.length; i++) {
      var originIn = new THREE.Vector3(links[i].device_origin.x-linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetIn = new THREE.Vector3(links[i].device_destination.x-linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleIn = new THREE.Vector3( (links[i].device_origin.x-linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
      var originOut = new THREE.Vector3(links[i].device_origin.x+linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetOut = new THREE.Vector3(links[i].device_destination.x+linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleOut = new THREE.Vector3( (links[i].device_origin.x+linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
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

      var index = links[i].device_origin.txt_idx[links[i].name];
      //var linkLabel = makeTextSprite(dataTexture,index);

      // on initialise un spriteText par label 
      var tex = dataTexture.texture.clone();
      tex.needsUpdate = true;
      tex.offset.set(0, 1 / links.length * i);
      tex.repeat.set(1, 1 / links.length);
      //var linkLabel = new TextSprite(tex);
      var mat = new THREE.SpriteMaterial({map: tex});
      var linkLabel = new THREE.Sprite(mat);
      textSprites[i] = linkLabel;
      //linkLabel.sprite.position.set(middleIn.x, middleIn.y, middleIn.z+10);
      //linkLabel.sprite.scale.set(40,8,0);
      linkLabel.position.set(middleIn.x, middleIn.y, middleIn.z+10);
      linkLabel.scale.set(40,8,0);
    
      scene.add(linkIn);
      scene.add(linkOut);
      //scene.add(linkLabel.sprite);
      scene.add(linkLabel);
  }*/

  // fonction limit(var, limite, pas) : si var dépasse limite dans le sens du pas alors retourne limite, sinon retourne vr
  function limit(vr, lm, stp) {
    if (stp == 0) { return vr; }
    if (stp > 0 ) {
      if (vr >= lm) { return lm; }
    }
    else {
      if (lm >= vr) { return lm; }
    }
    return vr;
  }

  // mise à jour des données de monitoring
  function updateData(frequency) {
     var prd = refresh_rate * frequency; // nombre de portions
    // pour chaque entrée de data, on met à jour les attributs des Devices
    for (var res in data) {
      var dev = devices[res];
      var metrics = dev.metrics;
      var ifaces = data[res];
      for (var i=0; i<ifaces.length; i++) {
        var ifname = ifaces[i]["name"];
        var descr = ifaces[i]["descr"];
        var speed = ifaces[i]["speed"];
        var octInOut = ifaces[i]["octInOut"];
        // mesure de la bande bassante
        var mbps = 8 / 1000 / 1000;
        var mbpsIn = octInOut[0]  * mbps;
        var mbpsOut = octInOut[1] * mbps;
        // si la mesure change
        if ( metrics[ifname].last[0] != mbpsIn || metrics[ifname].last[1] != mbpsOut) {
          metrics[ifname].previous[0] = metrics[ifname].last[0];
          metrics[ifname].previous[1] = metrics[ifname].last[1];
          metrics[ifname].last[0] = mbpsIn;
          metrics[ifname].last[1] = mbpsOut;
          metrics[ifname].current[0] = metrics[ifname].previous[0];
          metrics[ifname].current[1] = metrics[ifname].previous[1];
          metrics[ifname].step = [ (metrics[ifname].last[0] - metrics[ifname].previous[0]) /prd , (metrics[ifname].last[1] - metrics[ifname].previous[1]) /prd ];
        }
        else {
          metrics[ifname].current[0] += metrics[ifname].step[0];
          metrics[ifname].current[1] += metrics[ifname].step[1];
          metrics[ifname].current[0] = limit(metrics[ifname].current[0], metrics[ifname].last[0], metrics[ifname].step[0]);
          metrics[ifname].current[1] = limit(metrics[ifname].current[1], metrics[ifname].last[1], metrics[ifname].step[1]);
        }
      }
    }
  }

  // mise à jour visuelle des éléments du graphe
  function updateGraph() {
    var i = 0;
    var dataHeight = 30;
    dataTexture.clear();
    //dataTexture.canvas.height = dataHeight;
    for (var dev in devices) {
      var metrics = devices[dev].metrics;
      var texture = devices[dev].visuals;
      for( var mes in metrics ) {
        var bdIn = metrics[mes].current[0];
        var bdOut = metrics[mes].current[1];
        var text = "in : "+bdIn.toFixed(2)+" out : "+bdOut.toFixed(2);
        // on écrit tout le texte des mesures à la suite dans une unique texture
        dataTexture.drawText(text, 0, dataHeight*i, "normal bold 36px Arial");
        //var tex = dataTexture.texture.clone();
        //textSprites[i].update(tex);
        i++;
      }
    }

  }


  // boucle infinie : màj données, màj dessins, rendu
  function loop() {
    window.requestAnimationFrame(loop);
    updateData(60);
    updateGraph();
  }


}

//  fonction showAxis
var showAxis = function(size, scene) {
  var axisX = BABYLON.Mesh.CreateLines("axisX", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0) ], scene);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var axisY = BABYLON.Mesh.CreateLines("axisY", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0) ], scene);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size) ], scene);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
};