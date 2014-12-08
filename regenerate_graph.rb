# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

require 'yaml'
require 'json'

file_conf_yaml = './weathermap.yml'
file_graph_json ='/var/www/html/weathermap/graph.json'

# tableau des objets à dessiner
graph = []

# chargement du fichier de conf YAML 
conf = YAML.load_file(file_conf_yaml)
conf.each_pair {|name, params|
  name = name.strip
  coord = params["coord"]
  label = params["label"]
  monitor = false
  # si une adresse ip est configurée, on monitore
  if params.has_key?("ip") 
    then 
    monitor = true
    # ip = params["ip"].strip
    # community = params["community"].strip
    # protocol_version = params["version"].to_sym
    ifnames = params["ifnames"]
  end
  graph_host = {name: name, coord: coord, label: label, ifnames: ifnames}
  graph.push(graph_host)
}

# génération du fichier json du graphe
file_graph = File.new(file_graph_json, "w")
file_graph.write(JSON.generate(graph))
file_graph.close
puts "\nFile #{file_graph_json} generated"