// Ce script se charge de toute la partie de rendu à partir des données récupérées
// par le script weathermap.js

"use strict";


// variable globale devices : tableau des devices (logiques)
var devices = {};

// variable globale links : tableau des links (logiques)
var links = [];

// tableau général des textSprites
//var textSprites= [];

// tableau général des mesures
var measures = [];

// tableau des divs
var divs = {};
var curDiv;             // div courant pointé par la souris
var lastDiv;            // dernier div pointé par la souris
var onExit = false;     // on quitte juste un div
var curId;
var lastId;

// préfixes des noms de mesh, tous de même longueur
var prefNameDev = "dev";
var prefNameLnk = "lnk";
var prefLength = prefNameDev.length;

// tableau des meshes
var meshDevices = [];
var meshLinks = [];     // tableau des mesh liens englobants
var meshLinksIn = [];   // tableau des mesh liens IN
var meshLinksOut = [];  // tableau des mesh liens OUT
var pathMesh = [];      // tableau des paths de chaque tube
var pathMeshIn = [];      // tableau des paths de chaque tube IN
var pathMeshOut = [];      // tableau des paths de chaque tube OUT
var radiusFunctionsIn = []; // tableau des radiusFunction de chaque tube IN
var radiusFunctionsOut = []; // tableau des radiusFunction IN de chaque tube OUT
var colorLink = BABYLON.Color3.White();
var colorLinkPointed = new BABYLON.Color3(1, 0.5, 0.5);



// fonction createDevices()
// crée les objets Device et les range dans le tableau devices
function createDevices(devices) {
  for(var i = 0; i < graph.length; i++) {
    var dev = new Device(graph[i]["name"], graph[i]["type"], graph[i]["coord"],graph[i]["label"],graph[i]["ifnames"]);
    devices[graph[i]["name"]] = dev;
  }
}


// fonction createLinks()
// crée tous les objets Link et les range dans le tableau links
function createLinks(devices, links) {
  // boucle sur tous les devices
  for ( var i in devices ) {
    var device_ifnames = devices[i].ifnames;
    // boucle sur les ifnames du device
    for (var ifname in device_ifnames) {
      // si le ifname a une destination (not null)
      if ( device_ifnames[ifname] != null ) {
        var lk = new Link(ifname, devices[i], devices[device_ifnames[ifname]]);
        links.push(lk);
        devices[i].link[ifname] = lk;
        //devices[i].txt_idx[ifname] = texture_index;
        measures.push(devices[i].metrics[ifname]) ; // on stocke les objets mesures de chaque device
        // si la destination == null, on passe au suivant => pas de lien
      }
    }
  }
}

// fonction makeTextTexture
// crée une texture texte
var makeTextTexture = function(text, scene, reverse) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 512, scene, false);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 200, "bold 72px Arial", "darkslateblue", "transparent", reverse);
  // text colors : http://www.w3schools.com/cssref/css_colornames.asp
  return dynamicTexture;
};


// fonction makeTextSprite :
// crée un sprite texte
var makeTextSprite = function(textTexture, size, scene) {
  var spriteManager = new BABYLON.SpriteManager("sm", "", 1, 512, scene);
  spriteManager._spriteTexture = textTexture;
  spriteManager._spriteTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  spriteManager._spriteTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;
  var sprite = new BABYLON.Sprite("textSprite", spriteManager);
  sprite.size = size;
  return sprite;
};

// fonction immutable
// empeche le recalcul de la worldMatrix du mesh pour optimisation
var makeImmutable = function(mesh) {
  mesh.freezeWorldMatrix();
};


// fonction createScene : dessin de tous les éléments visuels
var createScene = function(canvas, engine, refresh_rate) {

  // on crée tous les objets logiques à manipuler
  createDevices(devices);
  createLinks(devices, links);

  // BabylonJS
  var scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.85, 0.85, 0.85);
  var camera = new BABYLON.ArcRotateCamera("Camera", 0 ,0, 0, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0,10,-500));
  camera.attachControl(canvas, false);

  var light0 = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(0,1,0), scene);
  light0.diffuse = new BABYLON.Color3(1, 1, 1);
  light0.specular = new BABYLON.Color3(1, 1, 1);
  light0.groundColor = new BABYLON.Color3(0, 0, 0);

  var pl = new BABYLON.PointLight("pl", new BABYLON.Vector3(0, 0, 0), scene);
  pl.diffuse = new BABYLON.Color3(1, 1, 1);
  pl.intensity = 0.3;

  // axes pour le debug
  // showAxis(100, scene);

  // dessin de tous les équipements du graphe
  // ========================================
  // dessin des devices
  var deviceMat = new BABYLON.StandardMaterial("DeviceMaterial", scene);
  deviceMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
  var deviceMatFace = new BABYLON.StandardMaterial("DeviceMatFace", scene);
  deviceMatFace.diffuseColor = new BABYLON.Color3(1, 1, 1);
  var deviceMultiMat = new BABYLON.MultiMaterial("deviceMultiMat", scene);
  deviceMultiMat.subMaterials.push(deviceMatFace);
  deviceMultiMat.subMaterials.push(deviceMat);
  var switchTexture = new BABYLON.Texture('images/switch.png', scene, true);
  deviceMatFace.diffuseTexture = switchTexture;

  var deviceMesh;
  var instanceMesh;
  var index = 0;
  for( var i in devices) {
    var deviceName = prefNameDev+index;
    if ( index == 0 ) {
      deviceMesh = new BABYLON.Mesh.CreateBox(deviceName, 10.0, scene);
      var verticesCount = deviceMesh.getTotalVertices();
      deviceMesh.subMeshes = [];
      deviceMesh.subMeshes.push(new BABYLON.SubMesh(0, 0, verticesCount, 0, 6, deviceMesh));
      deviceMesh.subMeshes.push(new BABYLON.SubMesh(1, 0, verticesCount, 6, 30, deviceMesh));
      deviceMesh.material = deviceMultiMat;
      deviceMesh.position.x = devices[i].x;
      deviceMesh.position.y = devices[i].y;
      deviceMesh.position.z = devices[i].z;
      deviceMesh.scaling.x = 5;
      deviceMesh.scaling.z  = 2.5;
      deviceMesh.rotation.y = Math.PI;
      meshDevices.push(deviceMesh);
      makeImmutable(deviceMesh);
    }
    else {
      instanceMesh = deviceMesh.createInstance(deviceName);
      instanceMesh.position.x = devices[i].x;
      instanceMesh.position.y = devices[i].y;
      instanceMesh.position.z = devices[i].z;
      meshDevices.push(instanceMesh);
      makeImmutable(instanceMesh);
    }
    index ++;
    var labelSize = 80;
    var dynamicTexture = makeTextTexture(devices[i].name, scene, false);
    var label = makeTextSprite(dynamicTexture, labelSize, scene);
    label.position = new BABYLON.Vector3(devices[i].label[0], devices[i].label[1] - labelSize/2, devices[i].label[2]);
    divs[deviceName] = createDiv(deviceName, "device");
  }

  // dessin des liens
  // rayon de la section d'un lien tubulaire
  var linkRadius = 6;
  // courbe du lien : courbe de Bézier, déport latéral y d'un unique point de contrôle au milieu des extrémités du lien ... pour l'instant
  var curveRadius = 10;
  // materials
  var linkMat = new BABYLON.StandardMaterial("LinkMaterial", scene);
  linkMat.alpha = 0.15;
  linkMat.diffuseColor = BABYLON.Color3.White();
  /*
  var linkMatIN = new BABYLON.StandardMaterial("LinkMaterialIn", scene);
  linkMatIN.alpha = 0.5;
  linkMatIN.diffuseColor = BABYLON.Color3.Blue();
  var linkMatOUT= new BABYLON.StandardMaterial("LinkMaterialOut", scene);
  linkMatOUT.alpha = 0.5;
  linkMatOUT.diffuseColor = BABYLON.Color3.Red();
  */
  var shiftLink = new BABYLON.Vector3(2, 0, 0);
  var curveSegments = 25;

  for ( var i = 0; i < links.length; i++) {
    // courbe
    var origin = new BABYLON.Vector3(links[i].device_origin.x, links[i].device_origin.y, links[i].device_origin.z);
    var target = new BABYLON.Vector3(links[i].device_destination.x, links[i].device_destination.y, links[i].device_destination.z);
    var middle = new BABYLON.Vector3( (links[i].device_origin.x-linkRadius+links[i].device_destination.x)/2,
                                    (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                    (links[i].device_origin.z+links[i].device_destination.z)/2 );
    var originIn = origin.subtract(shiftLink);
    var targetIn = target.subtract(shiftLink);
    var middleIn = middle.subtract(shiftLink);
    var originOut = origin.add(shiftLink);
    var middleOut = middle.add(shiftLink);
    var targetOut = target.add(shiftLink);

    var curve3 = BABYLON.Curve3.CreateQuadraticBezier(origin, middle, target, curveSegments);
    var curve3In = BABYLON.Curve3.CreateQuadraticBezier(originIn, middleIn, targetIn, curveSegments);
    var curve3Out = BABYLON.Curve3.CreateQuadraticBezier(targetOut, middleOut, originOut, curveSegments);
    // tube : on done le même nom aux trois tubes pour le picking
    var linkName = prefNameLnk+i;
    var linkMesh = BABYLON.Mesh.CreateTube(linkName, curve3.getPoints(), linkRadius, 8, null, scene, false);
    linkMesh.material = linkMat;
    var linkMeshIn = BABYLON.Mesh.CreateTube(linkName, curve3In.getPoints(), linkRadius / 4, 8, null, scene, true);
    var linkMeshOut = BABYLON.Mesh.CreateTube(linkName, curve3Out.getPoints(), linkRadius / 4 , 8, null, scene, true);

    makeImmutable(linkMeshIn);
    makeImmutable(linkMeshOut);

    var linkMatIN = new BABYLON.StandardMaterial("LinkMaterialIn", scene);
    var linkMatOUT= new BABYLON.StandardMaterial("LinkMaterialOut", scene);
    linkMatIN.diffuseTexture = new BABYLON.Texture("images/gradientbleu.png", scene);
    linkMatOUT.diffuseTexture = new BABYLON.Texture("images/gradientrouge.png", scene);
    linkMatIN.diffuseTexture.hasAlpha = true;
    linkMatOUT.diffuseTexture.hasAlpha = true;
    //linkMatIN.diffuseTexture.uScale = 1;
    //linkMatOUT.diffuseTexture.uScale = 1;
    linkMatIN.diffuseTexture.vScale = 40;
    linkMatOUT.diffuseTexture.vScale = 40;
    linkMeshIn.material = linkMatIN;
    linkMeshOut.material = linkMatOUT;
    linkMatIN.backFaceCulling = false;
    linkMatOUT.backFaceCulling = false;
    //linkMatIN.alpha = 0.8;
    //linkMatOUT.alpha = 0.8;



    // div
    divs[linkName] = createDiv(linkName, 'link');
    meshLinks.push(linkMesh);
    meshLinksIn.push(linkMeshIn);
    meshLinksOut.push(linkMeshOut)
    pathMesh.push(curve3.getPoints());
    pathMeshIn.push(curve3In.getPoints());
    pathMeshOut.push(curve3Out.getPoints());
    var closureRadius = function(linkRadius, k, rate, measure) {
      var maxRadius = linkRadius / 2;
      var radiusFunction = function(i, distance) {
        //var radius = maxRadius * measure / 10 + Math.sin((distance + k) * measure) / 2;
        var radius = 1 + maxRadius * rate + Math.sin(distance - k * measure / 10) / 2;
        return radius;
      };
      return radiusFunction;
    };
    radiusFunctionsIn.push(closureRadius);
    radiusFunctionsOut.push(closureRadius);
  }

  //var nbMeasures = measures.length;
  //var indexMeasure = 0;

  var k = 0;
  var radiusIn = 0.0;
  var radiusOut = 0.0;
  var lastRadiusIn = radiusIn;
  var lastRadiusOut = radiusOut;

  // logique de la render loop
  scene.registerBeforeRender(function() {
    updateData(refresh_rate, 2);
    updateGraph(scene, camera);
    for(var i = 0; i < meshLinks.length; i++) {
      /* tubes ondulants
      var radiusFunctionIn = radiusFunctionsIn[i](linkRadius, k, measures[i].rate[0], measures[i].current[0]);
      var radiusFunctionOut = radiusFunctionsOut[i](linkRadius, k, measures[i].rate[1], measures[i].current[1]);
      meshLinksIn[i] = BABYLON.Mesh.CreateTube(null, pathMeshIn[i], null, null, radiusFunctionIn, null, null, null, meshLinksIn[i]);
      meshLinksOut[i] = BABYLON.Mesh.CreateTube(null, pathMeshOut[i], null, null, radiusFunctionOut, null, null, null, meshLinksOut[i]);
      */

      radiusIn = 1 + measures[i].rate[0] * linkRadius / 2;
      radiusOut = 1 + measures[i].rate[1] * linkRadius / 2;

      // le morphing du tube (createTube) consomme la CPU

      if (radiusIn != lastRadiusIn ) {
        //meshLinksIn[i] = BABYLON.Mesh.CreateTube(null, pathMeshIn[i], radiusIn, null, null, null, null, null, meshLinksIn[i]);
        lastRadiusIn = radiusIn;
      }
      if (radiusOut != lastRadiusOut) {
        //meshLinksOut[i] = BABYLON.Mesh.CreateTube(null, pathMeshOut[i], radiusOut, null, null, null, null, null, meshLinksOut[i]);
        lastRadiusOut = radiusOut;
      }
      meshLinksIn[i].material.diffuseTexture.vOffset -= measures[i].current[0] / 100;
      meshLinksOut[i].material.diffuseTexture.vOffset -= measures[i].current[1] / 100;

      k += 0.05;
      pl.position = camera.position;
    }
  });

  //scene.debugLayer.show();

  return scene;
};


// fonction displayGraph : 
// tout le rendu est dans une fonction appelée par le init() général
function displayGraph(refresh_rate) {
  // initialisation du moteur et de la render loop
  var canvas = document.querySelector('#WebGL');
  var engine = new BABYLON.Engine(canvas, true);
  var scene = createScene(canvas, engine, refresh_rate);
  window.addEventListener("resize", function() {
    engine.resize();
  });
  engine.runRenderLoop(function() {
    scene.render();
  });
}


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
function updateData(refresh_rate, frequency) {
  var prd = refresh_rate * frequency; // nombre de portions
  // pour chaque entrée de data, on met à jour les attributs des Devices
  for (var res in data) {
    var dev = devices[res];
    var metrics = dev.metrics;
    var ifaces = data[res];
    for (var i=0; i < ifaces.length; i++) {
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
        metrics[ifname].step = [ (metrics[ifname].last[0] - metrics[ifname].previous[0]) / prd , (metrics[ifname].last[1] - metrics[ifname].previous[1]) / prd ];
      }
      else {
        metrics[ifname].current[0] += metrics[ifname].step[0];
        metrics[ifname].current[1] += metrics[ifname].step[1];
        metrics[ifname].current[0] = limit(metrics[ifname].current[0], metrics[ifname].last[0], metrics[ifname].step[0]);
        metrics[ifname].current[1] = limit(metrics[ifname].current[1], metrics[ifname].last[1], metrics[ifname].step[1]);
      }
      metrics[ifname].rate[0] = metrics[ifname].current[0] / speed / mbps * 100;
      metrics[ifname].rate[1] = metrics[ifname].current[1] / speed / mbps * 100;
    }
  }
}

// affiche le div du mesh pointé par la souris avec les valeurs courantes de la métrologie
function updateGraph(scene, camera) {
  var pickResult = scene.pick(scene.pointerX, scene.pointerY, function(mesh) { return mesh.isVisible && mesh.isReady() }, false, camera);
  if (pickResult.hit) {
    //var id = pickResult.pickedMesh.id;
    var id = pickResult.pickedMesh.name;
    var meshType = id.slice(0, prefLength);
    var meshId = parseInt(id.slice(prefLength));
    curId = meshId;
    curDiv = divs[id];
    if (lastDiv && curDiv != lastDiv) {  // on passe d'un mesh à un autre directement
      lastDiv.style.display = 'none';
      meshLinks[lastId].material.diffuseColor = colorLink;
      lastDiv = curDiv;
      lastId = curId;
    }
    curDiv.style.left = scene.pointerX+"px";
    curDiv.style.top = scene.pointerY+"px";
    curDiv.style.display = 'block';
    var text = "type : " + meshType + "<br/>id : " + meshId + "<br/>";
    if (meshType == prefNameLnk) {
      text += "in = " + (measures[meshId].current[0]).toFixed(2) + " mbps<br>";
      text += "out = " + (measures[meshId].current[1]).toFixed(2) + " mbps<br>";
      text += "<br>";
      text += "in = " + (measures[meshId].rate[0]).toFixed(2) + " %<br>";
      text += "out = " + (measures[meshId].rate[1]).toFixed(2) + " %<br>";
      meshLinks[meshId].material.diffuseColor = colorLinkPointed;
    }
    curDiv.innerHTML = text;
    onExit = true;
    lastDiv = curDiv;
    lastId = curId;
  }
  else if (curDiv && onExit){   // on quitte un mesh pour rien d'autre
      curDiv.style.display = 'none';
      onExit = false;
      meshLinks[curId].material.diffuseColor = colorLink;
  }
}


// createLink(name, class) : crée un div dans le DOM
function createDiv(name, className) {
  var div = document.createElement('div');
  document.getElementsByTagName('body')[0].appendChild(div);
  div.id = name;
  div.className = className;
  return div;
}








//  fonction showAxis
var showAxis = function(size, scene) { 
  var makeTextPlane = function(text, color, size) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
  var plane = BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
  plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
  plane.material.backFaceCulling = false;
  plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
  plane.material.diffuseTexture = dynamicTexture;
  return plane;
  };

  var axisX = BABYLON.Mesh.CreateLines("axisX", [ 
    BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0), 
    new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ], scene);
  axisX.color = new BABYLON.Color3(1, 0, 0);
  var xChar = makeTextPlane("X", "red", size / 10);
  xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);
  var axisY = BABYLON.Mesh.CreateLines("axisY", [
      BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( -0.05 * size, size * 0.95, 0), 
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3( 0.05 * size, size * 0.95, 0)
      ], scene);
  axisY.color = new BABYLON.Color3(0, 1, 0);
  var yChar = makeTextPlane("Y", "green", size / 10);
  yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);
  var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
      BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0 , -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3( 0, 0.05 * size, size * 0.95)
      ], scene);
  axisZ.color = new BABYLON.Color3(0, 0, 1);
  var zChar = makeTextPlane("Z", "blue", size / 10);
  zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
};
