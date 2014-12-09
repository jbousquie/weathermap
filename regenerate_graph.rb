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

# chargement du fichier de conf YAML 
conf = YAML.load_file(file_devices_yaml)
conf.each_pair {|name, params|
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
  graph_host = {name: name, coord: coord, label: label, type: type, ifnames: ifnames}
  graph.push(graph_host)
}


# recherche des nœuds terminaux
# pour chaque destination de port_name, on cherche si elle existe déjà dans hosts
# et on l'ajoute comme nœud par défaut dans graph sinon
hosts.each{ |host|
  if host[:monitor] then
    nb_children = 1
    host[:port_names].each_value{ |dest| 
      if (not dest.nil?) then
        terminal_node = true
        hosts.each{ |h| 
          if (dest == h[:name]) then 
            terminal_node = false 
          end
        }
        if terminal_node then
          shift_x = default_shift[0]
          shift_y = default_shift[1]
          shift_z = default_shift[2]
          step_x = default_step[0] * nb_children
          step_y = default_step[1] * nb_children
          step_z = default_step[2] * nb_children
          default_coord = [host[:coord][0]+step_x+shift_x, host[:coord][1]+step_y+shift_y, host[:coord][2]+step_z+shift_z]
          default_label = [host[:label][0]+step_x+shift_x, host[:label][1]+step_y+shift_y, host[:label][2]+step_z+shift_z]
          graph_host_default = {name: dest, coord: default_coord, label: default_label, type: "default", ifnames: nil}
          graph.push(graph_host_default)
          nb_children += 1
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