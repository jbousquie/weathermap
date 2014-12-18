// Script de déclaration des objets

// DynamicTexture
// inspiré de https://github.com/jeromeetienne/threex.dynamictexture/blob/master/threex.dynamictexture.js
var DynamicTexture = function(width, height) {
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  this.canvas = canvas;

  var context = canvas.getContext('2d');
  this.context = context;

  var texture = new THREE.Texture(canvas);
  this.texture = texture;
}

DynamicTexture.prototype.clear = function() {
  this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
  this.texture.needsUpdate = true;
  return this;
}

DynamicTexture.prototype.drawText = function(text,x,y, contextFont) {
  this.context.font = contextFont;
  this.context.textBaseline = "top";
  this.context.fillText(text,x, y);  // http://tutorials.jenkov.com/html5-canvas/text.html
  this.texture.needsUpdate = true;
  return this;
}


// objet Device
// représente un équipement avec ses interfaces et les mesures de métrologies associées
var Device = function(name, type, coord, label, ifnames) {
  this.name = name;
  this.type = type;
  this.label = label;
  this.x = coord[0];
  this.y = coord[1];
  this.z = coord[2];
  this.ifnames = ifnames;
  this.link = {};                       // this.link[iface_name] = objet_link
  this.txt_idx = {};                    // this.txt_idx[ifname] = texture_index : index de position des données texte dans la texture générale
  this.metrics = {};
  //this.visuals = [];
  for (var i in ifnames) {
    this.metrics[i] = {};               // objet mesure
    this.metrics[i].previous = [0,0];   // mesure précédente
    this.metrics[i].last = [0,0];       // dernière mesure
    this.metrics[i].current = [0,0];    // valeur courante calculée entre la dernière et la précédente (tween)
    this.metrics[i].step = [0,0];       // pas de progression entre précédente et dernière
    //this.visuals[i] = [];               // tableau des index de placements des données texte dans la texture générale
  }
}


// objet Link
// représente une association entre deux devices sur une interface
var Link = function(ifname, device_origin, device_destination) {
  this.name = ifname;
  this.device_origin = device_origin;
  this.device_destination = device_destination;
}

Link.prototype.setSpeed = function(speed) {
  this.speed = speed;
}

// objet TextSprite
// représente un sprite texte dynamique
var TextSprite = function(texture) {
  this.texture = texture;
  this.material = new THREE.SpriteMaterial( {map: this.texture} );
  this.material.scaleByViewport = true;
  this.sprite = new THREE.Sprite(this.material);
  this.sprite.scale.set(80, 50, 0);
}

TextSprite.prototype.update = function(texture) {
  this.texture = texture;
  this.texture.needsUpdate = true;
}

