// Ce script permet de récupérer à intervalles réguliers les données de mesures SNMP
// au format json depuis le serveur et de les afficher.

// Object responseJSON stockant les résultats parsés des requêtes au serveur
// Cet objet permet surtout de passer une variable par référence à getJSON()
var responseJSON = {};

// variable globale data contenant les données actualisées du monitoring
var data;            

// var globale graph contenant les données de représentation du graphe
var graph;                             


// élement HTML
var div_content;


// fonction getJSON :
// récupère par un GET le résultat json depuis le serveur et l'affecte à la variable responseJSON[key] 
// l'objet responseJSON est utilisé pour le passage d'une variable par référence
// la requête xhr est asynchrone : la variable responseJSON[key] n'est affectée que lorsque la requête est ternminée
// si une fonction de callback est passée, elle est lancée à l'issue de la requête
function getJSON(json_url, key, callback) {
  var req = new XMLHttpRequest();
  req.open('GET', json_url);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) { 
      responseJSON[key] = JSON.parse(req.responseText); 
      data = responseJSON["data"];
      graph = responseJSON["graph"];
      if( typeof callback == "function") { callback(); }
    }
  }
  req.send();
}

// fonction getGraph
// récupère la description du graphe depuis le fichier json sur le serveur
// puis lance la fonction de callback
function getGraph(json_graph_url, callback){
  getJSON(json_graph_url, "graph", callback);
}

// fonction getData
// récupère la description les données du monitoring
function getData(json_data_url, callback) {
  getJSON(json_data_url, "data", callback);
}

// fonction monitor
// lance la récupération des données à intervalles donnés
function monitor(json_data_url, refresh_rate) {
  setInterval(function(){ getData(json_data_url, "data"); afficheResultats(); }, refresh_rate*1000);
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
  var json_data_url = "monitor.json";            // url du fichier actualisé des données de mesure
  var json_graph_url = "graph.json";             // url du fichier des données de description du graphe
  var refresh_rate = 10;                         // délai de rafraichissement en secondes

  // pour le test
  div_content = document.querySelector('#content');

  // on lance la récupération des données de monitoring
  monitor(json_data_url, refresh_rate);
  // on lance la représentation du graphe après la récupération des premières données de monitoring
  getData(json_data_url, function() { getGraph(json_graph_url, displayGraph); } );
}