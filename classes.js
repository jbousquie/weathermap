// Script de déclaration des objets


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
  for (var i in ifnames) {
    this.metrics[i] = {};               // objet mesure
    this.metrics[i].previous = [0,0];   // mesure précédente
    this.metrics[i].last = [0,0];       // dernière mesure
    this.metrics[i].current = [0,0];    // valeur courante calculée entre la dernière et la précédente (tween)
    this.metrics[i].step = [0,0];       // pas de progression entre précédente et dernière
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

