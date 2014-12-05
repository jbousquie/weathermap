// Ce script permet de récupérer à intervalles réguliers les données de mesures SNMP
// au format json depuis le serveur et de les afficher.

// variable globale data contenant les données actualisées du monitoring
var data;                                         

var div_content;


// fonction updateData :
// récupère par un GET le résultat json depuis le serveur
function updateData(json_data_url) {
  var req = new XMLHttpRequest();
  req.open('GET', json_data_url);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) { 
      data = JSON.parse(req.responseText); }
  }
  req.send();
}


// fonction monitor
// lance la récupération des données à intervalles donnés
function monitor(json_data_url, refresh_rate) {
  setInterval(function(){ updateData(json_data_url); afficheResultats(); }, refresh_rate*1000);
  // récupération initiale en plus pour ne pas attendre le premier délai
  updateData(json_data_url);
}

// fonction temporaire de mise au point du code
function afficheResultats() {
  var txt = '';
  for (var host in data) {
    txt = txt+host+'<br><ul>';
    for(var i=0; i<data[host].length; i++){
      var name = data[host][i]["name"];
      var inOct = data[host][i]["octInOut"][0];
      var outOct = data[host][i]["octInOut"][1];
      txt = txt+'<li>'+name+' : in = '+inOct+' out = '+outOct+'</li>';
    }
    txt = txt+'</ul>';
  }
  div_content.innerHTML = txt;
}

// fonction init lancée sur window.onload
function init() {
  // variables de configuration
  var json_data_url = "monitor.json";            // url du fichier json
  var refresh_rate = 10;                            // délai de rafraichissement en secondes
  
  div_content = document.querySelector('#content');

  monitor(json_data_url, refresh_rate);
  display();
}