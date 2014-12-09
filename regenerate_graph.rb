# encoding: utf-8
# Encoding.default_external = Encoding::UTF_8 

# À corriger : refaire plus simple sans les objets Host

# Ce script sert uniquement à re-générer le fichier du json graphe à partir de la conf yaml
# Ceci est utile pour la mise au point du graphe dans l'espace : modification du yaml, regeneration graphe, aperçu browser

require 'yaml'
require 'json'

file_conf_yaml = './conf.yml'

# chargement de la configuration YAML
conf = YAML.load_file(file_conf_yaml)
file_devices_yaml = conf["file_devices_yaml"]
file_graph_json = conf["file_graph_json"]
refresh_rate = conf["refresh_rate"]
default_shift = conf["default_shift"]
default_step = conf["default_step"]

# tableau des objets à dessiner
graph = []
hosts = []

# fonction getHostByName
# renvoie un objet du graph par son nom, nil si non trouvé
def getHostByName(graph, name) 
  graph.each{ |hst| if hst[:name] == name then return hst end  }
  return nil
end

# chargement de la configuration YAML
conf = YAML.load_file(file_conf_yaml)
file_devices_yaml = conf["file_devices_yaml"]
file_graph_json = conf["file_graph_json"]
file_monitor_json = conf["file_monitor_json"]
refresh_rate = conf["refresh_rate"]
default_step = conf["default_step"]
default_radius = conf["default_radius"]
puts "\nApplication configuration file #{file_conf_yaml} loaded"

# chargement du fichier des devices YAML 
conf_devices = YAML.load_file(file_devices_yaml)
puts "\nDevice file #{file_devices_yaml} loaded"
conf_devices.each_pair {|name, params|
  name = name.strip
  coord = params["coord"]
  label = params["label"]
  type = params["type"]
  monitor = false
  # si une adresse ip est configurée, on monitore
  if params.has_key?("ip") then 
    monitor = true
    ip = params["ip"].strip
    community = params["community"].strip
    protocol_version = params["version"].to_sym
    ifnames = params["ifnames"]
  end
  host = {name: name, coord: coord, label: label, monitor: monitor, ip: ip, community: community, protocol_version: protocol_version, port_names: ifnames}
  hosts.push(host)
  graph_host = {name: name, coord: coord, label: label, type: type, ifnames: ifnames, parent: nil, vector: [0,0,0]}
  graph.push(graph_host)
}


# recherche des nœuds terminaux
# pour chaque destination de port_name, on cherche si elle existe déjà dans hosts
# et on l'ajoute comme nœud par défaut dans graph sinon
hosts.each{ |host|
  if host[:monitor] then
    nb_children = 1
    fact = 1
    host[:port_names].each_value{ |dest| 
      # on ne s'occupe que des ifaces qui ont une destination   
      if (not dest.nil?) then
        terminal_node = true
        host_dest = getHostByName(graph, dest)
        # si la destination est déjà dans le graphe, on met à jour le parent et on calcule le vecteur
        if host_dest then
          host_dest[:parent] = host[:name]
          vx = host_dest[:coord][0] - host[:coord][0]
          vy = host_dest[:coord][1] - host[:coord][1]
          vz = host_dest[:coord][2] - host[:coord][2]
          host_dest[:vector] = [vx, vy, vz]
          terminal_node = false
        end
        # si le nœeud est terminal, on cherche son parent pour lui affecter ses :parent et :vector
        # et pour calculer ses coordonnées à partir du vecteur du parent et de sa positon de nœeud fils
        if terminal_node then
          parent_node = getHostByName(graph, host[:name])
          vct = parent_node[:vector]
          magnitude = Math.sqrt(vct[0]*vct[0]+vct[1]*vct[1]+vct[2]*vct[2])
          if magnitude == 0 then magnitude = 1 end
          step_x = default_radius/magnitude*vct[0] * Math::cos(Math::PI/180*default_step[0]*(fact-1)) 
          step_y = default_radius/magnitude*vct[1] * Math::sin(Math::PI/180*default_step[0]*(fact-1)) 
          step_z = default_radius/magnitude*vct[2] * Math::sin(Math::PI/180*default_step[0]*(fact-1))
          default_coord = [host[:coord][0]+step_x, host[:coord][1]+step_y, host[:coord][2]+step_z]
          default_label = [host[:label][0]+step_x, host[:label][1]+step_y, host[:label][2]+step_z]
          graph_host_default = {name: dest, coord: default_coord, label: default_label, type: "default", ifnames: nil, parent: parent_node[:name], vector: nil}
          graph.push(graph_host_default)
          nb_children += 1
          if fact.abs != fact then fact = fact.abs + 1 else fact = -fact end
        end
        terminal_node = true
      end
    }
  end
}

# faire une détection de boucle ici
#

# génération du fichier json du graphe
file_graph = File.new(file_graph_json, "w")
file_graph.write(JSON.generate(graph))
file_graph.close
puts "\nFile #{file_graph_json} generated"