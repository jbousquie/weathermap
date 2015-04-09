// Ce script est le code du worker. Il tourne en parallèle du programme principal d'affichage.
// Il se charge de récupérer les données de métrologie à intervalles réguliers sur le serveur.

"use strict";

// Référence au scope principal de ce thread
var thisWorker = this;

// Object responseJSON stockant les résultats parsés des requêtes au serveur
// Cet objet permet surtout de passer une variable par référence à getJSON()
var responseJSON = {};

// variable globale data contenant les données actualisées du monitoring
var dataW = {};            

// var globale graph contenant les données de représentation du graphe
var graphW = {};   


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
      dataW = responseJSON["data"];
      graphW = responseJSON["graph"];
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

// function returnData
// poste les variables globales de données dataW et graphW au thread principal
function returnData() {
  thisWorker.postMessage([dataW, graphW]);
}

// fonction monitor
// lance la récupération des données à intervalles donnés
function monitor(json_data_url, refresh_rate) {
  setInterval(function(){ getData(json_data_url, returnData); }, refresh_rate*1000);
}


// Message reçus du script principal : [refresh_rate, json_data_url, json_graph_url]
// récupération des données immédiate et programmée.
thisWorker.onmessage = function(e) {
  var refresh_rate = e.data[0];
  var json_data_url = e.data[1];
  var json_graph_url = e.data[2];

  // on programme la récupération des données de monitoring à intervalles réguliers
  monitor(json_data_url, refresh_rate);

  // on récupére les premières données de monitoring et la description du graphe
  // et on retourne les résultats au thread principal
  getData(json_data_url, function() { 
    getGraph(json_graph_url, function() { 
        returnData();
    }); 
  });
}

