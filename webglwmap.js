// Ce script se charge de toute la partie de rendu à partir des données récupérées
// par le script weathermap.js

// variable globale devices : tableau des devices
var devices = {};

// variable globale links : tableau des links
var links = [];

// tableau général des textSprites
//var textSprites= [];

// tableau général des mesures
var measures = [];

// texture globale
// var dataTexture;
// var ctx;


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
        measures.push(devices[i].metrics[ifname]) ; // on stocke les objets mesures de chaque device
        // si la destination == null, on passe au suivant => pas de lien
      }
      devices[i].txt_idx[ifname] = texture_index;
      texture_index += 1;
    }
  }
}

// fonction makeTextTexture
// crée une texture texte
var makeTextTexture = function(text, scene, reverse) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 512, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 200, "bold 72px Arial", "black", "transparent", reverse);
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


// fonction makeTextPlane :
// crée un plan texte
var makeTextPlane = function(textTexture, size, scene) {
  var plane =  BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
  plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
  plane.material.backFaceCulling = false;
  plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
  plane.material.diffuseTexture = textTexture;
  return plane;
};


// fonction createScene : dessin de tous les éléments visuels
var createScene = function(canvas, engine) {

  // on crée tous les objets logiques à manipuler
  createDevices(devices);
  createLinks(devices, links);

  // BabylonJS
  var scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color3(0.95, 0.95, 0.95);
  var camera = new BABYLON.ArcRotateCamera("Camera", 0 ,0, 0, BABYLON.Vector3.Zero(), scene);
  camera.setPosition(new BABYLON.Vector3(0,10,-500));
  camera.attachControl(canvas, false);

  var light0 = new BABYLON.HemisphericLight("Hemi0", new BABYLON.Vector3(0,1,0), scene);
  light0.diffuse = new BABYLON.Color3(1, 1, 1);
  light0.specular = new BABYLON.Color3(1, 1, 1);
  light0.groundColor = new BABYLON.Color3(0, 0, 0);

  // variable texture générale contenant tout le texte des mesures à afficher
  // dataTexture = new BABYLON.DynamicTexture("DataTexture", 600, scene, true);
  // ctx = dataTexture.getContext();

  // axes pour le debug
  // showAxis(100, scene);
  // scene.debugLayer.show();


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

    var labelSize = 80;
    var dynamicTexture = makeTextTexture(devices[i].name, scene, false);
    var label = makeTextSprite(dynamicTexture, labelSize, scene);
    label.position = new BABYLON.Vector3(devices[i].label[0], devices[i].label[1] - labelSize/2, devices[i].label[2]);
    nb++;
  }

  // dessin des liens
  // rayon de la section d'un lien tubulaire
  var linkRadius = 2;
  // courbe du lien : courbe de Bézier, déport latéral y d'un unique point de contrôle au milieu des extrémités du lien ... pour l'instant
  var curveRadius = 10;

  // sprite manager général
  // var spriteManager = new BABYLON.SpriteManager("dataTextureSM", "", 100, 512, scene);
  // spriteManager._spriteTexture = dataTexture;
  // spriteManager._spriteTexture.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE;
  // spriteManager._spriteTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE;

  var index = 0;
  for ( var i=0; i<links.length; i++) {
      var originIn = new BABYLON.Vector3(links[i].device_origin.x-linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetIn = new BABYLON.Vector3(links[i].device_destination.x-linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleIn = new BABYLON.Vector3( (links[i].device_origin.x-linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );
      var originOut = new BABYLON.Vector3(links[i].device_origin.x+linkRadius, links[i].device_origin.y, links[i].device_origin.z);
      var targetOut = new BABYLON.Vector3(links[i].device_destination.x+linkRadius, links[i].device_destination.y, links[i].device_destination.z);
      var middleOut = new BABYLON.Vector3( (links[i].device_origin.x+linkRadius+links[i].device_destination.x)/2,
                                      (links[i].device_origin.y+links[i].device_destination.y)/2 - curveRadius,
                                      (links[i].device_origin.z+links[i].device_destination.z)/2 );

      var quadraticBezierVectorsIn = quadraticBezier(originIn, middleIn, targetIn, 25);
      var quadraticBezierVectorsOut = quadraticBezier(originOut, middleOut, targetOut, 25);
      var linkInCurve = new BABYLON.Mesh.CreateLines("qbezierIn", quadraticBezierVectorsIn, scene);
      var linkOutCurve = new BABYLON.Mesh.CreateLines("qbezierOut", quadraticBezierVectorsOut, scene);
      linkInCurve.color = new BABYLON.Color3(0, 0, 1);
      linkOutCurve.color = new BABYLON.Color3(1, 0, 0);

      // un sprite et une dynamicTexture par lien
      var linkLabelSize = 40;
      var dynamicTexture = makeTextTexture('', scene, false);
      var linkLabel = makeTextSprite(dynamicTexture, linkLabelSize, scene);
      var device = links[i].device_origin;
      device.metrics[links[i].name].texture = dynamicTexture; // on récupère un pointeur sur la texture dans la propriété label de chaque mesure (metrics)
      
      // un sprite manager et un sprite par lien mais une unique dynamicTexture globale
      // var linkLabel = makeTextSprite(dataTexture, linkLabelSize, scene);

      // un sprite manager global et une dynamicTexture globale
      // var linkLabel = new BABYLON.Sprite("textSprite", spriteManager);
      // linkLabel.size = linkLabelSize;

      linkLabel.position = middleIn;    
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

  var nbMeasures = measures.length;
  var indexMeasure = 0;

  engine.runRenderLoop(function() {
    updateData(60);
    updateGraph(indexMeasure);
    scene.render();
    indexMeasure ++;
    if (indexMeasure == nbMeasures) {
      indexMeasure = 0;
    }
  });

  
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
  // seule la i-ème texture est mise à jour
  function updateGraph(idx) {
    /*// dataTexture.drawText("", 0, 0, null, null, "transparent");
    // var dataHeight = 50;
    // var i = 1;
    var text = '';
    for (var dev in devices) {
      var metrics = devices[dev].metrics;
      for( var mes in metrics ) {
        var bdIn = metrics[mes].current[0];
        var bdOut = metrics[mes].current[1];
        // text = text + "in : "+bdIn.toFixed(2)+" out : "+bdOut.toFixed(2); // texte concaténé
        text = "in : "+bdIn.toFixed(2)+" out : "+bdOut.toFixed(2);
        // metrics[mes].texture.drawText(text, 5, 200,"normal bold 36px Arial", "blue", null, false);
        // dataTexture.drawText(text, 5, i * dataHeight,"normal bold 36px Arial", "blue", null, false); // dynamicTexture globale
        // i++;
      }
    }
    // dataTexture.drawText(text, 5, 200,"normal bold 36px Arial", "blue", null, false); // dynTex globale*/
    var mes = measures[idx];
    var bdIn = mes.current[0];
    var bdOut = mes.current[1];
    var text = "in : "+bdIn.toFixed(2)+" out : "+bdOut.toFixed(2);
    var ctx = mes.texture.getContext();
    ctx.clearRect(0,0,512, 512);
    mes.texture.drawText(text, 5, 200,"normal bold 48px Arial", "blue", null, false);
  }



}

//  fonction showAxis
var showAxis = function(size, scene) { 
  var makeTextPlane = function(text, color, size) {
  var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color , "transparent", true);
  var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
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


// http://fr.wikipedia.org/wiki/Courbe_de_B%C3%A9zier
// http://en.wikipedia.org/wiki/B%C3%A9zier_curve

// fonction Bézier quadratique
// quadraticBezier(vector3Origin, vector3Control, vector3Destination, segmentNumber)
var quadraticBezier = function(v0, v1, v2, nb) {
  var bez = [];
  var step = 1 / nb;
  var equation = function(t, val0, val1, val2) {
    var res = (1 -t ) * (1 - t) * val0 + 2 * t * (1-t) * val1 + t * t * val2;
    return res;
  };
  for(var i = 0; i <= 1; i += step) {
    bez.push( new BABYLON.Vector3(equation(i, v0.x, v1.x, v2.x), equation(i, v0.y, v1.y, v2.y), equation(i, v0.z, v1.z, v2.z)) );
  }
  bez.push(v2);
  return bez;
};
// fonction Bézier cubique
// cubicBezier(vector3Origin, vector3Control1, vector3Control2, vector3Destination, segmentNumber)
var cubicBezier = function(v0, v1, v2, v3, nb) {
  var bez = [];
  var step = 1 / nb;
  var equation = function(t, val0, val1, val2, val3) {
    var res = (1 -t)*(1-t)*(1-t) * val0 + 3 * t * (1-t)*(1-t) * val1 + 3 * t*t *(1-t) * val2 + t*t*t * val3;
    return res;
  };
  for(var i = 0; i <= 1; i += step) {
    bez.push( new BABYLON.Vector3(equation(i, v0.x, v1.x, v2.x, v3.x), equation(i, v0.y, v1.y, v2.y, v3.y), equation(i, v0.z, v1.z, v2.z, v3.z)) );
  }
  bez.push(v3);
  return bez;
};